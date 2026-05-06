/* ==============================================
   SoundWave – Interactive Particle Network
   ==============================================
   Two-canvas approach for blur-reveal effect:
   - Canvas 1 (blur): CSS filter: blur(6px), always visible
   - Canvas 2 (sharp): CSS mask-image follows mouse,
     revealing clear particles like a flashlight
   Both share the same particle state for consistency.
   ============================================== */

(function () {
  'use strict';

  const blurCanvas = document.getElementById('particle-canvas-blur');
  const sharpCanvas = document.getElementById('particle-canvas-sharp');
  if (!blurCanvas || !sharpCanvas) return;

  const bCtx = blurCanvas.getContext('2d');
  const sCtx = sharpCanvas.getContext('2d');

  // -------- Config --------
  const PARTICLE_COUNT = 70;
  const CONNECTION_DIST = 140;
  const PARTICLE_SPEED = 0.3;
  const PARTICLE_MIN_R = 1;
  const PARTICLE_MAX_R = 2.2;
  const REVEAL_RADIUS = 180; // px – flashlight radius
  const LINE_OPACITY = 0.12;
  const DOT_OPACITY = 0.35;

  // -------- State --------
  let particles = [];
  let mouseX = -9999;
  let mouseY = -9999;
  let width = 0;
  let height = 0;
  let dpr = 1;

  // -------- Resize --------
  function resize() {
    dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;

    blurCanvas.width = width * dpr;
    blurCanvas.height = height * dpr;
    blurCanvas.style.width = width + 'px';
    blurCanvas.style.height = height + 'px';
    bCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    sharpCanvas.width = width * dpr;
    sharpCanvas.height = height * dpr;
    sharpCanvas.style.width = width + 'px';
    sharpCanvas.style.height = height + 'px';
    sCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // -------- Init particles --------
  function initParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * PARTICLE_SPEED * 2,
        vy: (Math.random() - 0.5) * PARTICLE_SPEED * 2,
        r: PARTICLE_MIN_R + Math.random() * (PARTICLE_MAX_R - PARTICLE_MIN_R),
      });
    }
  }

  // -------- Update --------
  function updateParticles() {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;
    }
  }

  // -------- Draw to a given context --------
  function drawParticles(ctx) {
    ctx.clearRect(0, 0, width, height);

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONNECTION_DIST) {
          const alpha = (1 - dist / CONNECTION_DIST) * LINE_OPACITY;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    // Draw dots
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${DOT_OPACITY})`;
      ctx.fill();
    }
  }

  // -------- Update mask position (flashlight) --------
  function updateMask() {
    const grad = `radial-gradient(circle ${REVEAL_RADIUS}px at ${mouseX}px ${mouseY}px, rgba(0,0,0,1) 0%, rgba(0,0,0,0.15) 65%, transparent 100%)`;
    sharpCanvas.style.maskImage = grad;
    sharpCanvas.style.webkitMaskImage = grad;
  }

  // -------- Animation loop --------
  function animate() {
    updateParticles();
    drawParticles(bCtx);
    drawParticles(sCtx);
    updateMask();
    requestAnimationFrame(animate);
  }

  // -------- Events --------
  window.addEventListener('resize', () => {
    resize();
    initParticles();
  });

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  document.addEventListener('mouseleave', () => {
    mouseX = -9999;
    mouseY = -9999;
  });

  // -------- Start --------
  // Check for touch device — reduce particles
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouchDevice) {
    // Still show particles on mobile but fewer, no flashlight
    blurCanvas.style.opacity = '0.25';
    sharpCanvas.style.display = 'none';
  }

  resize();
  initParticles();
  animate();
})();
