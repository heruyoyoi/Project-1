// Variabel Global
let currentTab = 'local';
let currentAudio = null;
let youtubePlayer = null;
let currentTrack = { title: '', artist: '' };

// Elemen DOM
const tabContents = document.querySelectorAll('.tab-content');
const tabButtons = document.querySelectorAll('.tab-btn');
const localPlaylist = document.getElementById('local-playlist');
const youtubeResults = document.getElementById('youtube-results');
const fileInput = document.getElementById('file-input');
const youtubeSearch = document.getElementById('youtube-search');
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

// Tab Navigation
tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    button.classList.add('active');
    currentTab = button.dataset.tab;
    document.getElementById(currentTab).classList.add('active');
  });
});

// Local Music Handling
fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  localPlaylist.innerHTML = '';
  
  files.forEach(file => {
    const li = document.createElement('li');
    li.textContent = file.name.replace(/\.[^/.]+$/, ''); // Remove file extension
    li.addEventListener('click', () => playLocalFile(file));
    localPlaylist.appendChild(li);
  });
});

function playLocalFile(file) {
  if (currentAudio) {
    currentAudio.pause();
  }
  
  currentAudio = new Audio(URL.createObjectURL(file));
  currentTrack = { title: file.name.replace(/\.[^/.]+$/, ''), artist: 'Unknown' };
  updateTrackInfo();
  fetchLyrics(currentTrack.title, currentTrack.artist);
  
  currentAudio.addEventListener('timeupdate', updateProgressBar);
  currentAudio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(currentAudio.duration);
  });
  
  currentAudio.play();
  playBtn.textContent = '⏸';
}

// YouTube Integration
function onYouTubeIframeAPIReady() {
  youtubePlayer = new YT.Player('youtube-player', {
    height: '0',
    width: '0',
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerReady(event) {
  console.log('YouTube Player Ready');
}

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    setInterval(updateYouTubeProgress, 1000);
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

searchBtn.addEventListener('click', () => {
  const query = youtubeSearch.value.trim();
  if (query) {
    searchYouTube(query);
  }
});

function searchYouTube(query) {
  // Note: In a real app, you'd use YouTube Data API with a backend to avoid exposing API keys
  // This is a simplified version for demo purposes
  youtubeResults.innerHTML = '<li>Searching...</li>';
  
  // Mock search results (replace with actual API call)
  setTimeout(() => {
    youtubeResults.innerHTML = `
      <li data-video-id="dQw4w9WgXcQ">Rick Astley - Never Gonna Give You Up</li>
      <li data-video-id="9bZkp7q19f0">PSY - GANGNAM STYLE</li>
    `;
    
    const items = youtubeResults.querySelectorAll('li');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const videoId = item.dataset.videoId;
        playYouTubeVideo(videoId);
        currentTrack = { 
          title: item.textContent.split('-')[1].trim(),
          artist: item.textContent.split('-')[0].trim()
        };
        updateTrackInfo();
        fetchLyrics(currentTrack.title, currentTrack.artist);
      });
    });
  }, 1000);
}

function playYouTubeVideo(videoId) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  
  youtubePlayer.loadVideoById(videoId);
  playBtn.textContent = '⏸';
}

// Player Controls
playBtn.addEventListener('click', () => {
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
});

progressBar.addEventListener('input', () => {
  if (currentTab === 'local' && currentAudio) {
    currentAudio.currentTime = (progressBar.value / 100) * currentAudio.duration;
  } else if (currentTab === 'youtube' && youtubePlayer) {
    youtubePlayer.seekTo((progressBar.value / 100) * youtubePlayer.getDuration());
  }
});

// Lyrics Fetching
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

// Helper Functions
function updateTrackInfo() {
  currentTrackEl.textContent = currentTrack.title;
  currentArtistEl.textContent = currentTrack.artist;
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