/**
 * gesture.js — Hand Gesture Detection Module for Pinch & Puzzle
 *
 * Uses MediaPipe Hands (loaded via CDN as window.Hands / window.Camera globals).
 *
 * Modes:
 *   'pinch'        — thumb+index pinch to draw a SQUARE selection box (camera view).
 *   'puzzle-pinch' — streams smoothed landmarks + pinch state every frame so
 *                    puzzle.js can draw the hand skeleton and drive pinch-drag.
 *
 * Accuracy improvements (v2):
 *   • One Euro Filter on landmark positions — removes jitter while staying
 *     responsive. β (speed coefficient) keeps fast moves accurate.
 *   • Separate EMA on pinch ratio with a lower alpha for a stable grab/release.
 *   • Hand-lost callback immediately resets the smoothing state so re-detection
 *     is clean.
 *   • Confidence thresholds raised to 0.80 / 0.75 for fewer false positives.
 *   • No-hand branch now notifies puzzle-pinch mode (null data → cancel grab).
 *
 * Camera lifecycle: MediaStream is NEVER stopped. Use pauseTracking() /
 * resumeTracking() so "Try Again" is instant with no permission prompt.
 */

(function(global) {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────────────

  const PINCH_START_THRESHOLD = 0.30;   // tighter: requires a clearer pinch
  const PINCH_END_THRESHOLD   = 0.42;   // hysteresis gap prevents accidental release
  const HAND_LOST_FRAME_LIMIT = 45;     // ~1.5 s — faster warning

  /** Minimum display-pixel size for each side of the selection square. */
  const MIN_BOX_PX = 60;

  // Landmark indices
  const THUMB_TIP  = 4;
  const INDEX_TIP  = 8;
  const WRIST      = 0;
  const MIDDLE_MCP = 9;

  // Pinch state machine
  const STATE_IDLE      = 'IDLE';
  const STATE_DRAWING   = 'DRAWING';
  const STATE_FINALIZED = 'FINALIZED';

  // MediaPipe hand connections
  const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [5, 9], [9, 13], [13, 17],
  ];

  // ── One Euro Filter ───────────────────────────────────────────────────────────
  // Removes high-frequency jitter while preserving fast intentional movement.
  // Reference: Géry Casiez et al., "1€ Filter", CHI 2012.

  class OneEuroFilter {
    /**
     * @param {number} freq    – input sample rate (fps, ~30)
     * @param {number} minCutoff – minimum cutoff frequency (lower = smoother at rest)
     * @param {number} beta      – speed coefficient (higher = less lag on fast moves)
     * @param {number} dCutoff  – derivative cutoff frequency
     */
    constructor(freq = 30, minCutoff = 1.5, beta = 0.005, dCutoff = 1.0) {
      this.freq      = freq;
      this.minCutoff = minCutoff;
      this.beta      = beta;
      this.dCutoff   = dCutoff;
      this._x        = null;  // last filtered value
      this._dx       = 0;     // last filtered derivative
      this._lastTime = null;
    }

    _alpha(cutoff) {
      const te  = 1 / this.freq;
      const tau = 1 / (2 * Math.PI * cutoff);
      return 1 / (1 + tau / te);
    }

    filter(x, timestamp = performance.now()) {
      if (this._lastTime !== null) {
        this.freq = 1000 / Math.max(1, timestamp - this._lastTime);
      }
      this._lastTime = timestamp;

      if (this._x === null) { this._x = x; return x; }

      // Derivative
      const dx      = (x - this._x) * this.freq;
      const alphaD  = this._alpha(this.dCutoff);
      this._dx      = alphaD * dx + (1 - alphaD) * this._dx;

      // Adaptive cutoff
      const cutoff  = this.minCutoff + this.beta * Math.abs(this._dx);
      const alpha   = this._alpha(cutoff);
      this._x       = alpha * x + (1 - alpha) * this._x;
      return this._x;
    }

    reset() { this._x = null; this._dx = 0; this._lastTime = null; }
  }

  /** Build one pair of (x, y) filters per landmark (21 total). */
  function makeLandmarkFilters(count = 21, minCutoff = 1.5, beta = 0.005) {
    return Array.from({ length: count }, () => ({
      x: new OneEuroFilter(30, minCutoff, beta),
      y: new OneEuroFilter(30, minCutoff, beta),
    }));
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function dist(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function squareRectFromPoints(p1, p2) {
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const side = Math.min(Math.abs(dx), Math.abs(dy));
    return {
      x: dx >= 0 ? p1.x : p1.x - side,
      y: dy >= 0 ? p1.y : p1.y - side,
      width: side, height: side,
    };
  }

  function roundRect(context, x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + w - r, y);
    context.quadraticCurveTo(x + w, y, x + w, y + r);
    context.lineTo(x + w, y + h - r);
    context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    context.lineTo(x + r, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * @param {HTMLVideoElement}  videoElement
   * @param {HTMLCanvasElement} canvasOverlay
   * @param {Object} callbacks
   *   onModelLoaded()
   *   onBoxFinalized(rect)
   *   onHandLost()
   *   onHandFound()
   *   onDrawing(rect)
   *   onHandData({landmarks, isPinching, wasPinching, pinchNorm, pinchRatio})
   *     — puzzle-pinch mode; null when hand disappears
   */
  function initGesture(videoElement, canvasOverlay, callbacks) {
    callbacks = callbacks || {};

    // ── Internal state ─────────────────────────────────────────────────────

    let mode             = 'pinch';
    let paused           = false;
    let state            = STATE_IDLE;
    let isPinching       = false;
    let noHandFrameCount = 0;
    let handWasLost      = true;
    let startPoint       = null;
    let endPoint         = null;
    let destroyed        = false;
    let firstResultFired = false;

    const ctx = canvasOverlay.getContext('2d');

    // ── One Euro Filter instances (per-landmark, reused across frames) ────

    // Pinch mode: filters for the camera-view overlay drawing
    const pinchFilters  = makeLandmarkFilters(21, 1.0, 0.005);

    // Puzzle mode: tighter params → smoother skeleton + more stable pinch cursor
    const puzzleFilters = makeLandmarkFilters(21, 0.8, 0.003);

    // Pinch ratio filter (EMA — stable grab/release, avoids flicker)
    const PINCH_RATIO_ALPHA = 0.35;
    let   smoothedPinchRatio = 1.0;

    function resetFilters() {
      pinchFilters.forEach(function(f)  { f.x.reset(); f.y.reset(); });
      puzzleFilters.forEach(function(f) { f.x.reset(); f.y.reset(); });
      smoothedPinchRatio = 1.0;
    }

    /** Apply One Euro Filter to all 21 landmarks, return a new array. */
    function filterLandmarks(landmarks, filters) {
      const now = performance.now();
      return landmarks.map(function(lm, i) {
        return {
          x: filters[i].x.filter(lm.x, now),
          y: filters[i].y.filter(lm.y, now),
        };
      });
    }

    // ── Canvas sizing ───────────────────────────────────────────────────────

    function resizeCanvas() {
      if (destroyed) return;
      canvasOverlay.width  = videoElement.clientWidth  || videoElement.offsetWidth  || 640;
      canvasOverlay.height = videoElement.clientHeight || videoElement.offsetHeight || 360;
      if (state === STATE_FINALIZED && startPoint && endPoint) {
        drawSelectionRect(squareRectFromPoints(startPoint, endPoint), null);
      }
    }

    const resizeObserver = new ResizeObserver(function() { resizeCanvas(); });
    resizeObserver.observe(videoElement);
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // ── MediaPipe Hands ─────────────────────────────────────────────────────

    const hands = new window.Hands({
      locateFile: function(file) { return 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/' + file; },
    });

    hands.setOptions({
      maxNumHands:            1,
      modelComplexity:        1,          // full model — best accuracy
      minDetectionConfidence: 0.85,       // ↑ fewer false positives
      minTrackingConfidence:  0.80,       // ↑ more stable tracking between frames
    });

    hands.onResults(onResults);

    const mpCamera = new window.Camera(videoElement, {
      onFrame: async function() {
        if (destroyed || paused) return;
        await hands.send({ image: videoElement });
      },
      width: 1280, height: 720,   // ↑ higher resolution = finer landmark precision
      fps: 30,
    });

    mpCamera.start();

    // ── Coordinate helper ───────────────────────────────────────────────────

    function toDisplay(lm) {
      return { x: lm.x * canvasOverlay.width, y: lm.y * canvasOverlay.height };
    }

    // ── Camera-view drawing helpers ─────────────────────────────────────────

    function drawSelectionRect(rect, pinchPos) {
      ctx.fillStyle = 'rgba(124, 58, 237, 0.12)';
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

      ctx.strokeStyle = 'rgba(124, 58, 237, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      ctx.setLineDash([]);

      ctx.save();
      ctx.font = 'bold 11px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'rgba(124, 58, 237, 0.9)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('□ Square', rect.x + rect.width - 4, rect.y + 4);
      ctx.restore();

      const hs = 8;
      ctx.fillStyle = '#7c3aed';
      [[rect.x, rect.y], [rect.x + rect.width, rect.y],
       [rect.x, rect.y + rect.height], [rect.x + rect.width, rect.y + rect.height]]
        .forEach(function(pair) {
          const hx = pair[0], hy = pair[1];
          ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
        });

      if (pinchPos) {
        ctx.beginPath();
        ctx.arc(pinchPos.x, pinchPos.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#06b6d4';
        ctx.fill();
      }
    }

    function drawHandSkeleton(landmarks) {
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.40)';
      ctx.lineWidth   = 1.5;
      for (let i = 0; i < HAND_CONNECTIONS.length; i++) {
        const pair = HAND_CONNECTIONS[i];
        const a = pair[0], b = pair[1];
        const pA = toDisplay(landmarks[a]), pB = toDisplay(landmarks[b]);
        ctx.beginPath(); ctx.moveTo(pA.x, pA.y); ctx.lineTo(pB.x, pB.y); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(6, 182, 212, 0.55)';
      for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i];
        const p = toDisplay(lm);
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
      }
    }

    function flashTooSmallWarning(rect) {
      let alpha = 1.0;
      function fadeStep() {
        if (destroyed || alpha <= 0) return;
        ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.font = 'bold 14px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2;
        const text = 'Selection too small — draw a bigger square';
        const pw = ctx.measureText(text).width + 24, ph = 28;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.88)';
        roundRect(ctx, cx - pw / 2, cy - ph / 2, pw, ph, 6);
        ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillText(text, cx, cy);
        ctx.restore();
        alpha -= 0.018;
        if (alpha > 0) requestAnimationFrame(fadeStep);
        else ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
      }
      requestAnimationFrame(fadeStep);
    }

    function drawPinchProximity(thumbLM, indexLM, ratio) {
      if (ratio > 0.55) return;
      const thumb = toDisplay(thumbLM), index = toDisplay(indexLM);
      const t = 1 - Math.max(0, Math.min(1, (ratio - 0.26) / (0.55 - 0.26)));
      const opacity = t * 0.85, radius = 10 - t * 4;

      ctx.strokeStyle = 'rgba(6, 182, 212, ' + opacity + ')';
      ctx.lineWidth = 2;
      [thumb, index].forEach(function(p) {
        ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.strokeStyle = 'rgba(6, 182, 212, ' + (opacity * 0.5) + ')';
      ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(thumb.x, thumb.y); ctx.lineTo(index.x, index.y); ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── MediaPipe results handler ───────────────────────────────────────────

    function onResults(results) {
      if (destroyed || paused) return;

      if (!firstResultFired) {
        firstResultFired = true;
        if (typeof callbacks.onModelLoaded === 'function') callbacks.onModelLoaded();
      }

      if (canvasOverlay.width  !== videoElement.clientWidth ||
          canvasOverlay.height !== videoElement.clientHeight) resizeCanvas();

      const hasHands = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;

      // ─ No hands detected ──────────────────────────────────────────────────
      if (!hasHands) {
        noHandFrameCount++;

        // Reset smoothing so re-detection starts clean (no ghost positions)
        resetFilters();
        isPinching = false;

        if (noHandFrameCount > HAND_LOST_FRAME_LIMIT && !handWasLost) {
          handWasLost = true;
          if (typeof callbacks.onHandLost === 'function') callbacks.onHandLost();
        }

        if (mode === 'pinch') {
          if (state === STATE_DRAWING) {
            state = STATE_IDLE; startPoint = null; endPoint = null;
          }
          if (state !== STATE_FINALIZED) {
            ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
          }
        }

        // Notify puzzle.js that the hand is gone (null = cancel any grab)
        if (mode === 'puzzle-pinch') {
          if (typeof callbacks.onHandData === 'function') callbacks.onHandData(null);
        }
        return;
      }

      // ─ Hand detected ──────────────────────────────────────────────────────
      noHandFrameCount = 0;
      if (handWasLost) {
        handWasLost = false;
        if (typeof callbacks.onHandFound === 'function') callbacks.onHandFound();
      }

      const rawLandmarks = results.multiHandLandmarks[0];

      // ── PUZZLE-PINCH MODE ──────────────────────────────────────────────────
      if (mode === 'puzzle-pinch') {
        // Apply One Euro Filter to remove jitter
        const landmarks = filterLandmarks(rawLandmarks, puzzleFilters);

        const thumbTip  = landmarks[THUMB_TIP];
        const indexTip  = landmarks[INDEX_TIP];
        const wrist     = landmarks[WRIST];
        const middleMCP = landmarks[MIDDLE_MCP];

        const rawPinchRatio = dist(wrist, middleMCP) > 0
          ? dist(thumbTip, indexTip) / dist(wrist, middleMCP)
          : 1;

        // EMA on pinch ratio → stable grab/release, no flicker at threshold
        smoothedPinchRatio = PINCH_RATIO_ALPHA * rawPinchRatio
                         + (1 - PINCH_RATIO_ALPHA) * smoothedPinchRatio;

        const wasPinching = isPinching;
        if (!isPinching && smoothedPinchRatio < PINCH_START_THRESHOLD) isPinching = true;
        else if (isPinching && smoothedPinchRatio > PINCH_END_THRESHOLD) isPinching = false;

        const pinchNorm = {
          x: (thumbTip.x + indexTip.x) / 2,
          y: (thumbTip.y + indexTip.y) / 2,
        };

        // Index fingertip position for precise tile targeting
        const indexNorm = {
          x: indexTip.x,
          y: indexTip.y,
        };

        if (typeof callbacks.onHandData === 'function') {
          callbacks.onHandData({
            landmarks:        landmarks,
            isPinching:       isPinching,
            wasPinching:     wasPinching,
            pinchNorm:       pinchNorm,
            indexNorm:       indexNorm,
            pinchRatio:      smoothedPinchRatio,
          });
        }
        return;
      }

      // ── PINCH MODE (camera view) ───────────────────────────────────────────
      // Apply One Euro Filter for smoother selection box drawing
      const landmarks = filterLandmarks(rawLandmarks, pinchFilters);

      const thumbTip  = landmarks[THUMB_TIP];
      const indexTip  = landmarks[INDEX_TIP];
      const wrist     = landmarks[WRIST];
      const middleMCP = landmarks[MIDDLE_MCP];

      const pinchDist  = dist(thumbTip, indexTip);
      const refDist    = dist(wrist, middleMCP);
      const pinchRatio = refDist > 0 ? pinchDist / refDist : 1;
      const wasPinching = isPinching;

      if (!isPinching && pinchRatio < PINCH_START_THRESHOLD) isPinching = true;
      else if (isPinching && pinchRatio > PINCH_END_THRESHOLD) isPinching = false;

      const pinchNorm    = { x: (thumbTip.x + indexTip.x) / 2, y: (thumbTip.y + indexTip.y) / 2 };
      const pinchDisplay = toDisplay(pinchNorm);

      switch (state) {
        case STATE_IDLE: {
          ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
          drawHandSkeleton(landmarks);
          drawPinchProximity(thumbTip, indexTip, pinchRatio);
          if (isPinching && !wasPinching) {
            startPoint = { x: pinchDisplay.x, y: pinchDisplay.y };
            endPoint   = { x: pinchDisplay.x, y: pinchDisplay.y };
            state      = STATE_DRAWING;
          }
          break;
        }
        case STATE_DRAWING: {
          endPoint = { x: pinchDisplay.x, y: pinchDisplay.y };
          const rect = squareRectFromPoints(startPoint, endPoint);
          ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
          drawHandSkeleton(landmarks);
          drawSelectionRect(rect, pinchDisplay);
          if (typeof callbacks.onDrawing === 'function') callbacks.onDrawing({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
          if (!isPinching && wasPinching) {
            if (rect.width >= MIN_BOX_PX && rect.height >= MIN_BOX_PX) {
              state = STATE_FINALIZED;
              ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
              drawSelectionRect(rect, null);
              if (typeof callbacks.onBoxFinalized === 'function') callbacks.onBoxFinalized({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
            } else {
              flashTooSmallWarning(rect);
              state = STATE_IDLE; startPoint = null; endPoint = null;
            }
          }
          break;
        }
        case STATE_FINALIZED: {
          if (startPoint && endPoint) {
            const rect = squareRectFromPoints(startPoint, endPoint);
            ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
            drawSelectionRect(rect, null);
            drawHandSkeleton(landmarks);
          }
          break;
        }
      }
    }

    // ── Public control methods ──────────────────────────────────────────────

    function pauseTracking() {
      paused = true;
      resetFilters();
      ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
    }

    function resumeTracking() {
      paused = false;
      noHandFrameCount = 0;
      handWasLost = true;
      resetFilters(); // ensure clean start
    }

    function setMode(newMode) {
      mode = newMode;
      isPinching = false;
      smoothedPinchRatio = 1.0;
      resetFilters();
      if (newMode === 'pinch') {
        state = STATE_IDLE;
        ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
      }
    }

    function resetSelection() {
      state = STATE_IDLE; isPinching = false;
      startPoint = null; endPoint = null;
      resetFilters();
      ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      mpCamera.stop();
      resizeObserver.disconnect();
      window.removeEventListener('resize', resizeCanvas);
      ctx.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
      state = STATE_IDLE; isPinching = false;
      startPoint = null; endPoint = null;
    }

    // Expose globally
    global.initGesture = function(videoElement, canvasOverlay, callbacks) {
      return initGesture(videoElement, canvasOverlay, callbacks);
    };

    global.GestureController = {
      pauseTracking: pauseTracking,
      resumeTracking: resumeTracking,
      setMode: setMode,
      resetSelection: resetSelection,
      destroy: destroy,
      startCamera:  resumeTracking,
      stopCamera:   pauseTracking,
    };

    return {
      pauseTracking: pauseTracking,
      resumeTracking: resumeTracking,
      setMode: setMode,
      resetSelection: resetSelection,
      destroy: destroy,
      startCamera:  resumeTracking,
      stopCamera:   pauseTracking,
    };
  }

  // Expose initGesture globally
  global.initGesture = initGesture;

})(window);