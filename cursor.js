/* ==============================================
   SoundWave – Cursor Follower Effect
   ==============================================
   Smooth glowing orb that follows the mouse cursor
   with a soft delay. Enlarges on interactive elements.
   ============================================== */

(function () {
  'use strict';

  const dot = document.getElementById('cursor-dot');
  const glow = document.getElementById('cursor-glow');

  if (!dot || !glow) return;

  // Track mouse position
  let mouseX = -100;
  let mouseY = -100;

  // Smoothed positions
  let dotX = -100;
  let dotY = -100;
  let glowX = -100;
  let glowY = -100;

  // Lerp factor (0–1) — lower = smoother/slower
  const DOT_SPEED = 0.25;
  const GLOW_SPEED = 0.12;

  // Interactive element selectors
  const HOVER_SELECTORS = [
    '.song-card:not(.scheduled)',
    '.card-play-btn',
    '.btn-icon',
    '.btn-play',
    '.btn-like',
    '.chip',
    '.nav-link',
    '.logo',
    '.search-box',
    'a',
    'button:not(.song-card.scheduled button)',
    'input',
  ].join(',');

  let isHovering = false;

  // Update mouse coordinates
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Detect hover on interactive elements
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(HOVER_SELECTORS)) {
      isHovering = true;
      dot.classList.add('hovering');
      glow.classList.add('hovering');
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(HOVER_SELECTORS)) {
      isHovering = false;
      dot.classList.remove('hovering');
      glow.classList.remove('hovering');
    }
  });

  // Hide cursor elements when mouse leaves the window
  document.addEventListener('mouseleave', () => {
    dot.style.opacity = '0';
    glow.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    dot.style.opacity = '1';
    glow.style.opacity = '1';
  });

  // Smooth animation loop
  function animate() {
    // Lerp toward mouse
    dotX += (mouseX - dotX) * DOT_SPEED;
    dotY += (mouseY - dotY) * DOT_SPEED;
    glowX += (mouseX - glowX) * GLOW_SPEED;
    glowY += (mouseY - glowY) * GLOW_SPEED;

    dot.style.left = dotX + 'px';
    dot.style.top = dotY + 'px';
    glow.style.left = glowX + 'px';
    glow.style.top = glowY + 'px';

    requestAnimationFrame(animate);
  }

  // Check for touch device — disable cursor follower
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouchDevice) {
    animate();
  } else {
    dot.style.display = 'none';
    glow.style.display = 'none';
  }
})();
