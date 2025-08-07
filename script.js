// ==================================
// Global Variables & DOM Elements
// ==================================
let currentTab = 'local';
let currentAudio = null;
let youtubePlayer = null;
let currentTrack = { title: 'No track selected', artist: '' };
let playlist = []; 
let currentTrackIndex = -1;

// DOM Elements
const tabContents = document.querySelectorAll('.tab-content');
const tabButtons = document.querySelectorAll('.tab-btn');
const localPlaylistEl = document.getElementById('local-playlist');
const youtubeResultsEl = document.getElementById('youtube-results');
const fileInput = document.getElementById('file-input');
const youtubeSearchInput = document.getElementById('Youtube');
const searchBtn = document.getElementById('search-btn');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const progressBar = document.getElementById('progress-bar');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const currentTrackEl = document.getElementById('current-track');
const currentArtistEl = document.getElementById('current-artist');
const lyricsEl = document.getElementById('lyrics');
const youtubePlayerEl = document.getElementById('youtube-player');


// ==================================
// Event Listeners
// ==================================

// Tab Navigation
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        button.classList.add('active');
        currentTab = button.dataset.tab;
        document.getElementById(currentTab).classList.add('active');
        
        stopPlayback();
    });
});

// Local Music Handling
fileInput.addEventListener('change', (e) => {
    playlist = Array.from(e.target.files).map(file => ({
        type: 'local',
        file: file,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Unknown Artist'
    }));
    renderPlaylist(localPlaylistEl, playlist);
});

// Player Controls
playBtn.addEventListener('click', () => {
    if (currentTrackIndex === -1 && playlist.length > 0) {
        playTrack(0);
    } else {
        togglePlayPause();
    }
});

prevBtn.addEventListener('click', () => {
    if (currentTrackIndex > 0) {
        playTrack(currentTrackIndex - 1);
    }
});

nextBtn.addEventListener('click', () => {
    if (currentTrackIndex < playlist.length - 1) {
        playTrack(currentTrackIndex + 1);
    }
});

progressBar.addEventListener('input', () => {
    if (currentTab === 'local' && currentAudio) {
        currentAudio.currentTime = (progressBar.value / 100) * currentAudio.duration;
    } else if (currentTab === 'youtube' && youtubePlayer) {
        youtubePlayer.seekTo((progressBar.value / 100) * youtubePlayer.getDuration());
    }
});

// YouTube Integration
searchBtn.addEventListener('click', () => {
    const query = youtubeSearchInput.value.trim();
    if (query) {
        searchYouTube(query);
    }
});

// ==================================
// Core Functions
// ==================================

function stopPlayback() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    if (youtubePlayer) {
        youtubePlayer.stopVideo();
    }
    playBtn.textContent = '⏵';
    currentTrackIndex = -1;
    updateTrackInfo({ title: 'No track selected', artist: '' });
    lyricsEl.textContent = 'No lyrics available.';
    progressBar.value = 0;
    currentTimeEl.textContent = '0:00';
    durationEl.textContent = '0:00';
}

function togglePlayPause() {
    if (currentTab === 'local' && currentAudio) {
        if (currentAudio.paused) {
            currentAudio.play();
            playBtn.textContent = '⏸';
        } else {
            currentAudio.pause();
            playBtn.textContent = '⏵';
        }
    } else if (currentTab === 'youtube' && youtubePlayer) {
        const state = youtubePlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            youtubePlayer.pauseVideo();
            playBtn.textContent = '⏵';
        } else {
            youtubePlayer.playVideo();
            playBtn.textContent = '⏸';
        }
    }
}

function playTrack(index) {
    stopPlayback();
    
    currentTrackIndex = index;
    const track = playlist[index];
    
    if (track.type === 'local') {
        currentAudio = new Audio(URL.createObjectURL(track.file));
        currentAudio.addEventListener('timeupdate', updateProgressBar);
        currentAudio.addEventListener('loadedmetadata', () => {
            durationEl.textContent = formatTime(currentAudio.duration);
        });
        currentAudio.addEventListener('ended', () => {
            playNextTrack();
        });
        currentAudio.play();
    } else if (track.type === 'youtube') {
        youtubePlayer.loadVideoById(track.id);
    }
    
    updateTrackInfo(track);
    fetchLyrics(track.title, track.artist);
    playBtn.textContent = '⏸';
}

function playNextTrack() {
    if (currentTrackIndex < playlist.length - 1) {
        playTrack(currentTrackIndex + 1);
    } else {
        stopPlayback();
    }
}

// ==================================
// Helper Functions
// ==================================

function renderPlaylist(element, tracks) {
    element.innerHTML = '';
    tracks.forEach((track, index) => {
        const li = document.createElement('li');
        li.textContent = `${track.title} - ${track.artist}`;
        li.addEventListener('click', () => playTrack(index));
        element.appendChild(li);
    });
}

function updateTrackInfo(track) {
    currentTrackEl.textContent = track.title;
    currentArtistEl.textContent = track.artist;
}

function updateProgressBar() {
    if (currentAudio) {
        progressBar.value = (currentAudio.currentTime / currentAudio.duration) * 100;
        currentTimeEl.textContent = formatTime(currentAudio.currentTime);
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

async function fetchLyrics(title, artist) {
    lyricsEl.textContent = 'Loading lyrics...';
    
    try {
        const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
        const data = await response.json();
        
        if (data.lyrics) {
            lyricsEl.textContent = data.lyrics;
        } else {
            lyricsEl.textContent = 'No lyrics found.';
        }
    } catch (error) {
        lyricsEl.textContent = 'Failed to load lyrics.';
        console.error(error);
    }
}

// ==================================
// YouTube API Integration
// ==================================

function onYouTubeIframeAPIReady() {
    youtubePlayer = new YT.Player(youtubePlayerEl, {
        height: '0',
        width: '0',
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        setInterval(updateYouTubeProgress, 1000);
        playBtn.textContent = '⏸';
    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        playBtn.textContent = '⏵';
        if (event.data === YT.PlayerState.ENDED) {
            playNextTrack();
        }
    }
}

function updateYouTubeProgress() {
    if (youtubePlayer && youtubePlayer.getCurrentTime) {
        const currentTime = youtubePlayer.getCurrentTime();
        const duration = youtubePlayer.getDuration();
        progressBar.value = (currentTime / duration) * 100;
        currentTimeEl.textContent = formatTime(currentTime);
        durationEl.textContent = formatTime(duration);
    }
}

async function searchYouTube(query) {
    youtubeResultsEl.innerHTML = '<li>Searching...</li>';
    
    // PENTING: API Key YouTube tidak boleh diekspos di frontend!
    // Ini hanyalah contoh. Dalam aplikasi nyata, gunakan backend.
    const apiKey = 'YOUR_YOUTUBE_API_KEY';
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.items.length > 0) {
            playlist = data.items.map(item => ({
                type: 'youtube',
                id: item.id.videoId,
                title: item.snippet.title,
                artist: item.snippet.channelTitle
            }));
            renderPlaylist(youtubeResultsEl, playlist);
        } else {
            youtubeResultsEl.innerHTML = '<li>No results found.</li>';
        }
    } catch (error) {
        youtubeResultsEl.innerHTML = '<li>Failed to search.</li>';
        console.error('Youtube error:', error);
    }
}