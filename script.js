class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audio-player');
        this.currentSong = null;
        this.songs = [];
        this.allSongs = []; // Keep original list for filtering
        this.playlists = JSON.parse(localStorage.getItem('playlists')) || [];
        this.favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        this.settings = JSON.parse(localStorage.getItem('settings')) || {
            theme: 'dark',
            font: 'sans-serif',
            folderPath: null
        };
        this.currentPlaylist = [];
        this.currentIndex = 0;
        this.isShuffled = false;
        this.isRepeating = false;
        this.currentView = 'library';
        this.selectedSongForPlaylist = null;
        this.filters = {
            genre: '',
            artist: '',
            year: '',
            search: ''
        };
        
        this.initializeSettings();
        this.initializeEventListeners();
        this.loadPlaylists();
        this.loadSavedMusic();
        this.updateUI();
    }

    initializeSettings() {
        // Apply theme
        document.documentElement.setAttribute('data-theme', this.settings.theme);
        
        // Apply font
        document.documentElement.setAttribute('data-font', this.settings.font);
        
        // Save settings
        localStorage.setItem('settings', JSON.stringify(this.settings));
    }    async loadSavedMusic() {
        const savedSongs = JSON.parse(localStorage.getItem('savedSongs')) || [];
        if (savedSongs.length > 0 && this.settings.folderPath) {
            // Clear previous songs and show empty state since URLs are invalid after reload
            this.songs = [];
            this.allSongs = [];
            this.currentPlaylist = [];
            this.renderMusicGrid();
            
            // Show message that user needs to reload folder
            const grid = document.getElementById('music-grid');
            if (grid) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-folder-open"></i>
                        <h3>Pasta carregada anteriormente: ${this.settings.folderPath}</h3>
                        <p>Por favor, carregue a pasta novamente para ouvir as músicas</p>
                        <button id="reload-folder-hint" class="btn btn-primary" style="margin-top: 1rem;">
                            <i class="fas fa-folder-open"></i> Carregar Pasta
                        </button>
                    </div>
                `;
                
                // Add click handler to the hint button
                const reloadBtn = document.getElementById('reload-folder-hint');
                if (reloadBtn) {
                    reloadBtn.addEventListener('click', () => {
                        document.getElementById('folder-input').click();
                    });
                }
            }
        }
    }

    initializeEventListeners() {
        // Folder loading
        document.getElementById('load-folder-btn').addEventListener('click', () => {
            document.getElementById('folder-input').click();
        });
        
        document.getElementById('folder-input').addEventListener('change', (e) => {
            this.loadMusicFiles(e.target.files);
        });        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.target.closest('.nav-link').dataset.view;
                this.switchView(view);
            });
        });

        // Player controls
        document.getElementById('play-pause-btn').addEventListener('click', () => {
            this.togglePlayPause();
        });
        
        document.getElementById('prev-btn').addEventListener('click', () => {
            this.previousSong();
        });
        
        document.getElementById('next-btn').addEventListener('click', () => {
            this.nextSong();
        });
        
        document.getElementById('shuffle-btn').addEventListener('click', () => {
            this.toggleShuffle();
        });
        
        document.getElementById('repeat-btn').addEventListener('click', () => {
            this.toggleRepeat();
        });

        // Volume control
        document.getElementById('volume-slider').addEventListener('input', (e) => {
            this.setVolume(e.target.value);
        });
        
        document.getElementById('volume-btn').addEventListener('click', () => {
            this.toggleMute();
        });

        // Progress control
        document.getElementById('progress-slider').addEventListener('input', (e) => {
            this.seek(e.target.value);
        });

        // Like button
        document.getElementById('like-btn').addEventListener('click', () => {
            this.toggleLike();
        });        // Search and filters
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.applyFilters();
        });

        document.getElementById('genre-filter').addEventListener('change', (e) => {
            this.filters.genre = e.target.value;
            this.applyFilters();
        });

        document.getElementById('artist-filter').addEventListener('change', (e) => {
            this.filters.artist = e.target.value;
            this.applyFilters();
        });

        document.getElementById('year-filter').addEventListener('change', (e) => {
            this.filters.year = e.target.value;
            this.applyFilters();
        });

        // Playlist creation
        document.getElementById('create-playlist-btn').addEventListener('click', () => {
            this.showPlaylistModal();
        });
        
        document.getElementById('create-playlist-confirm').addEventListener('click', () => {
            this.createPlaylist();
        });
          document.querySelector('.close').addEventListener('click', () => {
            this.hidePlaylistModal();
        });

        // Add to playlist modal
        document.querySelector('.close-add-playlist').addEventListener('click', () => {
            this.hideAddToPlaylistModal();
        });

        document.getElementById('add-to-new-playlist').addEventListener('click', () => {
            this.hideAddToPlaylistModal();
            this.showPlaylistModal();
        });        // Audio events
        this.audio.addEventListener('loadedmetadata', () => {
            this.updateDuration();
        });
        
        this.audio.addEventListener('timeupdate', () => {
            this.updateProgress();
        });
        
        this.audio.addEventListener('ended', () => {
            this.nextSong();
        });

        // Back to library button (for settings page)
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'back-to-library-btn') {
                this.switchView('library');
            }
        });// Window events
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('playlist-modal')) {
                this.hidePlaylistModal();
            }
            if (e.target === document.getElementById('add-to-playlist-modal')) {
                this.hideAddToPlaylistModal();
            }
        });
    }    async loadMusicFiles(files) {
        const musicFiles = Array.from(files).filter(file => 
            file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|m4a|flac)$/i)
        );

        this.songs = [];
        this.allSongs = [];
        const loadingPromises = musicFiles.map(file => this.processAudioFile(file));
        
        // Show loading state
        document.getElementById('music-grid').innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><h3>Carregando músicas...</h3></div>';
        
        await Promise.all(loadingPromises);
        this.allSongs = [...this.songs];
        this.currentPlaylist = [...this.songs];
        
        // Save to localStorage
        const songsToSave = this.songs.map(song => ({
            ...song,
            file: null, // Don't save file object
            url: null   // Don't save URL
        }));
        localStorage.setItem('savedSongs', JSON.stringify(songsToSave));
          // Save folder path info
        if (musicFiles.length > 0) {
            this.settings.folderPath = musicFiles[0].webkitRelativePath.split('/')[0];
            localStorage.setItem('settings', JSON.stringify(this.settings));
        }
        
        this.updateFilters();
        
        // Show filters if we have songs
        if (this.songs.length > 0) {
            document.getElementById('filters-container').style.display = 'flex';
        }
        
        this.renderMusicGrid();
    }

    async processAudioFile(file) {
        return new Promise((resolve) => {
            const song = {
                file: file,
                title: file.name.replace(/\.[^/.]+$/, ""),
                artist: 'Artista Desconhecido',
                album: 'Álbum Desconhecido',
                year: '',
                genre: '',
                duration: 0,
                albumArt: null,
                url: URL.createObjectURL(file)
            };

            // Try to read metadata using jsmediatags
            if (window.jsmediatags) {
                jsmediatags.read(file, {
                    onSuccess: (tag) => {
                        const tags = tag.tags;
                        song.title = tags.title || song.title;
                        song.artist = tags.artist || song.artist;
                        song.album = tags.album || song.album;
                        song.year = tags.year || '';
                        song.genre = tags.genre || '';
                        
                        if (tags.picture) {
                            const { data, format } = tags.picture;
                            const byteArray = new Uint8Array(data);
                            const blob = new Blob([byteArray], { type: format });
                            song.albumArt = URL.createObjectURL(blob);
                        }
                        
                        this.songs.push(song);
                        resolve(song);
                    },
                    onError: () => {
                        this.songs.push(song);
                        resolve(song);
                    }
                });
            } else {
                this.songs.push(song);
                resolve(song);
            }
        });
    }

    updateFilters() {
        const genres = [...new Set(this.allSongs.map(song => song.genre).filter(g => g))];
        const artists = [...new Set(this.allSongs.map(song => song.artist).filter(a => a))];
        const years = [...new Set(this.allSongs.map(song => song.year).filter(y => y))].sort((a, b) => b - a);

        // Update genre filter
        const genreFilter = document.getElementById('genre-filter');
        genreFilter.innerHTML = '<option value="">Todos os Gêneros</option>' + 
            genres.map(genre => `<option value="${genre}">${genre}</option>`).join('');

        // Update artist filter
        const artistFilter = document.getElementById('artist-filter');
        artistFilter.innerHTML = '<option value="">Todos os Artistas</option>' + 
            artists.map(artist => `<option value="${artist}">${artist}</option>`).join('');

        // Update year filter
        const yearFilter = document.getElementById('year-filter');
        yearFilter.innerHTML = '<option value="">Todos os Anos</option>' + 
            years.map(year => `<option value="${year}">${year}</option>`).join('');
    }

    applyFilters() {
        let filteredSongs = [...this.allSongs];

        // Apply search filter
        if (this.filters.search.trim()) {
            const searchTerm = this.filters.search.toLowerCase();
            filteredSongs = filteredSongs.filter(song => 
                song.title.toLowerCase().includes(searchTerm) ||
                song.artist.toLowerCase().includes(searchTerm) ||
                song.album.toLowerCase().includes(searchTerm)
            );
        }

        // Apply genre filter
        if (this.filters.genre) {
            filteredSongs = filteredSongs.filter(song => song.genre === this.filters.genre);
        }

        // Apply artist filter
        if (this.filters.artist) {
            filteredSongs = filteredSongs.filter(song => song.artist === this.filters.artist);
        }

        // Apply year filter
        if (this.filters.year) {
            filteredSongs = filteredSongs.filter(song => song.year === this.filters.year);
        }

        this.currentPlaylist = filteredSongs;
        this.renderMusicGrid();
    }    clearFilters() {
        this.filters = { genre: '', artist: '', year: '', search: '' };
        document.getElementById('search-input').value = '';
        document.getElementById('genre-filter').value = '';
        document.getElementById('artist-filter').value = '';
        document.getElementById('year-filter').value = '';
        this.currentPlaylist = [...this.allSongs];
        this.renderMusicGrid();
    }

    renderMusicGrid() {
        const grid = document.getElementById('music-grid');
        
        if (this.currentPlaylist.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-music"></i>
                    <h3>Nenhuma música encontrada</h3>
                    <p>Carregue uma pasta com arquivos de música para começar</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.currentPlaylist.map((song, index) => `
            <div class="music-card ${this.currentSong === song ? 'playing' : ''}" data-index="${index}">
                <div class="album-art">
                    ${song.albumArt ? 
                        `<img src="${song.albumArt}" alt="${song.album}">` : 
                        '<i class="fas fa-music"></i>'
                    }
                </div>
                <div class="song-title">${song.title}</div>
                <div class="song-artist">${song.artist}</div>
                <div class="song-actions">
                    <button class="action-btn play-song-btn" data-index="${index}">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="action-btn like-song-btn ${this.favorites.includes(song.url) ? 'liked' : ''}" data-url="${song.url}">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button class="action-btn add-to-playlist-btn" data-index="${index}">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners to music cards
        grid.querySelectorAll('.music-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.song-actions')) {
                    const index = parseInt(card.dataset.index);
                    this.playSong(index);
                }
            });
        });

        grid.querySelectorAll('.play-song-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                this.playSong(index);
            });
        });

        grid.querySelectorAll('.like-song-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const url = btn.dataset.url;
                this.toggleSongLike(url, btn);
            });
        });

        grid.querySelectorAll('.add-to-playlist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                this.showAddToPlaylistMenu(index);
            });
        });
    }

    playSong(index) {
        if (index < 0 || index >= this.currentPlaylist.length) return;
        
        this.currentIndex = index;
        this.currentSong = this.currentPlaylist[index];
        
        this.audio.src = this.currentSong.url;
        this.audio.load();
        this.audio.play();
        
        this.updateCurrentSongDisplay();
        this.updatePlayPauseButton(true);
        this.renderMusicGrid(); // Re-render to update playing state
    }

    togglePlayPause() {
        if (!this.currentSong) {
            if (this.currentPlaylist.length > 0) {
                this.playSong(0);
            }
            return;
        }

        if (this.audio.paused) {
            this.audio.play();
            this.updatePlayPauseButton(true);
        } else {
            this.audio.pause();
            this.updatePlayPauseButton(false);
        }
    }

    previousSong() {
        if (this.currentPlaylist.length === 0) return;
        
        let newIndex;
        if (this.isShuffled) {
            newIndex = Math.floor(Math.random() * this.currentPlaylist.length);
        } else {
            newIndex = this.currentIndex - 1;
            if (newIndex < 0) {
                newIndex = this.currentPlaylist.length - 1;
            }
        }
        
        this.playSong(newIndex);
    }

    nextSong() {
        if (this.currentPlaylist.length === 0) return;
        
        if (this.isRepeating && this.currentSong) {
            this.audio.currentTime = 0;
            this.audio.play();
            return;
        }
        
        let newIndex;
        if (this.isShuffled) {
            newIndex = Math.floor(Math.random() * this.currentPlaylist.length);
        } else {
            newIndex = this.currentIndex + 1;
            if (newIndex >= this.currentPlaylist.length) {
                newIndex = 0;
            }
        }
        
        this.playSong(newIndex);
    }

    toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        const btn = document.getElementById('shuffle-btn');
        btn.classList.toggle('active', this.isShuffled);
    }

    toggleRepeat() {
        this.isRepeating = !this.isRepeating;
        const btn = document.getElementById('repeat-btn');
        btn.classList.toggle('active', this.isRepeating);
    }

    setVolume(volume) {
        this.audio.volume = volume / 100;
        this.updateVolumeIcon(volume);
    }

    toggleMute() {
        if (this.audio.muted) {
            this.audio.muted = false;
            document.getElementById('volume-slider').value = this.audio.volume * 100;
            this.updateVolumeIcon(this.audio.volume * 100);
        } else {
            this.audio.muted = true;
            this.updateVolumeIcon(0);
        }
    }

    seek(percentage) {
        if (this.audio.duration) {
            this.audio.currentTime = (percentage / 100) * this.audio.duration;
        }
    }

    toggleLike() {
        if (!this.currentSong) return;
        this.toggleSongLike(this.currentSong.url, document.getElementById('like-btn'));
    }

    toggleSongLike(url, button) {
        const index = this.favorites.indexOf(url);
        if (index > -1) {
            this.favorites.splice(index, 1);
            button.classList.remove('liked');
            button.querySelector('i').className = 'far fa-heart';
        } else {
            this.favorites.push(url);
            button.classList.add('liked');
            button.querySelector('i').className = 'fas fa-heart';
        }
        
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        
        if (this.currentView === 'favorites') {
            this.showFavorites();
        }
    }

    search(query) {
        if (!query.trim()) {
            this.currentPlaylist = [...this.songs];
        } else {
            const lowercaseQuery = query.toLowerCase();
            this.currentPlaylist = this.songs.filter(song => 
                song.title.toLowerCase().includes(lowercaseQuery) ||
                song.artist.toLowerCase().includes(lowercaseQuery) ||
                song.album.toLowerCase().includes(lowercaseQuery)
            );
        }
        this.renderMusicGrid();
    }    switchView(view) {
        this.currentView = view;
        
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-view="${view}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // Hide/show content sections
        const mainContent = document.getElementById('main-content');
        const settingsPage = document.getElementById('settings-page');
        
        if (mainContent) {
            mainContent.style.display = view === 'settings' ? 'none' : 'flex';
        }
        
        if (settingsPage) {
            settingsPage.style.display = view === 'settings' ? 'block' : 'none';
        }
        
        // Update content based on view
        switch (view) {
            case 'library':
                this.showLibrary();
                break;
            case 'playlists':
                this.showPlaylists();
                break;
            case 'favorites':
                this.showFavorites();
                break;
            case 'settings':
                this.showSettings();
                break;
        }
    }    showLibrary() {
        const contentTitle = document.getElementById('content-title');
        if (contentTitle) {
            contentTitle.textContent = 'Biblioteca de Músicas';
        }
        
        // Hide playlist play button in header for library view
        const playPlaylistBtn = document.getElementById('play-current-playlist-btn');
        if (playPlaylistBtn) {
            playPlaylistBtn.style.display = 'none';
        }
        
        this.currentPlaylist = [...this.songs];
        
        // Show filters if there are songs
        const filtersContainer = document.getElementById('filters-container');
        if (filtersContainer) {
            if (this.songs.length > 0) {
                filtersContainer.style.display = 'flex';
            } else {
                filtersContainer.style.display = 'none';
            }
        }
        
        this.renderMusicGrid();
    }showPlaylists() {
        const contentTitle = document.getElementById('content-title');
        if (contentTitle) {
            contentTitle.textContent = 'Suas Playlists';
        }
        
        const grid = document.getElementById('music-grid');
        if (!grid) return;
        
        // Hide filters for playlists view
        const filtersContainer = document.getElementById('filters-container');
        if (filtersContainer) {
            filtersContainer.style.display = 'none';
        }
        
        // Hide playlist play button in header for playlists overview
        const playPlaylistBtn = document.getElementById('play-current-playlist-btn');
        if (playPlaylistBtn) {
            playPlaylistBtn.style.display = 'none';
        }
        
        if (this.playlists.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-list"></i>
                    <h3>Nenhuma playlist criada</h3>
                    <p>Crie sua primeira playlist para organizar suas músicas</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.playlists.map((playlist, index) => `
            <div class="music-card playlist-card" data-playlist-index="${index}">
                <div class="album-art">
                    <i class="fas fa-list"></i>
                </div>
                <div class="song-title">${playlist.name}</div>
                <div class="song-artist">${playlist.songs.length} música(s)</div>
                <div class="song-actions">
                    <button class="action-btn play-playlist-btn" data-playlist-index="${index}">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="action-btn delete-playlist-btn" data-playlist-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners
        grid.querySelectorAll('.playlist-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.song-actions')) {
                    const index = parseInt(card.dataset.playlistIndex);
                    this.showPlaylist(index);
                }
            });
        });

        grid.querySelectorAll('.play-playlist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.playlistIndex);
                this.playPlaylist(index);
            });
        });

        grid.querySelectorAll('.delete-playlist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.playlistIndex);
                this.deletePlaylist(index);
            });
        });
    }    showFavorites() {
        const contentTitle = document.getElementById('content-title');
        if (contentTitle) {
            contentTitle.textContent = 'Músicas Favoritas';
        }
        
        // Hide playlist play button in header for favorites view
        const playPlaylistBtn = document.getElementById('play-current-playlist-btn');
        if (playPlaylistBtn) {
            playPlaylistBtn.style.display = 'none';
        }
        
        this.currentPlaylist = this.songs.filter(song => this.favorites.includes(song.url));
        
        // Hide filters for favorites view
        const filtersContainer = document.getElementById('filters-container');
        if (filtersContainer) {
            filtersContainer.style.display = 'none';
        }
        
        this.renderMusicGrid();
    }

    showPlaylistModal() {
        document.getElementById('playlist-modal').style.display = 'block';
        document.getElementById('playlist-name').value = '';
        document.getElementById('playlist-name').focus();
    }

    hidePlaylistModal() {
        document.getElementById('playlist-modal').style.display = 'none';
    }

    createPlaylist() {
        const name = document.getElementById('playlist-name').value.trim();
        if (!name) return;

        const playlist = {
            name: name,
            songs: [],
            createdAt: new Date().toISOString()
        };

        this.playlists.push(playlist);
        localStorage.setItem('playlists', JSON.stringify(this.playlists));
        this.loadPlaylists();
        this.hidePlaylistModal();

        if (this.currentView === 'playlists') {
            this.showPlaylists();
        }
    }

    loadPlaylists() {
        const list = document.getElementById('playlists-list');
        list.innerHTML = this.playlists.map((playlist, index) => `
            <div class="playlist-item" data-playlist-index="${index}">
                <i class="fas fa-list"></i> ${playlist.name}
            </div>
        `).join('');

        list.querySelectorAll('.playlist-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.playlistIndex);
                this.showPlaylist(index);
            });
        });
    }    showPlaylist(index) {
        const playlist = this.playlists[index];
        if (!playlist) return;

        const contentTitle = document.getElementById('content-title');
        if (contentTitle) {
            contentTitle.textContent = playlist.name;
        }
        
        // Show playlist play button in header
        const playPlaylistBtn = document.getElementById('play-current-playlist-btn');
        if (playPlaylistBtn && playlist.songs.length > 0) {
            playPlaylistBtn.style.display = 'inline-flex';
            playPlaylistBtn.innerHTML = `<i class="fas fa-play"></i> Reproduzir Playlist`;
            
            // Remove existing listeners to avoid duplicates
            const newBtn = playPlaylistBtn.cloneNode(true);
            playPlaylistBtn.parentNode.replaceChild(newBtn, playPlaylistBtn);
            
            // Add new listener
            newBtn.addEventListener('click', () => {
                this.playPlaylist(index);
            });
        }
        
        // Hide filters for individual playlist view
        const filtersContainer = document.getElementById('filters-container');
        if (filtersContainer) {
            filtersContainer.style.display = 'none';
        }
        
        this.currentPlaylist = playlist.songs;
        this.renderMusicGrid();
    }

    playPlaylist(index) {
        const playlist = this.playlists[index];
        if (!playlist || playlist.songs.length === 0) return;

        this.currentPlaylist = [...playlist.songs];
        this.playSong(0);
    }

    deletePlaylist(index) {
        if (confirm('Tem certeza que deseja excluir esta playlist?')) {
            this.playlists.splice(index, 1);
            localStorage.setItem('playlists', JSON.stringify(this.playlists));
            this.loadPlaylists();
            this.showPlaylists();
        }
    }

    showAddToPlaylistMenu(index) {
        this.selectedSongForPlaylist = this.currentPlaylist[index];
        const modal = document.getElementById('add-to-playlist-modal');
        const playlistsList = document.getElementById('available-playlists');
        
        // Populate available playlists
        playlistsList.innerHTML = this.playlists.map((playlist, playlistIndex) => `
            <div class="playlist-option" data-playlist-index="${playlistIndex}">
                <i class="fas fa-list"></i>
                <span>${playlist.name}</span>
                <span class="playlist-count">(${playlist.songs.length} músicas)</span>
            </div>
        `).join('');
        
        // Add event listeners for playlist selection
        playlistsList.querySelectorAll('.playlist-option').forEach(option => {
            option.addEventListener('click', () => {
                const playlistIndex = parseInt(option.dataset.playlistIndex);
                this.addSongToPlaylist(playlistIndex);
            });
        });
        
        modal.style.display = 'block';
    }

    hideAddToPlaylistModal() {
        document.getElementById('add-to-playlist-modal').style.display = 'none';
        this.selectedSongForPlaylist = null;
    }

    addSongToPlaylist(playlistIndex) {
        if (!this.selectedSongForPlaylist || playlistIndex < 0 || playlistIndex >= this.playlists.length) {
            return;
        }

        const playlist = this.playlists[playlistIndex];
        const songExists = playlist.songs.some(song => song.url === this.selectedSongForPlaylist.url);
        
        if (songExists) {
            alert('Esta música já está na playlist!');
            return;
        }

        // Add song to playlist
        playlist.songs.push({...this.selectedSongForPlaylist});
        localStorage.setItem('playlists', JSON.stringify(this.playlists));
        
        this.hideAddToPlaylistModal();
        
        // Refresh playlist view if currently viewing playlists
        if (this.currentView === 'playlists') {
            this.showPlaylists();
        }
        
        // Show success message
        this.showNotification(`Música adicionada à playlist "${playlist.name}"`);
    }

    showNotification(message) {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    showSettings() {
        // Initialize settings form values
        document.getElementById('theme-select').value = this.settings.theme;
        document.getElementById('font-select').value = this.settings.font;
        
        // Update folder path display
        const folderPathElement = document.getElementById('current-folder-path');
        if (this.settings.folderPath) {
            folderPathElement.textContent = this.settings.folderPath;
        } else {
            folderPathElement.textContent = 'Nenhuma pasta carregada';
        }
        
        // Set up event listeners for settings changes
        this.setupSettingsListeners();
    }    setupSettingsListeners() {
        // Theme selector
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect && !themeSelect.hasAttribute('data-listener-added')) {
            themeSelect.addEventListener('change', (e) => {
                this.changeTheme(e.target.value);
            });
            themeSelect.setAttribute('data-listener-added', 'true');
        }

        // Font selector
        const fontSelect = document.getElementById('font-select');
        if (fontSelect && !fontSelect.hasAttribute('data-listener-added')) {
            fontSelect.addEventListener('change', (e) => {
                this.changeFont(e.target.value);
            });
            fontSelect.setAttribute('data-listener-added', 'true');
        }

        // Clear data button
        const clearDataBtn = document.getElementById('clear-data-btn');
        if (clearDataBtn && !clearDataBtn.hasAttribute('data-listener-added')) {
            clearDataBtn.addEventListener('click', () => {
                this.clearAllData();
            });
            clearDataBtn.setAttribute('data-listener-added', 'true');
        }
    }

    changeTheme(theme) {
        this.settings.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('settings', JSON.stringify(this.settings));
        this.showNotification(`Tema alterado para ${theme === 'dark' ? 'escuro' : 'claro'}`);
    }

    changeFont(font) {
        this.settings.font = font;
        document.documentElement.setAttribute('data-font', font);
        localStorage.setItem('settings', JSON.stringify(this.settings));
        this.showNotification(`Fonte alterada para ${font === 'monospace' ? 'monoespaçada' : 'padrão'}`);
    }

    clearAllData() {
        if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
            localStorage.removeItem('playlists');
            localStorage.removeItem('favorites');
            localStorage.removeItem('savedSongs');
            
            this.playlists = [];
            this.favorites = [];
            this.songs = [];
            this.allSongs = [];
            this.currentPlaylist = [];
            this.currentSong = null;
            
            // Reset audio
            this.audio.pause();
            this.audio.src = '';
            
            // Update UI
            this.loadPlaylists();
            this.updateCurrentSongDisplay();
            this.renderMusicGrid();
            
            this.showNotification('Todos os dados foram limpos');
            
            // Switch back to library view
            this.switchView('library');
        }
    }

    updateCurrentSongDisplay() {
        if (!this.currentSong) return;

        document.getElementById('current-title').textContent = this.currentSong.title;
        document.getElementById('current-artist').textContent = this.currentSong.artist;
        
        const albumArt = document.getElementById('current-album-art');
        if (this.currentSong.albumArt) {
            albumArt.src = this.currentSong.albumArt;
        } else {
            albumArt.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjM0MzODM2Ii8+CjxwYXRoIGQ9Ik0yMCAzMEMxNC40NzcyIDMwIDEwIDI1LjUyMjggMTAgMjBDMTAgMTQuNDc3MiAxNC40NzcyIDEwIDIwIDEwQzI1LjUyMjggMTAgMzAgMTQuNDc3MiAzMCAyMEMzMCAyNS41MjI4IDI1LjUyMjggMzAgMjAgMzBaTTIwIDI1QzIyLjc2MTQgMjUgMjUgMjIuNzYxNCAyNSAyMEMyNSAxNy4yMzg2IDIyLjc2MTQgMTUgMjAgMTVDMTcuMjM4NiAxNSAxNSAxNy4yMzg2IDE1IDIwQzE1IDIyLjc2MTQgMTcuMjM4NiAyNSAyMCAyNVoiIGZpbGw9IiNGQkYxQzciLz4KPC9zdmc+";
        }

        // Update like button
        const likeBtn = document.getElementById('like-btn');
        if (this.favorites.includes(this.currentSong.url)) {
            likeBtn.classList.add('liked');
            likeBtn.querySelector('i').className = 'fas fa-heart';
        } else {
            likeBtn.classList.remove('liked');
            likeBtn.querySelector('i').className = 'far fa-heart';
        }
    }

    updatePlayPauseButton(isPlaying) {
        const btn = document.getElementById('play-pause-btn');
        const icon = btn.querySelector('i');
        
        if (isPlaying) {
            icon.className = 'fas fa-pause';
        } else {
            icon.className = 'fas fa-play';
        }
    }

    updateVolumeIcon(volume) {
        const btn = document.getElementById('volume-btn');
        const icon = btn.querySelector('i');
        
        if (volume === 0) {
            icon.className = 'fas fa-volume-mute';
        } else if (volume < 50) {
            icon.className = 'fas fa-volume-down';
        } else {
            icon.className = 'fas fa-volume-up';
        }
    }

    updateDuration() {
        const duration = this.audio.duration;
        if (!isNaN(duration)) {
            document.getElementById('duration').textContent = this.formatTime(duration);
            document.getElementById('progress-slider').max = 100;
        }
    }

    updateProgress() {
        const current = this.audio.currentTime;
        const duration = this.audio.duration;
        
        if (!isNaN(current) && !isNaN(duration) && duration > 0) {
            const percentage = (current / duration) * 100;
            document.getElementById('progress-slider').value = percentage;
            document.getElementById('current-time').textContent = this.formatTime(current);
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    updateUI() {
        // Set initial volume
        this.setVolume(50);
        
        // Initialize empty state
        if (this.songs.length === 0) {
            this.renderMusicGrid();
        }
    }
}

// Initialize the music player when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MusicPlayer();
});
