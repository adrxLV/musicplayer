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
        this.isRepeating = false;        this.currentView = 'library';
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

        // Playlist creation
        document.getElementById('create-playlist-btn').addEventListener('click', () => {
            this.showPlaylistModal();
        });
        
        document.getElementById('create-playlist-confirm').addEventListener('click', () => {
            this.createPlaylist();
        });
        
        document.querySelector('.close').addEventListener('click', () => {
            this.hidePlaylistModal();
        });        // Add to playlist modal
        document.querySelector('.close-add-playlist').addEventListener('click', () => {
            this.hideAddToPlaylistModal();
        });

        document.getElementById('add-to-new-playlist').addEventListener('click', () => {
            this.hideAddToPlaylistModal();
            this.showPlaylistModal();
        });

        // Help button
        document.getElementById('help-btn').addEventListener('click', () => {
            this.showKeyboardHelp();
        });

        // Audio events
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
            this.showNotification('Erro ao reproduzir a música');
            this.nextSong();
        });

        this.audio.addEventListener('loadstart', () => {
            // Show loading indicator if needed
        });

        this.audio.addEventListener('canplay', () => {
            // Hide loading indicator if needed
        });// Back to library button (for settings page)
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'back-to-library-btn') {
                this.switchView('library');
            }
        });

        // Window events
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('playlist-modal')) {
                this.hidePlaylistModal();
            }
            if (e.target === document.getElementById('add-to-playlist-modal')) {
                this.hideAddToPlaylistModal();
            }        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Focus management for accessibility
        this.setupFocusManagement();

        // Audio events
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
            this.showNotification('Erro ao reproduzir a música');
            this.nextSong();
        });

        this.audio.addEventListener('loadstart', () => {
            // Show loading indicator if needed
        });

        this.audio.addEventListener('canplay', () => {
            // Hide loading indicator if needed
        });
    }    async loadMusicFiles(files) {
        try {
            const musicFiles = Array.from(files).filter(file => 
                file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|m4a|flac)$/i)
            );

            if (musicFiles.length === 0) {
                this.showNotification('Nenhum arquivo de música encontrado na pasta selecionada');
                return;
            }

            this.showLoadingState(`Carregando ${musicFiles.length} música(s)...`);
            
            this.songs = [];
            this.allSongs = [];
            
            // Process files with error handling
            const loadingPromises = musicFiles.map(async (file) => {
                try {
                    return await this.processAudioFile(file);
                } catch (error) {
                    this.handleFileError(error, file.name);
                    return null;
                }
            });
            
            // Show initial loading state in grid
            document.getElementById('music-grid').innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><h3>Carregando músicas...</h3></div>';
            
            const results = await Promise.all(loadingPromises);
            const successfulSongs = results.filter(song => song !== null);
            
            this.allSongs = [...this.songs];
            this.currentPlaylist = [...this.songs];
            
            // Check for large library and optimize if needed
            this.optimizeForLargeLibrary();
            
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
                this.showNotification(`✅ ${this.songs.length} música(s) carregada(s) com sucesso!`);
            }
            
            this.hideLoadingState();
            this.renderMusicGrid();
            
        } catch (error) {
            this.hideLoadingState();
            this.handleFileError(error, 'operação de carregamento');
        }
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
            );        }
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
                    <div class="playlist-actions">
                        <button id="import-playlist-btn" class="playlist-import-btn">
                            <i class="fas fa-file-import"></i> Importar Playlist
                        </button>
                    </div>
                </div>
            `;
            
            // Add import event listener
            document.getElementById('import-playlist-btn').addEventListener('click', () => {
                this.importPlaylist();
            });
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
                    <button class="action-btn play-playlist-btn" data-playlist-index="${index}" title="Reproduzir playlist">
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
        `).join('') + `
        <div class="playlist-actions" style="grid-column: 1 / -1; justify-content: center; margin-top: 2rem;">
            <button id="import-playlist-btn" class="playlist-import-btn">
                <i class="fas fa-file-import"></i> Importar Playlist
            </button>
        </div>
        `;

        // Add event listeners
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

        // Add import event listener
        const importBtn = document.getElementById('import-playlist-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.importPlaylist();
            });
        }
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
            notification.classList.remove('show');        }, 3000);
    }    showSettings() {
        // Initialize settings form values
        const themeSelect = document.getElementById('theme-select');
        const fontSelect = document.getElementById('font-select');
        
        if (themeSelect) {
            themeSelect.value = this.settings.theme;
        }
        if (fontSelect) {
            fontSelect.value = this.settings.font;
        }
        
        // Update folder path display
        const folderPathElement = document.getElementById('current-folder-path');
        if (folderPathElement) {
            if (this.settings.folderPath) {
                folderPathElement.textContent = this.settings.folderPath;
            } else {
                folderPathElement.textContent = 'Nenhuma pasta carregada';
            }
        }
        
        // Set up event listeners for settings changes
        this.setupSettingsListeners();
    }setupSettingsListeners() {
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

    handleKeyboardShortcuts(e) {
        // Don't handle shortcuts when user is typing in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }        // Prevent default for our handled shortcuts
        const handled = [
            'Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
            'KeyM', 'KeyS', 'KeyR', 'KeyL', 'KeyF', 'KeyP', 'Escape',
            'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Slash'
        ];

        if (handled.includes(e.code)) {
            e.preventDefault();
        }

        switch (e.code) {
            case 'Space': // Play/Pause
                this.togglePlayPause();
                this.showNotification('⏯️ Play/Pause');
                break;

            case 'ArrowLeft': // Previous song
                this.previousSong();
                this.showNotification('⏮️ Música anterior');
                break;

            case 'ArrowRight': // Next song
                this.nextSong();
                this.showNotification('⏭️ Próxima música');
                break;

            case 'ArrowUp': // Volume up
                const currentVolume = Math.round(this.audio.volume * 100);
                const newVolumeUp = Math.min(100, currentVolume + 10);
                this.setVolume(newVolumeUp);
                document.getElementById('volume-slider').value = newVolumeUp;
                this.showNotification(`🔊 Volume: ${newVolumeUp}%`);
                break;

            case 'ArrowDown': // Volume down
                const currentVolumeDown = Math.round(this.audio.volume * 100);
                const newVolumeDown = Math.max(0, currentVolumeDown - 10);
                this.setVolume(newVolumeDown);
                document.getElementById('volume-slider').value = newVolumeDown;
                this.showNotification(`🔉 Volume: ${newVolumeDown}%`);
                break;

            case 'KeyM': // Mute/Unmute
                this.toggleMute();
                this.showNotification(this.audio.muted ? '🔇 Silenciado' : '🔊 Som ativado');
                break;

            case 'KeyS': // Shuffle
                this.toggleShuffle();
                this.showNotification(this.isShuffled ? '🔀 Aleatório ativado' : '🔀 Aleatório desativado');
                break;

            case 'KeyR': // Repeat
                this.toggleRepeat();
                this.showNotification(this.isRepeating ? '🔁 Repetir ativado' : '🔁 Repetir desativado');
                break;

            case 'KeyL': // Like current song
                if (this.currentSong) {
                    this.toggleLike();
                    const isLiked = this.favorites.includes(this.currentSong.url);
                    this.showNotification(isLiked ? '❤️ Adicionado aos favoritos' : '💔 Removido dos favoritos');
                }
                break;

            case 'KeyF': // Focus search
                const searchInput = document.getElementById('search-input');
                if (searchInput && this.currentView === 'library') {
                    searchInput.focus();
                    this.showNotification('🔍 Buscar músicas');
                }
                break;

            case 'KeyP': // Create new playlist
                if (this.currentView === 'library' || this.currentView === 'playlists') {
                    this.showPlaylistModal();
                    this.showNotification('➕ Nova playlist');
                }
                break;

            case 'Escape': // Close modals or clear search
                if (document.getElementById('playlist-modal').style.display === 'block') {
                    this.hidePlaylistModal();
                } else if (document.getElementById('add-to-playlist-modal').style.display === 'block') {
                    this.hideAddToPlaylistModal();
                } else if (this.currentView === 'library') {
                    this.clearSearch();
                }
                break;

            case 'Digit1': // Switch to Library
                this.switchView('library');
                this.showNotification('📚 Biblioteca');
                break;

            case 'Digit2': // Switch to Playlists
                this.switchView('playlists');
                this.showNotification('📋 Playlists');
                break;

            case 'Digit3': // Switch to Favorites
                this.switchView('favorites');
                this.showNotification('❤️ Favoritas');
                break;            case 'Digit4': // Switch to Settings
                this.switchView('settings');
                this.showNotification('⚙️ Configurações');
                break;

            case 'Slash': // Show keyboard help (? key)
                if (e.shiftKey) { // Shift + / = ?
                    this.showKeyboardHelp();
                    this.showNotification('❓ Ajuda de atalhos');
                }
                break;
        }
    }

    setupFocusManagement() {
        // Add focus indicators for better accessibility
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
                    <h3><i class="fas fa-keyboard"></i> Atalhos do Teclado</h3>
                    <button class="keyboard-help-close close-help">&times;</button>
                </div>
                <div class="keyboard-shortcuts">
                    <div class="shortcut-group">
                        <h4><i class="fas fa-play"></i> Controles de Reprodução</h4>
                        <div class="shortcut-list">
                            <div class="shortcut-item">
                                <span class="shortcut-key">Space</span>
                                <span class="shortcut-description">Play/Pause</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">←</span>
                                <span class="shortcut-description">Música anterior</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">→</span>
                                <span class="shortcut-description">Próxima música</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">↑</span>
                                <span class="shortcut-description">Aumentar volume</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">↓</span>
                                <span class="shortcut-description">Diminuir volume</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">M</span>
                                <span class="shortcut-description">Silenciar/Ativar som</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="shortcut-group">
                        <h4><i class="fas fa-cog"></i> Funcionalidades</h4>
                        <div class="shortcut-list">
                            <div class="shortcut-item">
                                <span class="shortcut-key">S</span>
                                <span class="shortcut-description">Alternar modo aleatório</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">R</span>
                                <span class="shortcut-description">Alternar repetição</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">L</span>
                                <span class="shortcut-description">Curtir música atual</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">F</span>
                                <span class="shortcut-description">Focar na busca</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">P</span>
                                <span class="shortcut-description">Nova playlist</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="shortcut-group">
                        <h4><i class="fas fa-compass"></i> Navegação</h4>
                        <div class="shortcut-list">
                            <div class="shortcut-item">
                                <span class="shortcut-key">1</span>
                                <span class="shortcut-description">Biblioteca</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">2</span>
                                <span class="shortcut-description">Playlists</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">3</span>
                                <span class="shortcut-description">Favoritas</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">4</span>
                                <span class="shortcut-description">Configurações</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">Esc</span>
                                <span class="shortcut-description">Fechar modais/Limpar busca</span>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-key">?</span>
                                <span class="shortcut-description">Mostrar esta ajuda</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--bg-light);">
                    <button class="btn btn-primary close-help">
                        <i class="fas fa-check"></i> Entendi!
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(helpModal);
        
        // Close handlers
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

        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(helpModal);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    // Enhanced error handling for file operations
    handleFileError(error, filename) {
        console.error('File error:', error, filename);
        let message = 'Erro ao processar arquivo';
        
        if (filename) {
            message += `: ${filename}`;
        }
        
        if (error.name === 'NotReadableError') {
            message = 'Arquivo não pode ser lido. Verifique se o arquivo não está corrompido.';
        } else if (error.name === 'SecurityError') {
            message = 'Erro de segurança ao acessar o arquivo.';
        } else if (error.name === 'NotFoundError') {
            message = 'Arquivo não encontrado.';
        }
        
        this.showNotification(message);
    }

    // Loading state management
    showLoadingState(message = 'Carregando...') {
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

    // Performance optimization for large libraries
    optimizeForLargeLibrary() {
        if (this.allSongs.length > 1000) {
            // Implement virtual scrolling for very large libraries
            this.showNotification(`📚 Biblioteca grande detectada (${this.allSongs.length} músicas). Otimizando performance...`);
            
            // Limit initial render to first 100 songs
            this.songs = this.allSongs.slice(0, 100);
            this.currentPlaylist = [...this.songs];
            
            // Add load more functionality
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

    // Playlist export/import functionality
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
                    
                    // Validate import data
                    if (!data.name || !Array.isArray(data.songs)) {
                        throw new Error('Formato de arquivo inválido');
                    }
                    
                    // Check if playlist name already exists
                    let playlistName = data.name;
                    let counter = 1;
                    while (this.playlists.some(p => p.name === playlistName)) {
                        playlistName = `${data.name} (${counter})`;
                        counter++;
                    }
                    
                    const newPlaylist = {
                        name: playlistName,
                        songs: [], // Songs will need to be matched manually
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

    // Add ARIA labels and accessibility improvements
    enhanceAccessibility() {
        // Add ARIA labels to controls
        const controls = {
            'play-pause-btn': 'Reproduzir ou pausar música',
            'prev-btn': 'Música anterior',
            'next-btn': 'Próxima música',
            'shuffle-btn': 'Alternar modo aleatório',
            'repeat-btn': 'Alternar repetição',
            'like-btn': 'Curtir música atual',
            'volume-btn': 'Silenciar ou ativar som',
            'volume-slider': 'Controle de volume',
            'progress-slider': 'Progresso da música',
            'search-input': 'Buscar músicas, artistas ou álbuns'
        };
        
        Object.entries(controls).forEach(([id, label]) => {
            const element = document.getElementById(id);
            if (element) {
                element.setAttribute('aria-label', label);
            }
        });
        
        // Add role attributes
        document.querySelector('.music-grid')?.setAttribute('role', 'grid');
        document.querySelector('.nav-menu')?.setAttribute('role', 'navigation');
        document.querySelector('.player-controls')?.setAttribute('role', 'toolbar');
        
        // Add live region for notifications
        const notification = document.getElementById('notification');
        if (notification) {
            notification.setAttribute('role', 'status');
            notification.setAttribute('aria-live', 'polite');
        }
    }
}

// Initialize the music player when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MusicPlayer();
});
