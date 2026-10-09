/**
 * High-resolution timer module for Pinch & Puzzle.
 * Uses performance.now() and requestAnimationFrame for smooth 60fps display updates.
 */

(function(global) {
  'use strict';

  /**
   * Creates a high-resolution timer bound to a display element.
   * @param {HTMLElement} displayElement - Element whose textContent will show elapsed time.
   * @returns {{ start: () => void, stop: () => number, reset: () => void, getElapsed: () => number }}
   */
  function createTimer(displayElement) {
    let startTime = null;
    let elapsedBeforePause = 0;
    let animationFrameId = null;
    let running = false;

    /**
     * Formats elapsed seconds into a human-readable string.
     * @param {number} seconds
     * @returns {string} Formatted string like '0.0s', '9.3s', '12.4s'
     */
    function formatTime(seconds) {
      return `${seconds.toFixed(1)}s`;
    }

    /**
     * The animation loop that updates the display element every frame.
     */
    function tick() {
      if (!running) return;

      const now = performance.now();
      const currentElapsed = elapsedBeforePause + (now - startTime) / 1000;

      if (displayElement) {
        displayElement.textContent = formatTime(currentElapsed);
      }

      animationFrameId = requestAnimationFrame(tick);
    }

    /**
     * Starts the timer. If already running, this is a no-op.
     */
    function start() {
      if (running) return;

      running = true;
      startTime = performance.now();
      animationFrameId = requestAnimationFrame(tick);
    }

    /**
     * Stops the timer and returns the elapsed time in seconds (1 decimal place).
     * If not running, returns the current accumulated elapsed time.
     * @returns {number} Elapsed seconds rounded to 1 decimal place.
     */
    function stop() {
      if (!running) {
        return parseFloat(elapsedBeforePause.toFixed(1));
      }

      running = false;

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      const now = performance.now();
      elapsedBeforePause += (now - startTime) / 1000;
      startTime = null;

      // Final display update
      if (displayElement) {
        displayElement.textContent = formatTime(elapsedBeforePause);
      }

      return parseFloat(elapsedBeforePause.toFixed(1));
    }

    /**
     * Resets the timer to zero, stops any running animation, and clears the display.
     */
    function reset() {
      running = false;

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      startTime = null;
      elapsedBeforePause = 0;

      if (displayElement) {
        displayElement.textContent = '0.0s';
      }
    }

    /**
     * Returns the current elapsed time in seconds without stopping the timer.
     * @returns {number} Current elapsed seconds.
     */
    function getElapsed() {
      if (running && startTime !== null) {
        const now = performance.now();
        return elapsedBeforePause + (now - startTime) / 1000;
      }
      return elapsedBeforePause;
    }

    // Initialize display
    if (displayElement) {
      displayElement.textContent = '0.0s';
    }

    return { start, stop, reset, getElapsed };
  }

  // Expose globally
  global.createTimer = createTimer;

})(window);