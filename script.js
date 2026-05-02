/* ==============================================
   SoundWave – Main Application Logic
   ==============================================
   Fetches songs from songs.json and powers the
   music player UI. No frameworks, pure vanilla JS.
   ============================================== */

(function () {
  'use strict';

  // -------- State --------
  const state = {
    songs: [],
    filteredSongs: [],
    currentIndex: -1,
    isPlaying: false,
    isShuffle: false,
    repeatMode: 0, // 0=off, 1=all, 2=one
    likedSongs: new Set(),
    currentGenre: 'all',
    searchQuery: '',
  };

  // -------- DOM References --------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    songsGrid: $('#songs-grid'),
    loadingState: $('#loading-state'),
    emptyState: $('#empty-state'),
    filterChips: $('.filter-chips'),
    searchInput: $('#search-input'),
    // Player
    audio: $('#audio-player'),
    playerCover: $('#player-cover'),
    playerTitle: $('#player-title'),
    playerArtist: $('#player-artist'),
    btnPlay: $('#btn-play'),
    btnPrev: $('#btn-prev'),
    btnNext: $('#btn-next'),
    btnShuffle: $('#btn-shuffle'),
    btnRepeat: $('#btn-repeat'),
    btnLike: $('#btn-like'),
    btnVolume: $('#btn-volume'),
    progressWrap: $('#progress-bar-wrap'),
    progressBar: $('#progress-bar'),
    timeCurrent: $('#time-current'),
    timeTotal: $('#time-total'),
    volumeWrap: $('#volume-bar-wrap'),
    volumeBar: $('#volume-bar'),
    iconPlay: $('.icon-play'),
    iconPause: $('.icon-pause'),
    iconVolHigh: $('.icon-vol-high'),
    iconVolMute: $('.icon-vol-mute'),
  };

  // -------- Utilities --------
  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // -------- Fetch Songs --------
  async function loadSongs() {
    try {
      const res = await fetch('songs.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.songs = await res.json();
      state.filteredSongs = [...state.songs];
      buildGenreFilters();
      renderSongs();
    } catch (err) {
      console.error('Şarkılar yüklenemedi:', err);
      dom.loadingState.innerHTML = `
        <svg style="width:48px;height:48px;color:var(--text-tertiary)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p style="color:var(--text-tertiary)">Şarkılar yüklenirken hata oluştu</p>
        <button onclick="location.reload()" style="margin-top:8px;padding:8px 20px;border-radius:100px;background:var(--accent);color:#000;font-weight:600;font-size:0.85rem;cursor:pointer;border:none">Tekrar Dene</button>
      `;
    }
  }

  // -------- Build Genre Filters --------
  function buildGenreFilters() {
    const genres = [...new Set(state.songs.map((s) => s.genre))];
    const container = dom.filterChips;
    // Keep the "Tümü" chip, add the rest
    genres.forEach((g) => {
      const btn = document.createElement('button');
      btn.className = 'chip';
      btn.dataset.genre = g;
      btn.textContent = g;
      container.appendChild(btn);
    });
  }

  // -------- Render Songs --------
  function renderSongs() {
    dom.loadingState.style.display = 'none';
    dom.emptyState.style.display = 'none';
    dom.songsGrid.innerHTML = '';

    if (state.filteredSongs.length === 0) {
      dom.emptyState.style.display = 'flex';
      return;
    }

    state.filteredSongs.forEach((song, idx) => {
      const card = document.createElement('div');
      card.className = 'song-card';
      card.dataset.index = idx;
      if (state.currentIndex === idx && state.isPlaying) card.classList.add('playing');

      const delay = idx * 0.05;
      card.style.animationDelay = `${delay}s`;

      card.innerHTML = `
        <div class="card-cover-wrap">
          <img src="${song.coverUrl}" alt="${song.title}" loading="lazy" 
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><rect fill=%22%231a1a28%22 width=%22200%22 height=%22200%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%236a6a82%22 font-size=%2240%22>♪</text></svg>'" />
          <button class="card-play-btn" title="Oynat">
            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="8,5 19,12 8,19"/></svg>
          </button>
        </div>
        <div class="card-title" title="${song.title}">${song.title}</div>
        <div class="card-artist" title="${song.artist}">${song.artist}</div>
        <div class="card-meta">
          <span class="card-genre">${song.genre}</span>
          <div class="playing-bars">
            <span></span><span></span><span></span><span></span>
          </div>
          <span class="card-duration">${formatTime(song.duration)}</span>
        </div>
      `;

      card.addEventListener('click', () => playSong(idx));
      dom.songsGrid.appendChild(card);
    });

    highlightCurrentCard();
  }

  // -------- Filter & Search --------
  function applyFilters() {
    let songs = [...state.songs];

    if (state.currentGenre !== 'all') {
      songs = songs.filter((s) => s.genre === state.currentGenre);
    }

    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      songs = songs.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.album.toLowerCase().includes(q)
      );
    }

    state.filteredSongs = songs;
    renderSongs();
  }

  // -------- Play Song --------
  function playSong(filteredIndex) {
    const song = state.filteredSongs[filteredIndex];
    if (!song) return;

    state.currentIndex = filteredIndex;
    state.isPlaying = true;

    // Update audio source
    dom.audio.src = song.audioUrl;
    dom.audio.play().catch(() => {
      // Audio may fail if placeholder – that's OK for demo
      console.warn('Audio kaynağı yüklenemedi (placeholder). Demo modunda devam ediliyor.');
    });

    // Update player UI
    dom.playerCover.src = song.coverUrl;
    dom.playerTitle.textContent = song.title;
    dom.playerArtist.textContent = song.artist;
    dom.timeTotal.textContent = formatTime(song.duration);

    updatePlayButton(true);
    highlightCurrentCard();

    // Simulate progress for demo if audio can't play
    startDemoProgress(song.duration);
  }

  // -------- Demo Progress (for placeholder audio) --------
  let demoInterval = null;
  let demoTime = 0;

  function startDemoProgress(duration) {
    clearInterval(demoInterval);
    demoTime = 0;

    demoInterval = setInterval(() => {
      if (!state.isPlaying) return;
      demoTime += 0.5;
      const pct = Math.min((demoTime / duration) * 100, 100);
      dom.progressBar.style.width = `${pct}%`;
      dom.timeCurrent.textContent = formatTime(demoTime);

      if (demoTime >= duration) {
        clearInterval(demoInterval);
        handleTrackEnd();
      }
    }, 500);
  }

  function stopDemoProgress() {
    clearInterval(demoInterval);
  }

  // -------- Player Controls --------
  function togglePlay() {
    if (state.currentIndex === -1) {
      if (state.filteredSongs.length > 0) playSong(0);
      return;
    }

    state.isPlaying = !state.isPlaying;
    updatePlayButton(state.isPlaying);

    if (state.isPlaying) {
      dom.audio.play().catch(() => {});
    } else {
      dom.audio.pause();
    }

    highlightCurrentCard();
  }

  function playNext() {
    if (state.filteredSongs.length === 0) return;
    let next;
    if (state.isShuffle) {
      next = Math.floor(Math.random() * state.filteredSongs.length);
    } else {
      next = (state.currentIndex + 1) % state.filteredSongs.length;
    }
    playSong(next);
  }

  function playPrev() {
    if (state.filteredSongs.length === 0) return;
    // If more than 3 seconds in, restart
    if (demoTime > 3) {
      playSong(state.currentIndex);
      return;
    }
    let prev;
    if (state.isShuffle) {
      prev = Math.floor(Math.random() * state.filteredSongs.length);
    } else {
      prev = (state.currentIndex - 1 + state.filteredSongs.length) % state.filteredSongs.length;
    }
    playSong(prev);
  }

  function handleTrackEnd() {
    if (state.repeatMode === 2) {
      playSong(state.currentIndex);
    } else if (state.repeatMode === 1) {
      playNext();
    } else {
      if (state.currentIndex < state.filteredSongs.length - 1) {
        playNext();
      } else {
        state.isPlaying = false;
        updatePlayButton(false);
        highlightCurrentCard();
      }
    }
  }

  function toggleShuffle() {
    state.isShuffle = !state.isShuffle;
    dom.btnShuffle.classList.toggle('active', state.isShuffle);
  }

  function toggleRepeat() {
    state.repeatMode = (state.repeatMode + 1) % 3;
    dom.btnRepeat.classList.toggle('active', state.repeatMode > 0);
    if (state.repeatMode === 2) {
      dom.btnRepeat.style.position = 'relative';
      if (!dom.btnRepeat.querySelector('.repeat-one')) {
        const badge = document.createElement('span');
        badge.className = 'repeat-one';
        badge.textContent = '1';
        badge.style.cssText =
          'position:absolute;top:-2px;right:-2px;font-size:9px;font-weight:800;color:var(--accent);';
        dom.btnRepeat.appendChild(badge);
      }
    } else {
      const badge = dom.btnRepeat.querySelector('.repeat-one');
      if (badge) badge.remove();
    }
  }

  function toggleLike() {
    if (state.currentIndex === -1) return;
    const song = state.filteredSongs[state.currentIndex];
    if (state.likedSongs.has(song.id)) {
      state.likedSongs.delete(song.id);
      dom.btnLike.classList.remove('liked');
    } else {
      state.likedSongs.add(song.id);
      dom.btnLike.classList.add('liked');
      // Heart pop animation
      dom.btnLike.style.transform = 'scale(1.3)';
      setTimeout(() => (dom.btnLike.style.transform = ''), 200);
    }
  }

  // -------- UI Updates --------
  function updatePlayButton(playing) {
    dom.iconPlay.style.display = playing ? 'none' : 'block';
    dom.iconPause.style.display = playing ? 'block' : 'none';
  }

  function highlightCurrentCard() {
    $$('.song-card').forEach((card, i) => {
      card.classList.toggle('playing', i === state.currentIndex && state.isPlaying);
    });
  }

  // -------- Progress Bar Interaction --------
  function handleProgressClick(e) {
    const rect = dom.progressWrap.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (state.currentIndex === -1) return;

    const song = state.filteredSongs[state.currentIndex];
    demoTime = pct * song.duration;
    dom.progressBar.style.width = `${pct * 100}%`;
    dom.timeCurrent.textContent = formatTime(demoTime);

    // Also seek real audio if loaded
    if (dom.audio.duration) {
      dom.audio.currentTime = pct * dom.audio.duration;
    }
  }

  // -------- Volume --------
  let currentVolume = 0.7;

  function handleVolumeClick(e) {
    const rect = dom.volumeWrap.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    currentVolume = pct;
    dom.audio.volume = pct;
    dom.volumeBar.style.width = `${pct * 100}%`;
    updateVolumeIcon();
  }

  function toggleMute() {
    if (dom.audio.volume > 0) {
      dom.audio.volume = 0;
      dom.volumeBar.style.width = '0%';
    } else {
      dom.audio.volume = currentVolume;
      dom.volumeBar.style.width = `${currentVolume * 100}%`;
    }
    updateVolumeIcon();
  }

  function updateVolumeIcon() {
    const muted = dom.audio.volume === 0;
    dom.iconVolHigh.style.display = muted ? 'none' : 'block';
    dom.iconVolMute.style.display = muted ? 'block' : 'none';
  }

  // -------- Keyboard Shortcuts --------
  function handleKeyboard(e) {
    // Don't capture if typing in search
    if (document.activeElement === dom.searchInput) return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowRight':
        e.preventDefault();
        playNext();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        playPrev();
        break;
      case 'KeyM':
        toggleMute();
        break;
      case 'KeyS':
        toggleShuffle();
        break;
      case 'KeyR':
        toggleRepeat();
        break;
    }
  }

  // -------- Event Listeners --------
  function bindEvents() {
    // Player controls
    dom.btnPlay.addEventListener('click', togglePlay);
    dom.btnNext.addEventListener('click', playNext);
    dom.btnPrev.addEventListener('click', playPrev);
    dom.btnShuffle.addEventListener('click', toggleShuffle);
    dom.btnRepeat.addEventListener('click', toggleRepeat);
    dom.btnLike.addEventListener('click', toggleLike);
    dom.btnVolume.addEventListener('click', toggleMute);

    // Progress & volume bars
    dom.progressWrap.addEventListener('click', handleProgressClick);
    dom.volumeWrap.addEventListener('click', handleVolumeClick);

    // Genre chips
    dom.filterChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      $$('.chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      state.currentGenre = chip.dataset.genre;
      state.currentIndex = -1;
      stopDemoProgress();
      applyFilters();
    });

    // Search
    dom.searchInput.addEventListener(
      'input',
      debounce(() => {
        state.searchQuery = dom.searchInput.value.trim();
        state.currentIndex = -1;
        stopDemoProgress();
        applyFilters();
      }, 250)
    );

    // Audio events (for real audio files)
    dom.audio.addEventListener('timeupdate', () => {
      if (!dom.audio.duration || isNaN(dom.audio.duration)) return;
      const pct = (dom.audio.currentTime / dom.audio.duration) * 100;
      dom.progressBar.style.width = `${pct}%`;
      dom.timeCurrent.textContent = formatTime(dom.audio.currentTime);
    });
    dom.audio.addEventListener('loadedmetadata', () => {
      if (dom.audio.duration && !isNaN(dom.audio.duration)) {
        dom.timeTotal.textContent = formatTime(dom.audio.duration);
        // Kill demo progress if real audio is loaded
        stopDemoProgress();
      }
    });
    dom.audio.addEventListener('ended', handleTrackEnd);

    // Keyboard
    document.addEventListener('keydown', handleKeyboard);

    // Nav links
    $$('.nav-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        $$('.nav-link').forEach((l) => l.classList.remove('active'));
        link.classList.add('active');
      });
    });
  }

  // -------- Init --------
  function init() {
    bindEvents();
    loadSongs();
  }

  // Start the app
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
