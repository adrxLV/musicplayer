class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audio-player');
        this.currentSong = null;
        this.songs = [];
        this.allSongs = [];
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
        this.searchDebounceTimer = null;
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
        this.enhanceAccessibility();
        this.updateUI();
    }    initializeSettings() {
        document.documentElement.setAttribute('data-theme', this.settings.theme);
        document.documentElement.setAttribute('data-font', this.settings.font);
        localStorage.setItem('settings', JSON.stringify(this.settings));
    }    async loadSavedMusic() {
        const savedSongs = JSON.parse(localStorage.getItem('savedSongs')) || [];
        if (savedSongs.length > 0 && this.settings.folderPath) {
            this.songs = [];
            this.allSongs = [];
            this.currentPlaylist = [];
            this.renderMusicGrid();
            const grid = document.getElementById('music-grid');
            if (grid) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-folder-open"></i>
                        <h3>Previously loaded folder: ${this.settings.folderPath}</h3>
                        <p>Please load the folder again to listen to the songs</p>
                        <button id="reload-folder-hint" class="btn btn-primary" style="margin-top: 1rem;">
                            <i class="fas fa-folder-open"></i> Load Folder
                        </button>
                    </div>
                `;
                const reloadBtn = document.getElementById('reload-folder-hint');
                if (reloadBtn) {
                    reloadBtn.addEventListener('click', () => {
                        document.getElementById('folder-input').click();
                    });
                }
            }
        }
    }    initializeEventListeners() {
        document.getElementById('load-folder-btn').addEventListener('click', () => {
            document.getElementById('folder-input').click();
        });
        document.getElementById('folder-input').addEventListener('change', (e) => {
            this.loadMusicFiles(e.target.files);
        });
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.target.closest('.nav-link').dataset.view;
                this.switchView(view);
            });
        });
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
        document.getElementById('volume-slider').addEventListener('input', (e) => {
            this.setVolume(e.target.value);
        });
        document.getElementById('volume-btn').addEventListener('click', () => {
            this.toggleMute();
        });
        document.getElementById('progress-slider').addEventListener('input', (e) => {
            this.seek(e.target.value);
        });
        document.getElementById('like-btn').addEventListener('click', () => {
            this.toggleLike();
        });
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.debouncedApplyFilters();
        });
        document.getElementById('genre-filter').addEventListener('change', (e) => {
            this.filters.genre = e.target.value;
            this.applyFilters();
        });
        document.getElementById('artist-filter').addEventListener('change', (e) => {
            this.filters.artist = e.target.value;
            this.applyFilters();
        });        document.getElementById('year-filter').addEventListener('change', (e) => {
            this.filters.year = e.target.value;
            this.applyFilters();
        });
        document.getElementById('create-playlist-btn').addEventListener('click', () => {
            this.showPlaylistModal();
        });
        document.getElementById('create-playlist-confirm').addEventListener('click', () => {
            this.createPlaylist();
        });
        document.querySelector('.close').addEventListener('click', () => {
            this.hidePlaylistModal();
        });
        document.querySelector('.close-add-playlist').addEventListener('click', () => {
            this.hideAddToPlaylistModal();
        });
        document.getElementById('add-to-new-playlist').addEventListener('click', () => {
            this.hideAddToPlaylistModal();
            this.showPlaylistModal();
        });
        document.getElementById('help-btn').addEventListener('click', () => {
            this.showKeyboardHelp();
        });
        this.audio.addEventListener('loadedmetadata', () => {
            this.updateDuration();
        });
        this.audio.addEventListener('timeupdate', () => {
            this.updateProgress();
        });
        this.audio.addEventListener('ended', () => {
            this.nextSong();
        });
        this.audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            this.showNotification('Error playing the song');
            this.nextSong();
        });
        this.audio.addEventListener('loadstart', () => {
        });
        this.audio.addEventListener('canplay', () => {
        });
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'back-to-library-btn') {
                this.switchView('library');
            }
        });
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('playlist-modal')) {
                this.hidePlaylistModal();
            }
            if (e.target === document.getElementById('add-to-playlist-modal')) {
                this.hideAddToPlaylistModal();
            }        });
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
        this.setupFocusManagement();
        this.audio.addEventListener('loadedmetadata', () => {
            this.updateDuration();
        });
        this.audio.addEventListener('timeupdate', () => {
            this.updateProgress();
        });
        this.audio.addEventListener('ended', () => {
            this.nextSong();
        });
        this.audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            this.showNotification('Error playing the song');
            this.nextSong();
        });
        this.audio.addEventListener('loadstart', () => {
        });
        this.audio.addEventListener('canplay', () => {
        });
    }    async loadMusicFiles(files) {
        try {
            const musicFiles = Array.from(files).filter(file =>
                file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|m4a|flac)$/i)
            );
            if (musicFiles.length === 0) {
                this.showNotification('No music files found in the selected folder');
                return;
            }
            this.showLoadingState(`Loading ${musicFiles.length} song(s)...`);
            this.songs = [];
            this.allSongs = [];
            const loadingPromises = musicFiles.map(async (file) => {
                try {
                    return await this.processAudioFile(file);
                } catch (error) {
                    this.handleFileError(error, file.name);
                    return null;
                }
            });
            document.getElementById('music-grid').innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><h3>Loading songs...</h3></div>';
            const results = await Promise.all(loadingPromises);
            const successfulSongs = results.filter(song => song !== null);
            this.allSongs = [...this.songs];
            this.currentPlaylist = [...this.songs];
            this.optimizeForLargeLibrary();
            const songsToSave = this.songs.map(song => ({
                ...song,
                file: null,
                url: null
            }));
            localStorage.setItem('savedSongs', JSON.stringify(songsToSave));
            if (musicFiles.length > 0) {
                this.settings.folderPath = musicFiles[0].webkitRelativePath.split('/')[0];
                localStorage.setItem('settings', JSON.stringify(this.settings));
            }
            this.reconnectPlaylistSongs();
              this.updateFilters();
            if (this.songs.length > 0) {
                document.getElementById('filters-container').style.display = 'flex';
                this.showNotification(`✅ ${this.songs.length} song(s) loaded successfully!`);
            }
            this.hideLoadingState();
            this.renderMusicGrid();
        } catch (error) {
            this.hideLoadingState();
            this.handleFileError(error, 'loading operation');
        }
    }
    reconnectPlaylistSongs() {
        if (this.playlists.length === 0 || this.songs.length === 0) return;
        let reconnectedCount = 0;
        let totalPlaylistSongs = 0;
        this.playlists.forEach(playlist => {
            totalPlaylistSongs += playlist.songs.length;
            playlist.songs = playlist.songs.map(playlistSong => {
                const matchedSong = this.songs.find(loadedSong => {
                    if (loadedSong.id === playlistSong.id) return true;
                    if (loadedSong.fileName === playlistSong.fileName &&
                        loadedSong.title === playlistSong.title &&
                        loadedSong.artist === playlistSong.artist) return true;
                    if (loadedSong.fileName === playlistSong.fileName) return true;
                    return false;
                });
                if (matchedSong) {
                    reconnectedCount++;
                    return matchedSong;
                } else {
                    return {
                        ...playlistSong,
                        unavailable: true
                    };
                }
            });
        });
        localStorage.setItem('playlists', JSON.stringify(this.playlists));
        if (totalPlaylistSongs > 0) {
            if (reconnectedCount === totalPlaylistSongs) {
                this.showNotification(`🔗 All ${totalPlaylistSongs} song(s) from playlists were reconnected!`);
            } else if (reconnectedCount > 0) {
                this.showNotification(`🔗 ${reconnectedCount}/${totalPlaylistSongs} song(s) from playlists were reconnected`);
            } else {
                this.showNotification(`⚠️ No songs from playlists were found in the loaded folder`);
            }
        }
    }
    async processAudioFile(file) {
        return new Promise((resolve) => {
            const songId = `${file.webkitRelativePath || file.name}_${file.size}_${file.lastModified}`;
            const song = {
                id: songId,
                file: file,
                title: file.name.replace(/\.[^/.]+$/, ""),
                artist: 'Artista Desconhecido',
                album: 'Unknown Album',
                year: '',
                genre: '',
                duration: 0,
                albumArt: null,
                url: URL.createObjectURL(file),
                fileName: file.name,
                filePath: file.webkitRelativePath || file.name
            };
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
        const genreFilter = document.getElementById('genre-filter');
        genreFilter.innerHTML = '<option value="">All Genres</option>' +
            genres.map(genre => `<option value="${genre}">${genre}</option>`).join('');
        const artistFilter = document.getElementById('artist-filter');
        artistFilter.innerHTML = '<option value="">All Artists</option>' +
            artists.map(artist => `<option value="${artist}">${artist}</option>`).join('');
        const yearFilter = document.getElementById('year-filter');
        yearFilter.innerHTML = '<option value="">All years</option>' +
            years.map(year => `<option value="${year}">${year}</option>`).join('');
    }
    applyFilters() {
        let filteredSongs = [...this.allSongs];
        if (this.filters.search.trim()) {
            const searchTerm = this.filters.search.toLowerCase();
            filteredSongs = filteredSongs.filter(song =>
                song.title.toLowerCase().includes(searchTerm) ||
                song.artist.toLowerCase().includes(searchTerm) ||
                song.album.toLowerCase().includes(searchTerm)
            );
        }
        if (this.filters.genre) {
            filteredSongs = filteredSongs.filter(song => song.genre === this.filters.genre);
        }
        if (this.filters.artist) {
            filteredSongs = filteredSongs.filter(song => song.artist === this.filters.artist);
        }
        if (this.filters.year) {
            filteredSongs = filteredSongs.filter(song => song.year === this.filters.year);
        }        this.currentPlaylist = filteredSongs;
        this.renderMusicGrid();
    }
    debouncedApplyFilters() {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
            this.applyFilters();
        }, 300);
    }
    clearFilters() {
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
                    <h3>No songs found</h3>
                    <p>Load a folder with music files to get started</p>
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
                    </button>                    <button class="action-btn like-song-btn ${this.favorites.includes(song.id) ? 'liked' : ''}" data-song-id="${song.id}">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button class="action-btn add-to-playlist-btn" data-index="${index}">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        `).join('');
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
        });        grid.querySelectorAll('.like-song-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const songId = btn.dataset.songId;
                this.toggleSongLike(songId, btn);
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
        this.renderMusicGrid();
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
    }    toggleLike() {
        if (!this.currentSong) return;
        this.toggleSongLike(this.currentSong.id, document.getElementById('like-btn'));
    }toggleSongLike(songId, button) {
        const index = this.favorites.indexOf(songId);
        if (index > -1) {
            this.favorites.splice(index, 1);
            button.classList.remove('liked');
            button.querySelector('i').className = 'far fa-heart';
        } else {
            this.favorites.push(songId);
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
            );        }
        this.renderMusicGrid();
    }    switchView(view) {
        this.currentView = view;
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`[data-view="${view}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        const mainContent = document.getElementById('main-content');
        const settingsPage = document.getElementById('settings-page');
        if (mainContent) {
            mainContent.style.display = view === 'settings' ? 'none' : 'flex';
        }
        if (settingsPage) {
            settingsPage.style.display = view === 'settings' ? 'block' : 'none';
        }
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
            contentTitle.textContent = 'Music Library';
        }
        const playPlaylistBtn = document.getElementById('play-current-playlist-btn');
        if (playPlaylistBtn) {
            playPlaylistBtn.style.display = 'none';
        }
        this.currentPlaylist = [...this.songs];
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
        const filtersContainer = document.getElementById('filters-container');
        if (filtersContainer) {
            filtersContainer.style.display = 'none';
        }
        const playPlaylistBtn = document.getElementById('play-current-playlist-btn');
        if (playPlaylistBtn) {
            playPlaylistBtn.style.display = 'none';
        }
          if (this.playlists.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-list"></i>
                    <h3>No playlists created</h3>
                    <p>Create your first playlist to organize your songs</p>
                    <div class="playlist-actions">
                        <button id="import-playlist-btn" class="playlist-import-btn">
                            <i class="fas fa-file-import"></i> Importar Playlist
                        </button>
                    </div>
                </div>
            `;
            document.getElementById('import-playlist-btn').addEventListener('click', () => {
                this.importPlaylist();
            });
            return;
        }        grid.innerHTML = this.playlists.map((playlist, index) => {
            const availableSongs = playlist.songs.filter(song => !song.unavailable && song.url);
            const totalSongs = playlist.songs.length;
            const songCountText = availableSongs.length < totalSongs ?
                `${availableSongs.length}/${totalSongs} song(s)` :
                `${totalSongs} song(s)`;
            return `
            <div class="music-card playlist-card" data-playlist-index="${index}">
                <div class="album-art">
                    <i class="fas fa-list"></i>
                </div>
                <div class="song-title">${playlist.name}</div>
                <div class="song-artist">${songCountText}</div>
                <div class="song-actions">
                    <button class="action-btn play-playlist-btn" data-playlist-index="${index}" title="Reproduzir playlist" ${availableSongs.length === 0 ? 'disabled' : ''}>
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="action-btn export-playlist-btn" data-playlist-index="${index}" title="Exportar playlist">
                        <i class="fas fa-file-export"></i>
                    </button>
                    <button class="action-btn delete-playlist-btn" data-playlist-index="${index}" title="Excluir playlist">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            `;
        }).join('') + `
        <div class="playlist-actions" style="grid-column: 1 / -1; justify-content: center; margin-top: 2rem;">
            <button id="import-playlist-btn" class="playlist-import-btn">
                <i class="fas fa-file-import"></i> Importar Playlist
            </button>
        </div>
        `;
        grid.querySelectorAll('.playlist-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.song-actions')) {
                    const index = parseInt(card.dataset.playlistIndex);
                    this.showPlaylist(index);
                }
            });
        });        grid.querySelectorAll('.play-playlist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (btn.disabled) {
                    this.showNotification('⚠️ This playlist has no available songs. Load the folder with the songs first.');
                    return;
                }
                const index = parseInt(btn.dataset.playlistIndex);
                this.playPlaylist(index);
            });
        });
        grid.querySelectorAll('.export-playlist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.playlistIndex);
                this.exportPlaylist(index);
            });
        });
        grid.querySelectorAll('.delete-playlist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.playlistIndex);
                this.deletePlaylist(index);
            });
        });
        const importBtn = document.getElementById('import-playlist-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.importPlaylist();
            });
        }
    }    showFavorites() {
        const contentTitle = document.getElementById('content-title');
        if (contentTitle) {
            contentTitle.textContent = 'Favorite Songs';
        }
        const playPlaylistBtn = document.getElementById('play-current-playlist-btn');
        if (playPlaylistBtn) {
            playPlaylistBtn.style.display = 'none';
        }
        this.currentPlaylist = this.songs.filter(song => this.favorites.includes(song.id));
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
            const availableSongs = playlist.songs.filter(song => !song.unavailable && song.url);
            const totalSongs = playlist.songs.length;
            if (availableSongs.length < totalSongs) {
                contentTitle.textContent = `${playlist.name} (${availableSongs.length}/${totalSongs} available)`;
            } else {
                contentTitle.textContent = playlist.name;
            }
        }
        const playPlaylistBtn = document.getElementById('play-current-playlist-btn');
        const availableSongs = playlist.songs.filter(song => !song.unavailable && song.url);
        if (playPlaylistBtn && availableSongs.length > 0) {
            playPlaylistBtn.style.display = 'inline-flex';
            playPlaylistBtn.innerHTML = `<i class="fas fa-play"></i> Reproduzir Playlist`;
            const newBtn = playPlaylistBtn.cloneNode(true);
            playPlaylistBtn.parentNode.replaceChild(newBtn, playPlaylistBtn);
            newBtn.addEventListener('click', () => {
                this.playPlaylist(index);
            });
        } else if (playPlaylistBtn) {
            playPlaylistBtn.style.display = 'none';
        }
        const filtersContainer = document.getElementById('filters-container');
        if (filtersContainer) {
            filtersContainer.style.display = 'none';
        }
        this.currentPlaylist = availableSongs;
        this.renderMusicGrid();
    }playPlaylist(index) {
        const playlist = this.playlists[index];
        if (!playlist || playlist.songs.length === 0) return;
        const availableSongs = playlist.songs.filter(song => !song.unavailable && song.url);
        if (availableSongs.length === 0) {
            this.showNotification('⚠️ No songs available in this playlist. Load the folder with the songs first.');
            return;
        }
        if (availableSongs.length < playlist.songs.length) {
            const unavailableCount = playlist.songs.length - availableSongs.length;
            this.showNotification(`⚠️ ${unavailableCount} song(s) not available in this playlist`);
        }
        this.currentPlaylist = [...availableSongs];
        this.playSong(0);
    }
    deletePlaylist(index) {
        if (confirm('Are you sure you want to delete this playlist?')) {
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
        playlistsList.innerHTML = this.playlists.map((playlist, playlistIndex) => `
            <div class="playlist-option" data-playlist-index="${playlistIndex}">
                <i class="fas fa-list"></i>
                <span>${playlist.name}</span>
                <span class="playlist-count">(${playlist.songs.length} songs)</span>
            </div>
        `).join('');
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
    }    addSongToPlaylist(playlistIndex) {
        if (!this.selectedSongForPlaylist || playlistIndex < 0 || playlistIndex >= this.playlists.length) {
            return;
        }        const playlist = this.playlists[playlistIndex];
        const songExists = playlist.songs.some(song => song.id === this.selectedSongForPlaylist.id);
        if (songExists) {
            alert('This song is already in the playlist!');
            return;
        }
        const songToSave = {
            id: this.selectedSongForPlaylist.id,
            title: this.selectedSongForPlaylist.title,
            artist: this.selectedSongForPlaylist.artist,
            album: this.selectedSongForPlaylist.album,
            year: this.selectedSongForPlaylist.year,
            genre: this.selectedSongForPlaylist.genre,
            duration: this.selectedSongForPlaylist.duration,
            fileName: this.selectedSongForPlaylist.fileName,
            filePath: this.selectedSongForPlaylist.filePath
        };
        playlist.songs.push(songToSave);
        localStorage.setItem('playlists', JSON.stringify(this.playlists));
        this.hideAddToPlaylistModal();
        if (this.currentView === 'playlists') {
            this.showPlaylists();
        }
        this.showNotification(`Song added to playlist "${playlist.name}"`);
    }
    showNotification(message) {
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        notification.textContent = message;
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');        }, 3000);
    }    showSettings() {
        const themeSelect = document.getElementById('theme-select');
        const fontSelect = document.getElementById('font-select');
        if (themeSelect) {
            themeSelect.value = this.settings.theme;
        }
        if (fontSelect) {
            fontSelect.value = this.settings.font;
        }
        const folderPathElement = document.getElementById('current-folder-path');
        if (folderPathElement) {
            if (this.settings.folderPath) {
                folderPathElement.textContent = this.settings.folderPath;
            } else {
                folderPathElement.textContent = 'No folder loaded';
            }
        }
        this.setupSettingsListeners();
    }setupSettingsListeners() {
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect && !themeSelect.hasAttribute('data-listener-added')) {
            themeSelect.addEventListener('change', (e) => {
                this.changeTheme(e.target.value);
            });
            themeSelect.setAttribute('data-listener-added', 'true');
        }
        const fontSelect = document.getElementById('font-select');
        if (fontSelect && !fontSelect.hasAttribute('data-listener-added')) {
            fontSelect.addEventListener('change', (e) => {
                this.changeFont(e.target.value);
            });
            fontSelect.setAttribute('data-listener-added', 'true');
        }
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
        this.showNotification(`Theme changed to ${theme === 'dark' ? 'dark' : 'light'}`);
    }
    changeFont(font) {
        this.settings.font = font;
        document.documentElement.setAttribute('data-font', font);
        localStorage.setItem('settings', JSON.stringify(this.settings));
        this.showNotification(`Font changed to ${font === 'monospace' ? 'monospace' : 'default'}`);
    }
    clearAllData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            localStorage.removeItem('playlists');
            localStorage.removeItem('favorites');
            localStorage.removeItem('savedSongs');
            this.playlists = [];
            this.favorites = [];
            this.songs = [];
            this.allSongs = [];
            this.currentPlaylist = [];
            this.currentSong = null;
            this.audio.pause();
            this.audio.src = '';
            this.loadPlaylists();
            this.updateCurrentSongDisplay();
            this.renderMusicGrid();
            this.showNotification('All data has been cleared');
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
        const likeBtn = document.getElementById('like-btn');
        if (this.favorites.includes(this.currentSong.id)) {
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
        this.setVolume(50);
        if (this.songs.length === 0) {
            this.renderMusicGrid();
        }
    }
    handleKeyboardShortcuts(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }
        const handled = [
            'Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
            'KeyM', 'KeyS', 'KeyR', 'KeyL', 'KeyF', 'KeyP', 'Escape',
            'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Slash'
        ];
        if (handled.includes(e.code)) {
            e.preventDefault();
        }
        switch (e.code) {
            case 'Space':
                this.togglePlayPause();
                this.showNotification('⏯️ Play/Pause');
                break;
            case 'ArrowLeft':
                this.previousSong();
                this.showNotification('⏮️ Previous song');
                break;
            case 'ArrowRight':
                this.nextSong();
                this.showNotification('⏭️ Next song');
                break;
            case 'ArrowUp':
                const currentVolume = Math.round(this.audio.volume * 100);
                const newVolumeUp = Math.min(100, currentVolume + 10);
                this.setVolume(newVolumeUp);
                document.getElementById('volume-slider').value = newVolumeUp;
                this.showNotification(`🔊 Volume: ${newVolumeUp}%`);
                break;
            case 'ArrowDown':
                const currentVolumeDown = Math.round(this.audio.volume * 100);
                const newVolumeDown = Math.max(0, currentVolumeDown - 10);
                this.setVolume(newVolumeDown);
                document.getElementById('volume-slider').value = newVolumeDown;
                this.showNotification(`🔉 Volume: ${newVolumeDown}%`);
                break;
            case 'KeyM':
                this.toggleMute();
                this.showNotification(this.audio.muted ? '🔇 Muted' : '🔊 Sound enabled');
                break;
            case 'KeyS':
                this.toggleShuffle();
                this.showNotification(this.isShuffled ? '🔀 Shuffle enabled' : '🔀 Shuffle disabled');
                break;
            case 'KeyR':
                this.toggleRepeat();
                this.showNotification(this.isRepeating ? '🔁 Repeat enabled' : '🔁 Repeat disabled');
                break;            case 'KeyL':
                if (this.currentSong) {
                    this.toggleLike();
                    const isLiked = this.favorites.includes(this.currentSong.id);
                    this.showNotification(isLiked ? '❤️ Added to favorites' : '💔 Removed from favorites');
                }
                break;
            case 'KeyF':
                const searchInput = document.getElementById('search-input');
                if (searchInput && this.currentView === 'library') {
                    searchInput.focus();
                    this.showNotification('🔍 Search songs');
                }
                break;
            case 'KeyP':
                if (this.currentView === 'library' || this.currentView === 'playlists') {
                    this.showPlaylistModal();
                    this.showNotification('➕ New playlist');
                }
                break;
            case 'Escape':
                if (document.getElementById('playlist-modal').style.display === 'block') {
                    this.hidePlaylistModal();
                } else if (document.getElementById('add-to-playlist-modal').style.display === 'block') {
                    this.hideAddToPlaylistModal();
                } else if (this.currentView === 'library') {
                    this.clearSearch();
                }
                break;
            case 'Digit1':
                this.switchView('library');
                this.showNotification('📚 Library');
                break;
            case 'Digit2':
                this.switchView('playlists');
                this.showNotification('📋 Playlists');
                break;
            case 'Digit3':
                this.switchView('favorites');
                this.showNotification('❤️ Favorites');
                break;            case 'Digit4':
                this.switchView('settings');
                this.showNotification('⚙️ Settings');
                break;
            case 'Slash':
                if (e.shiftKey) {
                    this.showKeyboardHelp();
                    this.showNotification('❓ Keyboard shortcuts help');
                }
                break;
        }
    }
    setupFocusManagement() {
        const focusableElements = [
            '.nav-link', '.btn', '.music-card', '.control-btn',
            'input', 'select', '.action-btn', '.playlist-item'
        ];
        focusableElements.forEach(selector => {
            document.addEventListener('focus', (e) => {
                if (e.target.matches(selector)) {
                    e.target.setAttribute('data-focused', 'true');
                }
            }, true);
            document.addEventListener('blur', (e) => {
                if (e.target.matches(selector)) {
                    e.target.removeAttribute('data-focused');
                }
            }, true);
        });
    }
    clearSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput && searchInput.value) {
            searchInput.value = '';
            this.filters.search = '';
            this.applyFilters();
            this.showNotification('🗑️ Busca limpa');
        }
    }    showKeyboardHelp() {
        const helpModal = document.createElement('div');
        helpModal.id = 'keyboard-help-modal';
        helpModal.className = 'keyboard-help-modal';
        helpModal.innerHTML = `
            <div class="keyboard-help-content">
                <div class="keyboard-help-header">
                    <h3><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h3>
                    <button class="keyboard-help-close close-help">&times;</button>
                </div>
                <div class="keyboard-shortcuts">
                    <div class="shortcut-group">
                        <h4><i class="fas fa-play"></i> Playback Controls</h4>
                        <div class="shortcut-list">
                            <div class="shortcut-item">
                                <span class="shortcut-key">Space</span>
                                <span class="shortcut-description">Play/Pause</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">←</span>
                                <span class="shortcut-description">Previous song</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">→</span>
                                <span class="shortcut-description">Next song</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">↑</span>
                                <span class="shortcut-description">Increase volume</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">↓</span>
                                <span class="shortcut-description">Decrease volume</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">M</span>
                                <span class="shortcut-description">Mute/Unmute</span>
                            </div>
                        </div>
                    </div>
                    <div class="shortcut-group">
                        <h4><i class="fas fa-cog"></i> Features</h4>
                        <div class="shortcut-list">
                            <div class="shortcut-item">
                                <span class="shortcut-key">S</span>
                                <span class="shortcut-description">Toggle shuffle mode</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">R</span>
                                <span class="shortcut-description">Toggle repeat</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">L</span>
                                <span class="shortcut-description">Like current song</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">F</span>
                                <span class="shortcut-description">Focus on search</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">P</span>
                                <span class="shortcut-description">New playlist</span>
                            </div>
                        </div>
                    </div>
                    <div class="shortcut-group">
                        <h4><i class="fas fa-compass"></i> Navigation</h4>
                        <div class="shortcut-list">
                            <div class="shortcut-item">
                                <span class="shortcut-key">1</span>
                                <span class="shortcut-description">Library</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">2</span>
                                <span class="shortcut-description">Playlists</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">3</span>
                                <span class="shortcut-description">Favorites</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">4</span>
                                <span class="shortcut-description">Settings</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">Esc</span>
                                <span class="shortcut-description">Close modals/Clear search</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">?</span>
                                <span class="shortcut-description">Show this help</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--bg-light);">
                    <button class="btn btn-primary close-help">
                        <i class="fas fa-check"></i> Got it!
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(helpModal);
        helpModal.querySelectorAll('.close-help').forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(helpModal);
            });
        });
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                document.body.removeChild(helpModal);
            }
        });
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(helpModal);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    handleFileError(error, filename) {
        console.error('File error:', error, filename);
        let message = 'Error processing file';
        if (filename) {
            message += `: ${filename}`;
        }
        if (error.name === 'NotReadableError') {
            message = 'File cannot be read. Check if the file is not corrupted.';
        } else if (error.name === 'SecurityError') {
            message = 'Security error when accessing the file.';
        } else if (error.name === 'NotFoundError') {
            message = 'File not found.';
        }
        this.showNotification(message);
    }
    showLoadingState(message = 'Loading...') {
        let loader = document.getElementById('loading-indicator');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'loading-indicator';
            loader.className = 'loading-indicator';
            document.body.appendChild(loader);
        }
        loader.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        loader.style.display = 'flex';
    }
    hideLoadingState() {
        const loader = document.getElementById('loading-indicator');
        if (loader) {
            loader.style.display = 'none';
        }
    }
    optimizeForLargeLibrary() {
        if (this.allSongs.length > 1000) {
            this.showNotification(`📚 Large library detected (${this.allSongs.length} songs). Optimizing performance...`);
            this.songs = this.allSongs.slice(0, 100);
            this.currentPlaylist = [...this.songs];
            this.addLoadMoreButton();
        }
    }
    addLoadMoreButton() {
        const grid = document.getElementById('music-grid');
        if (!grid || this.songs.length >= this.allSongs.length) return;
        const loadMoreBtn = document.createElement('div');
        loadMoreBtn.className = 'load-more-container';
        loadMoreBtn.innerHTML = `
            <button id="load-more-btn" class="btn btn-secondary">
                <i class="fas fa-plus"></i> Carregar mais músicas (${this.allSongs.length - this.songs.length} restantes)
            </button>
        `;
        grid.appendChild(loadMoreBtn);
        document.getElementById('load-more-btn').addEventListener('click', () => {
            const nextBatch = this.allSongs.slice(this.songs.length, this.songs.length + 100);
            this.songs.push(...nextBatch);
            this.applyFilters();
            if (this.songs.length >= this.allSongs.length) {
                loadMoreBtn.remove();
            } else {
                document.getElementById('load-more-btn').innerHTML = `
                    <i class="fas fa-plus"></i> Carregar mais músicas (${this.allSongs.length - this.songs.length} restantes)
                `;
            }
        });
    }
    exportPlaylist(playlistIndex) {
        const playlist = this.playlists[playlistIndex];
        if (!playlist) return;
        const exportData = {
            name: playlist.name,
            songs: playlist.songs.map(song => ({
                title: song.title,
                artist: song.artist,
                album: song.album,
                duration: song.duration,
                genre: song.genre,
                year: song.year,
                filename: song.file?.name || 'unknown'
            })),
            createdAt: playlist.createdAt,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${playlist.name}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showNotification(`📤 Playlist "${playlist.name}" exportada!`);
    }
    importPlaylist() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!data.name || !Array.isArray(data.songs)) {
                        throw new Error('Formato de arquivo inválido');
                    }
                    let playlistName = data.name;
                    let counter = 1;
                    while (this.playlists.some(p => p.name === playlistName)) {
                        playlistName = `${data.name} (${counter})`;
                        counter++;
                    }
                    const newPlaylist = {
                        name: playlistName,
                        songs: [],
                        createdAt: new Date().toISOString(),
                        importedAt: new Date().toISOString(),
                        originalData: data
                    };
                    this.playlists.push(newPlaylist);
                    localStorage.setItem('playlists', JSON.stringify(this.playlists));
                    this.loadPlaylists();
                    this.showNotification(`📥 Playlist "${playlistName}" importada! As músicas precisam ser carregadas manualmente.`);
                } catch (error) {
                    this.handleFileError(error, file.name);
                }
            };
            reader.readAsText(file);
        });
        input.click();
    }
    reconnectPlaylistSongs() {
        if (this.playlists.length === 0 || this.songs.length === 0) return;
        let reconnectedCount = 0;
        let totalPlaylistSongs = 0;
        this.playlists.forEach(playlist => {
            totalPlaylistSongs += playlist.songs.length;
            playlist.songs = playlist.songs.map(playlistSong => {
                const matchedSong = this.songs.find(loadedSong => {
                    if (loadedSong.id === playlistSong.id) return true;
                    if (loadedSong.fileName === playlistSong.fileName &&
                        loadedSong.title === playlistSong.title &&
                        loadedSong.artist === playlistSong.artist) return true;
                    if (loadedSong.fileName === playlistSong.fileName) return true;
                    return false;
                });
                if (matchedSong) {
                    reconnectedCount++;
                    return matchedSong;
                } else {
                    return {
                        ...playlistSong,
                        unavailable: true
                    };
                }
            });
        });
        localStorage.setItem('playlists', JSON.stringify(this.playlists));
        if (totalPlaylistSongs > 0) {
            if (reconnectedCount === totalPlaylistSongs) {
                this.showNotification(`🔗 All ${totalPlaylistSongs} song(s) from playlists have been reconnected!`);
            } else if (reconnectedCount > 0) {
                this.showNotification(`🔗 ${reconnectedCount}/${totalPlaylistSongs} song(s) from playlists have been reconnected`);
            } else {
                this.showNotification(`⚠️ No songs from playlists were found in the loaded folder`);
            }
        }
    }
    enhanceAccessibility() {
        const controls = {
            'play-pause-btn': 'Play or pause music',
            'prev-btn': 'Previous song',
            'next-btn': 'Next song',
            'shuffle-btn': 'Toggle shuffle mode',
            'repeat-btn': 'Toggle repeat',
            'like-btn': 'Like current song',
            'volume-btn': 'Mute or unmute sound',
            'volume-slider': 'Volume control',
            'progress-slider': 'Song progress',
            'search-input': 'Search songs, artists or albums'
        };        Object.entries(controls).forEach(([id, label]) => {
            const element = document.getElementById(id);
            if (element) {
                element.setAttribute('aria-label', label);
            }        });
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const musicPlayer = new MusicPlayer();
});