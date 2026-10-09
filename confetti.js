/**
 * Lightweight canvas-based confetti particle system for Pinch & Puzzle.
 * Fires a burst of colorful confetti particles that fall with gravity and fade out.
 */

(function(global) {
  'use strict';

  /** Confetti color palette */
  const COLORS = [
    '#FFD700', // gold
    '#7c3aed', // purple
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#f1f5f9', // white
  ];

  /** Total duration of the confetti animation in milliseconds */
  const ANIMATION_DURATION_MS = 5000;

  /** Duration of the fade-out phase in milliseconds */
  const FADE_OUT_DURATION_MS = 1500;

  /** Number of particles to spawn */
  const PARTICLE_COUNT = 150;

  /** Gravity acceleration in pixels per second² */
  const GRAVITY = 600;

  /** Air resistance / drag coefficient (0–1, lower = more drag) */
  const DRAG = 0.98;

  /**
   * Creates a single confetti particle with random properties.
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   * @returns {Object} Particle object
   */
  function createParticle(canvasWidth, canvasHeight) {
    // Spawn from top-center area with slight horizontal spread
    const spawnX = canvasWidth / 2 + (Math.random() - 0.5) * canvasWidth * 0.1;
    const spawnY = canvasHeight * 0.15;

    // Burst outward and upward
    const angle = Math.random() * Math.PI * 2;
    const speed = 200 + Math.random() * 500;

    return {
      x: spawnX,
      y: spawnY,
      vx: Math.cos(angle) * speed * (0.6 + Math.random() * 0.4),
      vy: -Math.abs(Math.sin(angle) * speed * (0.5 + Math.random() * 0.5)) - 100,
      width: 4 + Math.random() * 6,
      height: 6 + Math.random() * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      angularVelocity: (Math.random() - 0.5) * 10,
      opacity: 1,
    };
  }

  /**
   * Launches a confetti animation inside the given container element.
   * Creates a full-screen fixed canvas, fires ~150 particles, and auto-removes after 5 seconds.
   *
   * @param {HTMLElement} container - The DOM element to append the canvas to.
   * @returns {() => void} A cleanup function that removes the confetti immediately when called.
   */
  function launchConfetti(container) {
    if (!container) return function() {};

    // Create the canvas element
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.zIndex = '10000';
    canvas.style.pointerEvents = 'none';
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      canvas.remove();
      return function() {};
    }

    // Set canvas resolution to match display
    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle(window.innerWidth, window.innerHeight));
    }

    let animationFrameId = null;
    let startTime = performance.now();
    let lastFrameTime = startTime;
    let cleaned = false;

    /**
     * Removes the canvas and cleans up all resources.
     */
    function cleanup() {
      if (cleaned) return;
      cleaned = true;

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      window.removeEventListener('resize', resizeCanvas);

      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }

    /**
     * Main animation loop.
     * @param {number} now - Current timestamp from requestAnimationFrame
     */
    function animate(now) {
      if (cleaned) return;

      const elapsed = now - startTime;
      const dt = Math.min((now - lastFrameTime) / 1000, 0.05); // Cap delta to avoid spiral of death
      lastFrameTime = now;

      // Auto-remove after duration
      if (elapsed >= ANIMATION_DURATION_MS) {
        cleanup();
        return;
      }

      // Calculate global opacity for fade-out in the last phase
      let globalOpacity = 1;
      const timeRemaining = ANIMATION_DURATION_MS - elapsed;
      if (timeRemaining < FADE_OUT_DURATION_MS) {
        globalOpacity = timeRemaining / FADE_OUT_DURATION_MS;
      }

      // Clear canvas
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Apply gravity
        p.vy += GRAVITY * dt;

        // Apply drag
        p.vx *= DRAG;
        p.vy *= DRAG;

        // Update position
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Update rotation
        p.rotation += p.angularVelocity * dt;

        // Update opacity
        p.opacity = globalOpacity;

        // Draw the particle
        if (p.opacity <= 0) continue;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(animate);
    }

    // Start animation
    animationFrameId = requestAnimationFrame(animate);

    // Return the cleanup function for early removal
    return cleanup;
  }

  // Expose globally
  global.launchConfetti = launchConfetti;

})(window);