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
    realDuration: 0, // populated from audio.duration via loadedmetadata/durationchange
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

  /** Check if a song has been released yet */
  function isSongReleased(song) {
    if (!song.releaseDate) return true;
    return new Date(song.releaseDate) <= new Date();
  }

  /** Compute countdown parts from a future date */
  function getCountdownParts(releaseDate) {
    const diff = Math.max(0, new Date(releaseDate) - new Date());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  }

  // -------- Countdown Timer --------
  let countdownInterval = null;

  function startCountdownTimers() {
    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      const els = document.querySelectorAll('.card-countdown[data-release]');
      if (els.length === 0) { clearInterval(countdownInterval); return; }
      els.forEach((el) => {
        const release = el.dataset.release;
        if (new Date(release) <= new Date()) {
          // Song just became available — re-render
          clearInterval(countdownInterval);
          renderSongs();
          return;
        }
        const p = getCountdownParts(release);
        el.querySelector('.cd-days').textContent = String(p.days).padStart(2, '0');
        el.querySelector('.cd-hours').textContent = String(p.hours).padStart(2, '0');
        el.querySelector('.cd-minutes').textContent = String(p.minutes).padStart(2, '0');
        el.querySelector('.cd-seconds').textContent = String(p.seconds).padStart(2, '0');
      });
    }, 1000);
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

    let hasCountdown = false;

    state.filteredSongs.forEach((song, idx) => {
      const released = isSongReleased(song);
      const card = document.createElement('div');
      card.className = 'song-card';
      card.dataset.index = idx;
      if (released && state.currentIndex === idx && state.isPlaying) card.classList.add('playing');
      if (!released) card.classList.add('scheduled');

      const delay = idx * 0.05;
      card.style.animationDelay = `${delay}s`;

      if (released) {
        // --- Normal released card ---
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
            <div class="playing-bars"><span></span><span></span><span></span><span></span></div>
            <span class="card-duration">${formatTime(song.duration)}</span>
          </div>
        `;
        card.addEventListener('click', () => playSong(idx));
      } else {
        // --- Scheduled / unreleased card with countdown ---
        hasCountdown = true;
        const p = getCountdownParts(song.releaseDate);
        card.innerHTML = `
          <div class="card-cover-wrap">
            <img src="${song.coverUrl}" alt="${song.title}" loading="lazy"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><rect fill=%22%231a1a28%22 width=%22200%22 height=%22200%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%236a6a82%22 font-size=%2240%22>♪</text></svg>'" />
            <span class="scheduled-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Yakında
            </span>
          </div>
          <div class="card-title" title="${song.title}">${song.title}</div>
          <div class="card-artist" title="${song.artist}">${song.artist}</div>
          <div class="card-countdown" data-release="${song.releaseDate}">
            <div class="countdown-unit"><span class="countdown-value cd-days">${String(p.days).padStart(2, '0')}</span><span class="countdown-label">Gün</span></div>
            <div class="countdown-unit"><span class="countdown-value cd-hours">${String(p.hours).padStart(2, '0')}</span><span class="countdown-label">Saat</span></div>
            <div class="countdown-unit"><span class="countdown-value cd-minutes">${String(p.minutes).padStart(2, '0')}</span><span class="countdown-label">Dk</span></div>
            <div class="countdown-unit"><span class="countdown-value cd-seconds">${String(p.seconds).padStart(2, '0')}</span><span class="countdown-label">Sn</span></div>
          </div>
        `;
      }

      dom.songsGrid.appendChild(card);
    });

    if (hasCountdown) startCountdownTimers();

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
    // Block playback for unreleased songs
    if (!isSongReleased(song)) return;

    state.currentIndex = filteredIndex;
    state.isPlaying = true;
    state.useRealAudio = false;
    state.realDuration = 0; // reset – will be set by loadedmetadata/durationchange

    // Stop any previous demo progress
    stopDemoProgress();

    // Remove crossOrigin to avoid CORS preflight issues with Blob Storage
    dom.audio.removeAttribute('crossorigin');
    dom.audio.src = song.audioUrl;
    dom.audio.load();

    // Listen for successful load to detect real audio
    const onCanPlay = () => {
      state.useRealAudio = true;
      stopDemoProgress();
      dom.audio.removeEventListener('canplaythrough', onCanPlay);
      dom.audio.removeEventListener('error', onError);
    };

    const onError = () => {
      // Audio failed (placeholder) – fall back to demo progress
      console.warn('Audio kaynağı yüklenemedi (placeholder). Demo modunda devam ediliyor.');
      state.useRealAudio = false;
      startDemoProgress(song.duration);
      dom.audio.removeEventListener('canplaythrough', onCanPlay);
      dom.audio.removeEventListener('error', onError);
    };

    dom.audio.addEventListener('canplaythrough', onCanPlay, { once: true });
    dom.audio.addEventListener('error', onError, { once: true });

    dom.audio.play().catch(() => {
      // Autoplay might be blocked – user interaction will resume
      if (!state.useRealAudio) {
        startDemoProgress(song.duration);
      }
    });

    // Update player UI
    dom.playerCover.src = song.coverUrl;
    dom.playerTitle.textContent = song.title;
    dom.playerArtist.textContent = song.artist;
    // Show JSON duration as placeholder until real duration arrives
    dom.timeTotal.textContent = formatTime(song.duration);

    updatePlayButton(true);
    highlightCurrentCard();
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
      dom.audio.play().catch(() => { });
    } else {
      dom.audio.pause();
    }

    // Resume/pause demo progress for placeholder tracks
    if (!state.useRealAudio && state.isPlaying && demoInterval === null) {
      const song = state.filteredSongs[state.currentIndex];
      if (song) {
        demoInterval = setInterval(() => {
          if (!state.isPlaying) return;
          demoTime += 0.5;
          const pct = Math.min((demoTime / song.duration) * 100, 100);
          dom.progressBar.style.width = `${pct}%`;
          dom.timeCurrent.textContent = formatTime(demoTime);
          if (demoTime >= song.duration) {
            clearInterval(demoInterval);
            demoInterval = null;
            handleTrackEnd();
          }
        }, 500);
      }
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
    // If more than 3 seconds in, restart current track
    const currentTime = state.useRealAudio ? dom.audio.currentTime : demoTime;
    if (currentTime > 3) {
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

  // -------- Progress Bar Interaction (drag + click) --------
  let isDraggingProgress = false;

  function getProgressPercent(e) {
    const rect = dom.progressWrap.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  /** Returns the authoritative duration for the current track.
   *  For real audio  → state.realDuration (from audio element)
   *  For demo/placeholder → song.duration (from JSON) */
  function getActiveDuration() {
    if (state.useRealAudio && state.realDuration > 0) return state.realDuration;
    const song = state.filteredSongs[state.currentIndex];
    return song ? song.duration : 0;
  }

  function seekToPercent(pct) {
    if (state.currentIndex === -1) return;
    const duration = getActiveDuration();
    if (duration <= 0) return;

    if (state.useRealAudio) {
      dom.audio.currentTime = pct * duration;
    } else {
      demoTime = pct * duration;
    }
    dom.progressBar.style.width = `${pct * 100}%`;
    dom.timeCurrent.textContent = formatTime(pct * duration);
  }

  function handleProgressDragStart(e) {
    e.preventDefault();
    isDraggingProgress = true;
    // Show the handle while dragging
    dom.progressWrap.classList.add('dragging');
    seekToPercent(getProgressPercent(e));

    const onMove = (ev) => {
      if (!isDraggingProgress) return;
      ev.preventDefault();
      seekToPercent(getProgressPercent(ev));
    };

    const onEnd = () => {
      isDraggingProgress = false;
      dom.progressWrap.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  }

  // -------- Volume --------
  let currentVolume = 0.7;

  function setVolumeFromPercent(pct) {
    currentVolume = pct;
    dom.audio.volume = pct;
    dom.volumeBar.style.width = `${pct * 100}%`;
    updateVolumeIcon();
  }

  function handleVolumeDragStart(e) {
    e.preventDefault();
    const getVolPct = (ev) => {
      const rect = dom.volumeWrap.getBoundingClientRect();
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    };
    setVolumeFromPercent(getVolPct(e));

    const onMove = (ev) => {
      ev.preventDefault();
      setVolumeFromPercent(getVolPct(ev));
    };

    const onEnd = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
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

    // Progress bar – click + drag support
    dom.progressWrap.addEventListener('mousedown', handleProgressDragStart);
    dom.progressWrap.addEventListener('touchstart', handleProgressDragStart, { passive: false });

    // Volume bar – click + drag support
    dom.volumeWrap.addEventListener('mousedown', handleVolumeDragStart);
    dom.volumeWrap.addEventListener('touchstart', handleVolumeDragStart, { passive: false });

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
      if (!state.useRealAudio || isDraggingProgress) return;
      const duration = getActiveDuration();
      if (duration <= 0) return;
      const pct = (dom.audio.currentTime / duration) * 100;
      dom.progressBar.style.width = `${pct}%`;
      dom.timeCurrent.textContent = formatTime(dom.audio.currentTime);
    });

    // Update state.realDuration from the audio element
    const onDurationReady = () => {
      const d = dom.audio.duration;
      if (d && isFinite(d) && !isNaN(d) && d > 0) {
        state.realDuration = d;
        dom.timeTotal.textContent = formatTime(d);
        if (state.useRealAudio) {
          stopDemoProgress();
        }
      }
    };
    dom.audio.addEventListener('loadedmetadata', onDurationReady);
    // durationchange fires when duration becomes known or changes (covers edge cases)
    dom.audio.addEventListener('durationchange', onDurationReady);
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
