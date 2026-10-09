/**
 * puzzle.js — Puzzle generation and interaction module for Pinch & Puzzle.
 *
 * Supports 3×3 (Easy), 4×4 (Medium) and 5×5 (Hard) grids.
 *
 * Interaction modes
 * ─────────────────
 *   Hand Gesture (PRIMARY):
 *     • Pinch thumb + index finger ON a tile  → tile lifts, floats under your hand
 *     • Move while pinching                   → floating tile tracks your pinch
 *     • Release the pinch over another tile   → tiles swap with animation
 *     • The full hand skeleton is drawn on the puzzle canvas (AI tracking visible)
 *
 *   Mouse / Touch (FALLBACK):
 *     • Drag a tile onto another tile to swap
 *     • Tap a tile to select it (cyan glow), tap another tile to swap
 */

(function(global) {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────────────

  // Hand skeleton connections (MediaPipe Hands landmark indices)
  var HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],        // thumb
    [0, 5], [5, 6], [6, 7], [7, 8],        // index
    [0, 9], [9, 10], [10, 11], [11, 12],   // middle
    [0, 13], [13, 14], [14, 15], [15, 16], // ring
    [0, 17], [17, 18], [18, 19], [19, 20], // pinky
    [5, 9], [9, 13], [13, 17],             // palm
  ];

  var THUMB_TIP  = 4;
  var INDEX_TIP  = 8;
  var WRIST      = 0;

  /* ──────────────────────────── Image Slicing ──────────────────────────── */

  function sliceImage(sourceCanvas, gridSize) {
    // Divide the FULL canvas into a gridSize×gridSize grid so every pixel of
    // the image is represented. Each tile is rendered into a square canvas so
    // it displays uniformly regardless of source aspect ratio.
    var srcW  = sourceCanvas.width;
    var srcH  = sourceCanvas.height;
    var tiles = [];
    for (var row = 0; row < gridSize; row++) {
      var sy = Math.floor(row * srcH / gridSize);
      var sh = Math.floor((row + 1) * srcH / gridSize) - sy;
      for (var col = 0; col < gridSize; col++) {
        var sx = Math.floor(col * srcW / gridSize);
        var sw = Math.floor((col + 1) * srcW / gridSize) - sx;
        var tileSize = Math.max(sw, sh);
        var tc = document.createElement('canvas');
        tc.width = tileSize;
        tc.height = tileSize;
        tc.getContext('2d').drawImage(
          sourceCanvas,
          sx, sy, sw, sh,
          0, 0, tileSize, tileSize,
        );
        tiles.push({ index: row * gridSize + col, dataUrl: tc.toDataURL('image/png') });
      }
    }
    return tiles;
  }

  /* ──────────────────────────── Tile Shuffle ────────────────────────────── */

  function shuffleTiles(tiles) {
    var shuffled = tiles.slice();
    var isSolved = false;
    do {
      for (var i = shuffled.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = tmp;
      }
      isSolved = true;
      for (var idx = 0; idx < shuffled.length; idx++) {
        if (shuffled[idx].index !== idx) {
          isSolved = false;
          break;
        }
      }
    } while (isSolved);
    return shuffled;
  }

  /* ──────────────────────────── DOM Helpers ─────────────────────────────── */

  function createGrid(container, gridSize) {
    container.innerHTML = '';
    // Remove any previous grid-size class, then add the correct one
    container.classList.remove('puzzle-grid-3', 'puzzle-grid-4', 'puzzle-grid-5');
    container.classList.add('puzzle-grid-' + gridSize);

    // Also update the wrapper div that creates the square dimensions
    var wrap = document.getElementById('puzzle-board-wrap');
    if (wrap) {
      wrap.classList.remove('size-3', 'size-4', 'size-5');
      wrap.classList.add('size-' + gridSize);
    }

    var cells = [];
    var total = gridSize * gridSize;
    for (var i = 0; i < total; i++) {
      var cell = document.createElement('div');
      cell.className         = 'grid-cell';
      cell.dataset.cellIndex = i;
      container.appendChild(cell);
      cells.push(cell);
    }
    return cells;
  }

  function createTileElement(tile) {
    var el = document.createElement('div');
    el.className         = 'puzzle-tile';
    el.dataset.tileIndex = tile.index;
    el.style.touchAction = 'none';
    el.style.userSelect  = 'none';
    // Fill the entire grid cell so the image appears seamless
    el.style.width  = '100%';
    el.style.height = '100%';
    var img     = document.createElement('img');
    img.src       = tile.dataUrl;
    img.alt       = 'Tile ' + (tile.index + 1);
    img.draggable = false;
    el.appendChild(img);
    return el;
  }

  /* ──────────────────────────── Main Export ─────────────────────────────── */

  function createPuzzle(sourceCanvas, gridContainer, trayContainer, onWin, gestureCanvas, gridSize) {
    gestureCanvas = gestureCanvas || null;
    gridSize      = (gridSize === 4 || gridSize === 5) ? gridSize : 3;  // default 3×3

    /* ── slice & populate ───────────────────────────────────────────────── */
    var tiles         = sliceImage(sourceCanvas, gridSize);
    var shuffledTiles = shuffleTiles(tiles);
    var cells         = createGrid(gridContainer, gridSize);

    // Tray is not used in this mode
    if (trayContainer) { trayContainer.style.display = 'none'; trayContainer.innerHTML = ''; }

    function populateGrid(tilesArr) {
      cells.forEach(function(cell, i) {
        cell.innerHTML = '';
        cell.classList.remove('occupied', 'correct', 'drop-hover', 'pinch-target');
        cell.appendChild(createTileElement(tilesArr[i]));
      });
      updateCellStates();
    }
    populateGrid(shuffledTiles);

    /* ── general state ──────────────────────────────────────────────────── */
    var solved       = false;
    var selectedTile = null; // tap-select mode

    var abortController = new AbortController();
    var signal      = abortController.signal;

    /* ── mouse/touch drag state ─────────────────────────────────────────── */
    var draggedTile  = null;
    var dragOffsetX  = 0, dragOffsetY = 0;
    var dragStartX   = 0, dragStartY  = 0;
    var didDrag      = false;
    var placeholderEl = null;

    /* ── gesture (pinch-drag) state ─────────────────────────────────────── */
    var pinchGrabTile   = null;
    var pinchFloatEl    = null;
    var pinchFloatW     = 0;
    var pinchFloatH     = 0;

    // EMA-smoothed float position so the tile follows the hand without jitter
    var FLOAT_ALPHA = 0.72;   // 0-1: higher = more responsive, lower = smoother
    var smoothFloatX = 0, smoothFloatY = 0;

    /* ── gesture canvas ─────────────────────────────────────────────────── */
    var gCtx = gestureCanvas ? gestureCanvas.getContext('2d') : null;
    var gestureCanvasRO = null;

    function resizeGestureCanvas() {
      if (!gestureCanvas) return;
      gestureCanvas.width  = window.innerWidth;
      gestureCanvas.height = window.innerHeight;
    }
    if (gestureCanvas) {
      gestureCanvasRO = new ResizeObserver(resizeGestureCanvas);
      gestureCanvasRO.observe(gridContainer);
      window.addEventListener('resize', resizeGestureCanvas, { signal: signal });
      resizeGestureCanvas();
    }

    function clearGestureCanvas() {
      if (gCtx && gestureCanvas) gCtx.clearRect(0, 0, gestureCanvas.width, gestureCanvas.height);
    }

    /* ── cell state ─────────────────────────────────────────────────────── */
    function updateCellStates() {
      cells.forEach(function(cell) {
        var tile = cell.querySelector('.puzzle-tile');
        if (tile) {
          cell.classList.add('occupied');
          cell.classList.toggle(
            'correct',
            parseInt(tile.dataset.tileIndex) === parseInt(cell.dataset.cellIndex),
          );
        } else {
          cell.classList.remove('occupied', 'correct');
        }
      });
    }

    function checkWin() {
      if (solved) return;
      var allCorrect = true;
      for (var i = 0; i < cells.length; i++) {
        var t = cells[i].querySelector('.puzzle-tile');
        if (!t || parseInt(t.dataset.tileIndex) !== parseInt(cells[i].dataset.cellIndex)) {
          allCorrect = false;
          break;
        }
      }
      if (allCorrect) {
        solved = true;
        clearGestureCanvas();

        // Hide gesture hint
        var gh = document.getElementById('gesture-hint');
        if (gh) gh.classList.add('hidden');

        // Staggered win glow on each correct tile
        for (var gi = 0; gi < cells.length; gi++) {
          var _t = cells[gi].querySelector('.puzzle-tile');
          if (_t) {
            (function(idx) {
              setTimeout(function() {
                _t.classList.add('win-glow');
              }, idx * 80);
            })(gi);
          }
        }

        // Show solved overlay
        var solvedOverlay = document.getElementById('puzzle-solved-overlay');
        if (solvedOverlay) {
          setTimeout(function() {
            solvedOverlay.classList.add('visible');
            solvedOverlay.classList.remove('hidden');
          }, 400);
        }

        onWin();
      }
    }

    function swapElements(elA, elB) {
      var pA = elA.parentNode, nA = elA.nextSibling;
      var pB = elB.parentNode, nB = elB.nextSibling;
      if (nA === elB) pA.insertBefore(elB, elA);
      else if (nB === elA) pB.insertBefore(elA, elB);
      else { pA.insertBefore(elB, nA); pB.insertBefore(elA, nB); }
    }

    function clearHighlights() {
      cells.forEach(function(c) { c.classList.remove('drop-hover', 'pinch-target'); });
      document.querySelectorAll('.puzzle-tile.drag-target').forEach(
        function(t) { t.classList.remove('drag-target'); }
      );
    }

    /* ─────────────────────────────────────────────────────────────────────
       HAND SKELETON DRAWING (on gesture canvas, mirrored)
       ─────────────────────────────────────────────────────────────────── */

    // ── Convert normalized landmark → gesture canvas pixel (full-viewport, mirrored X) ─
    //
    // The puzzle-gesture-canvas covers the FULL viewport (width = window.innerWidth,
    // height = window.innerHeight). Drawing at (1-lm.x)*canvasW, lm.y*canvasH puts
    // every landmark at its physically correct viewport position, matching where the
    // user's hand actually appears in front of the screen.
    function toGC(lm) {
      return {
        x: (1 - lm.x) * gestureCanvas.width,
        y: lm.y * gestureCanvas.height,
      };
    }

    // Per-finger bone colors for a more vibrant hand visualization
    var FINGER_COLORS = [
      'rgba(245,158,11,0.75)',   // thumb  — amber
      'rgba(6,182,212,0.75)',    // index  — cyan
      'rgba(167,139,250,0.70)', // middle — purple
      'rgba(52,211,153,0.70)',  // ring   — emerald
      'rgba(248,113,113,0.70)', // pinky  — rose
    ];
    // Connection groups by finger (indices into HAND_CONNECTIONS)
    // thumb:0-3, index:4-7, middle:8-11, ring:12-15, pinky:16-19, palm:20-22
    var FINGER_FOR_CONN = [
      0,0,0,0, 1,1,1,1, 2,2,2,2, 3,3,3,3, 4,4,4,4, 1,2,3,
    ];

    function drawHandSkeleton(landmarks, pinchRatio) {
      if (!gCtx || !gestureCanvas || !landmarks) return;

      // ── Bones with per-finger color ────────────────────────────────────────
      gCtx.lineWidth = 2.5;
      for (var ci = 0; ci < HAND_CONNECTIONS.length; ci++) {
        var pair = HAND_CONNECTIONS[ci];
        var a = pair[0], b = pair[1];
        var pA = toGC(landmarks[a]), pB = toGC(landmarks[b]);
        var fingerIdx = FINGER_FOR_CONN[ci] || 1;
        gCtx.strokeStyle = FINGER_COLORS[fingerIdx];
        gCtx.beginPath();
        gCtx.moveTo(pA.x, pA.y);
        gCtx.lineTo(pB.x, pB.y);
        gCtx.stroke();
      }

      // ── All landmark dots ───────────────────────────────────────────────
      for (var i = 0; i < landmarks.length; i++) {
        var p = toGC(landmarks[i]);
        // Thumb tip (4) and index tip (8) get special highlight
        var isKeyTip = (i === THUMB_TIP || i === INDEX_TIP);
        gCtx.beginPath();
        gCtx.arc(p.x, p.y, isKeyTip ? 7 : 3.5, 0, Math.PI * 2);
        gCtx.fillStyle = isKeyTip
          ? (pinchRatio < 0.35 ? 'rgba(245,158,11,0.95)' : 'rgba(6,182,212,0.9)')
          : 'rgba(6,182,212,0.6)';
        gCtx.fill();

        // Gold ring around key tips when pinching
        if (isKeyTip && pinchRatio < 0.35) {
          gCtx.beginPath();
          gCtx.arc(p.x, p.y, 11, 0, Math.PI * 2);
          gCtx.strokeStyle = 'rgba(245,158,11,0.6)';
          gCtx.lineWidth   = 2;
          gCtx.stroke();
        }
      }

      // ── Pinch beam: line between thumb tip and index tip ────────────────
      var thumbP = toGC(landmarks[THUMB_TIP]);
      var indexP = toGC(landmarks[INDEX_TIP]);
      var beamAlpha = Math.max(0, 1 - pinchRatio / 0.5);
      if (beamAlpha > 0) {
        gCtx.beginPath();
        gCtx.moveTo(thumbP.x, thumbP.y);
        gCtx.lineTo(indexP.x, indexP.y);
        gCtx.strokeStyle = 'rgba(245,158,11,' + (beamAlpha * 0.8) + ')';
        gCtx.lineWidth   = 2;
        gCtx.setLineDash([4, 3]);
        gCtx.stroke();
        gCtx.setLineDash([]);
      }
    }

    /**
     * Draw the pinch cursor at the midpoint between thumb and index tip.
     */
    function drawPinchCursor(cx, cy, isPinching, pinchRatio, nearTile) {
      if (!gCtx || !gestureCanvas) return;

      var closeness = Math.max(0, 1 - pinchRatio / 0.5); // 0 = far, 1 = fully pinched

      // Brighter, bigger outer ring
      var ringR = 36;
      var glow = gCtx.createRadialGradient(cx, cy, 0, cx, cy, ringR);
      if (nearTile) {
        glow.addColorStop(0, 'rgba(52,211,153,' + (0.25 + closeness * 0.2) + ')');
        glow.addColorStop(1, 'rgba(52,211,153,0)');
      } else {
        glow.addColorStop(0, 'rgba(245,158,11,' + (0.25 + closeness * 0.2) + ')');
        glow.addColorStop(1, 'rgba(245,158,11,0)');
      }
      gCtx.beginPath();
      gCtx.arc(cx, cy, ringR, 0, Math.PI * 2);
      gCtx.fillStyle = glow;
      gCtx.fill();

      // Core dot — bigger, brighter
      var dotR = 8 + closeness * 6;  // grows as fingers close
      gCtx.beginPath();
      gCtx.arc(cx, cy, dotR, 0, Math.PI * 2);
      if (nearTile) {
        gCtx.fillStyle = isPinching
          ? 'rgba(52,211,153,0.95)'
          : 'rgba(52,211,153,' + (0.5 + closeness * 0.4) + ')';
      } else {
        gCtx.fillStyle = isPinching
          ? 'rgba(245,158,11,0.95)'
          : 'rgba(6,182,212,' + (0.5 + closeness * 0.4) + ')';
      }
      gCtx.fill();

      // White centre
      gCtx.beginPath();
      gCtx.arc(cx, cy, dotR * 0.38, 0, Math.PI * 2);
      gCtx.fillStyle = 'rgba(255,255,255,0.9)';
      gCtx.fill();

      // Pulse ring when near a tile
      if (nearTile) {
        var pulseR = dotR + 12 + 6 * Math.sin(performance.now() / 200);
        gCtx.beginPath();
        gCtx.arc(cx, cy, pulseR, 0, Math.PI * 2);
        gCtx.strokeStyle = 'rgba(52,211,153,0.5)';
        gCtx.lineWidth = 2.5;
        gCtx.stroke();
      }

      // "PINCH" label when actively pinching
      if (isPinching && nearTile) {
        gCtx.font        = 'bold 12px Inter, system-ui, sans-serif';
        gCtx.fillStyle   = 'rgba(52,211,153,0.95)';
        gCtx.textAlign   = 'center';
        gCtx.textBaseline = 'bottom';
        gCtx.fillText('DROP ', cx, cy - dotR - 8);
      } else if (isPinching) {
        gCtx.font        = 'bold 12px Inter, system-ui, sans-serif';
        gCtx.fillStyle   = 'rgba(245,158,11,0.95)';
        gCtx.textAlign   = 'center';
        gCtx.textBaseline = 'bottom';
        gCtx.fillText('PINCH', cx, cy - dotR - 8);
      } else if (nearTile) {
        gCtx.font        = 'bold 11px Inter, system-ui, sans-serif';
        gCtx.fillStyle   = 'rgba(52,211,153,0.85)';
        gCtx.textAlign   = 'center';
        gCtx.textBaseline = 'bottom';
        gCtx.fillText('TARGET', cx, cy - dotR - 8);
      }
    }

    /* ─────────────────────────────────────────────────────────────────────
       PINCH DRAG — Grab, Move, Drop
       ─────────────────────────────────────────────────────────────────── */

    /**
     * Find which grid cell contains the given VIEWPORT coordinates (clientX/Y).
     *
     * Strategy: iterate the actual cells array and use their live
     * getBoundingClientRect() for hit-testing. This is the only approach that
     * is 100% correct regardless of CSS changes, zoom level, scroll position,
     * border/padding/gap values, or board size.
     *
     * Returns the .puzzle-tile element inside the matching cell, or null.
     */
    function gridCellAt(clientX, clientY) {
      for (var i = 0; i < cells.length; i++) {
        var br = cells[i].getBoundingClientRect();
        if (
          clientX >= br.left && clientX <= br.right &&
          clientY >= br.top  && clientY <= br.bottom
        ) {
          return cells[i].querySelector('.puzzle-tile');
        }
      }
      return null;
    }

    function startPinchGrab(clientX, clientY) {
      if (solved) return;
      var tile = gridCellAt(clientX, clientY);
      if (!tile) return;

      // Hide gesture hint on first interaction
      var hint = document.getElementById('gesture-hint');
      if (hint) hint.classList.add('hidden');

      pinchGrabTile = tile;
      var rect    = tile.getBoundingClientRect();
      pinchFloatW   = rect.width;
      pinchFloatH   = rect.height;

      // Initialise EMA at exact grab position (no lag on first frame)
      smoothFloatX = clientX;
      smoothFloatY = clientY;

      // Create a visual floating clone that follows the pinch
      pinchFloatEl           = document.createElement('div');
      pinchFloatEl.className = 'puzzle-tile pinch-floating';
      pinchFloatEl.innerHTML = tile.innerHTML;
      pinchFloatEl.style.cssText = 
        'position: fixed; width: ' + pinchFloatW + 'px; height: ' + pinchFloatH + 'px; ' +
        'left: ' + (clientX - pinchFloatW / 2) + 'px; top: ' + (clientY - pinchFloatH / 2) + 'px; ' +
        'z-index: 2000; pointer-events: none; border-radius: 8px; ' +
        'border: 3px solid #f59e0b; ' +
        'box-shadow: 0 16px 48px rgba(245,158,11,0.5), 0 0 32px rgba(245,158,11,0.3); ' +
        'transform: scale(1.12) rotate(2deg); transition: box-shadow 0.15s ease; ' +
        'overflow: hidden;';
      document.body.appendChild(pinchFloatEl);

      // Dim the source tile
      tile.classList.add('pinch-grabbed');
    }

    function movePinchGrab(clientX, clientY) {
      if (!pinchFloatEl || !pinchGrabTile) return;

      // EMA smooth the position — eliminates hand-tracking jitter on the float tile
      smoothFloatX = FLOAT_ALPHA * clientX + (1 - FLOAT_ALPHA) * smoothFloatX;
      smoothFloatY = FLOAT_ALPHA * clientY + (1 - FLOAT_ALPHA) * smoothFloatY;

      pinchFloatEl.style.left = (smoothFloatX - pinchFloatW / 2) + 'px';
      pinchFloatEl.style.top  = (smoothFloatY - pinchFloatH / 2) + 'px';

      // Highlight the tile under the cursor using grid cell hit-test
      clearHighlights();
      var target = gridCellAt(smoothFloatX, smoothFloatY);

      if (target && target !== pinchGrabTile) {
        target.classList.add('pinch-target');
        var cell = target.closest('.grid-cell');
        if (cell) cell.classList.add('drop-hover');
      }
    }

    function endPinchGrab(clientX, clientY) {
      if (!pinchGrabTile) return;

      // Clean up float
      if (pinchFloatEl) pinchFloatEl.remove();
      pinchFloatEl = null;
      pinchGrabTile.classList.remove('pinch-grabbed');
      clearHighlights();

      // Find target tile using grid cell hit-test
      var targetTile = gridCellAt(clientX, clientY);

      if (targetTile && targetTile !== pinchGrabTile) {
        // Swap with a brief flash animation
        targetTile.classList.add('swap-flash');
        pinchGrabTile.classList.add('swap-flash');
        setTimeout(function() {
          targetTile.classList.remove('swap-flash');
          if (pinchGrabTile) pinchGrabTile.classList.remove('swap-flash');
        }, 350);

        swapElements(pinchGrabTile, targetTile);
        updateCellStates();
        checkWin();
      }

      pinchGrabTile = null;
    }

    /* ─────────────────────────────────────────────────────────────────────
       MAIN GESTURE ENTRY POINT
       Called every frame by app.js via onHandData callback
       ─────────────────────────────────────────────────────────────────── */

    /**
     * Process hand data from gesture.js (puzzle-pinch mode).
     * Draws the hand skeleton + cursor, and drives pinch-drag interaction.
     * Pass null to signal hand lost → cancels any active grab.
     *
     * @param {Object|null} data
     */
    function updateHandGesture(data) {
      if (!gestureCanvas) return;

      // ── Hand lost or no data ─────────────────────────────────────────────
      if (!data) {
        // Cancel any active pinch grab so the tile doesn't stay floating
        if (pinchGrabTile) {
          if (pinchFloatEl) pinchFloatEl.remove();
          pinchFloatEl = null;
          pinchGrabTile.classList.remove('pinch-grabbed');
          pinchGrabTile = null;
          clearHighlights();
        }
        clearGestureCanvas();
        return;
      }

      var landmarks = data.landmarks;
      var isPinching = data.isPinching;
      var wasPinching = data.wasPinching;
      var pinchNorm = data.pinchNorm;
      var indexNorm = data.indexNorm || data.pinchNorm; // fallback if not sent
      var pinchRatio = data.pinchRatio;

      // ── Coordinate mapping ────────────────────────────────────────────────
      //
      // The puzzle-gesture-canvas is sized to window.innerWidth × window.innerHeight.
      // The hand skeleton (toGC) is already drawn at full-viewport coordinates.
      // We use the SAME full-viewport mapping for the targeting point so that
      // the green dot appears on top of the correct skeleton landmark.
      //
      // Physical correctness: the webcam "sees" the physical space in front of the
      // monitor. A hand physically over cell X maps to approximately that cell's
      // viewport position. gridCellAt() uses per-cell getBoundingClientRect() (also
      // in viewport coords) so the hit-test is consistent and correct.
      //
      //   targetX = (1 - indexNorm.x) × window.innerWidth   [mirror X]
      //   targetY = indexNorm.y        × window.innerHeight
      var targetX = (1 - indexNorm.x) * window.innerWidth;
      var targetY = indexNorm.y * window.innerHeight;

      // Pinch-cursor visual: same space as skeleton (full viewport, mirrored X)
      var gcX = (1 - pinchNorm.x) * gestureCanvas.width;
      var gcY = pinchNorm.y * gestureCanvas.height;

      // ── Draw hand skeleton ────────────────────────────────────────────────
      gCtx.clearRect(0, 0, gestureCanvas.width, gestureCanvas.height);
      drawHandSkeleton(landmarks, pinchRatio);

      // ── Debug overlay: grid boundaries + targeting dot ────────────────────
      // Draw all cell outlines (works for 3×3, 4×4 and 5×5)
      if (cells && cells.length > 0) {
        gCtx.save();
        gCtx.strokeStyle = 'rgba(255,255,255,0.25)';
        gCtx.lineWidth   = 1;
        gCtx.setLineDash([4, 4]);
        for (var _ci = 0; _ci < cells.length; _ci++) {
          var _cr = cells[_ci].getBoundingClientRect();
          gCtx.strokeRect(_cr.left, _cr.top, _cr.width, _cr.height);
          // Cell index label (small, top-left of cell)
          gCtx.setLineDash([]);
          gCtx.font = 'bold 10px Inter, sans-serif';
          gCtx.fillStyle = 'rgba(255,255,255,0.35)';
          gCtx.textAlign = 'left';
          gCtx.textBaseline = 'top';
          gCtx.fillText(String(_ci + 1), _cr.left + 4, _cr.top + 3);
          gCtx.setLineDash([4, 4]);
        }
        gCtx.restore();
      }

      // Draw targeting dot at the exact clientX/Y used for hit-testing
      gCtx.beginPath();
      gCtx.arc(targetX, targetY, 7, 0, Math.PI * 2);
      gCtx.fillStyle = 'rgba(52, 211, 153, 0.92)';
      gCtx.fill();
      gCtx.strokeStyle = '#fff';
      gCtx.lineWidth = 2;
      gCtx.stroke();

      // Label the hit cell index next to the dot
      var _hitTile = gridCellAt(targetX, targetY);
      if (_hitTile) {
        var _hitCell = _hitTile.closest('.grid-cell');
        var _hitIdx  = _hitCell ? parseInt(_hitCell.dataset.cellIndex, 10) + 1 : '?';
        gCtx.font = 'bold 13px Inter, sans-serif';
        gCtx.fillStyle = 'rgba(52,211,153,1)';
        gCtx.textAlign = 'left';
        gCtx.textBaseline = 'middle';
        gCtx.fillText('Cell ' + _hitIdx, targetX + 12, targetY);
      }

      // Check if cursor is over any tile for cursor visual feedback
      var nearTile = gridCellAt(targetX, targetY);

      drawPinchCursor(gcX, gcY, isPinching, pinchRatio, nearTile);

      if (solved) return;

      // ── Pinch-drag state machine (uses board-relative target coords) ─────
      if (isPinching && !wasPinching) {
        startPinchGrab(targetX, targetY);
      } else if (isPinching && pinchGrabTile) {
        movePinchGrab(targetX, targetY);
      } else if (!isPinching && wasPinching) {
        // Use the last smoothed position for reliable drop targeting
        endPinchGrab(pinchGrabTile ? smoothFloatX : targetX,
                     pinchGrabTile ? smoothFloatY : targetY);
      }
    }

    /* ─────────────────────────────────────────────────────────────────────
       MOUSE / TOUCH DRAG & DROP (fallback)
       ─────────────────────────────────────────────────────────────────── */

    function getTileAt(clientX, clientY) {
      if (draggedTile) draggedTile.style.pointerEvents = 'none';
      var el = document.elementFromPoint(clientX, clientY);
      if (draggedTile) draggedTile.style.pointerEvents = '';
      return el ? el.closest('.puzzle-tile') : null;
    }

    function onPointerDown(e) {
      if (solved) return;
      var tile = e.target.closest('.puzzle-tile');
      if (!tile) return;
      e.preventDefault();
      tile.setPointerCapture(e.pointerId);

      var rect  = tile.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      dragStartX  = e.clientX;
      dragStartY  = e.clientY;
      didDrag     = false;
      draggedTile = tile;

      tile.classList.add('dragging');
      tile.style.willChange = 'left, top, transform';
      tile.style.width  = rect.width  + 'px';
      tile.style.height = rect.height + 'px';

      placeholderEl           = document.createElement('div');
      placeholderEl.className = 'tile-placeholder';
      placeholderEl.style.width  = rect.width  + 'px';
      placeholderEl.style.height = rect.height + 'px';
      tile.parentNode.insertBefore(placeholderEl, tile);

      document.body.appendChild(tile);
      tile.style.position = 'fixed';
      tile.style.left     = (e.clientX - dragOffsetX) + 'px';
      tile.style.top      = (e.clientY - dragOffsetY) + 'px';
      tile.style.zIndex   = '1000';
    }

    function onPointerMove(e) {
      if (!draggedTile) return;
      e.preventDefault();
      if (Math.abs(e.clientX - dragStartX) > 5 || Math.abs(e.clientY - dragStartY) > 5)
        didDrag = true;
      draggedTile.style.left = (e.clientX - dragOffsetX) + 'px';
      draggedTile.style.top  = (e.clientY - dragOffsetY) + 'px';

      clearHighlights();
      var target = getTileAt(e.clientX, e.clientY);
      if (target && target !== draggedTile) {
        target.classList.add('drag-target');
        var cell = target.closest('.grid-cell');
        if (cell) cell.classList.add('drop-hover');
      }
    }

    function onPointerUp(e) {
      if (!draggedTile) return;
      e.preventDefault();
      clearHighlights();

      var tile    = draggedTile;
      var wasDrag = didDrag;

      tile.classList.remove('dragging');
      tile.style.position = tile.style.left = tile.style.top =
        tile.style.zIndex = tile.style.width = tile.style.height =
        tile.style.willChange = '';

      if (!wasDrag) {
        returnToPlaceholder(tile);
        draggedTile = null;
        handleTap(tile);
        return;
      }

      var targetTile = getTileAt(e.clientX, e.clientY);
      if (targetTile && targetTile !== tile) {
        returnToPlaceholder(tile);
        removePlaceholder();
        draggedTile = null;
        swapElements(tile, targetTile);
      } else {
        returnToPlaceholder(tile);
        removePlaceholder();
        draggedTile = null;
      }
      updateCellStates();
      checkWin();
    }

    function onPointerCancel() {
      if (!draggedTile) return;
      var tile = draggedTile;
      tile.classList.remove('dragging');
      tile.style.position = tile.style.left = tile.style.top =
        tile.style.zIndex = tile.style.width = tile.style.height =
        tile.style.willChange = '';
      returnToPlaceholder(tile);
      draggedTile = null;
      clearHighlights();
    }

    function returnToPlaceholder(tile) {
      if (placeholderEl && placeholderEl.parentNode) {
        placeholderEl.parentNode.insertBefore(tile, placeholderEl);
      }
      removePlaceholder();
    }
    function removePlaceholder() { 
      if (placeholderEl) {
        placeholderEl.remove();
        placeholderEl = null;
      }
    }

    /* ── Tap-to-swap ────────────────────────────────────────────────────── */

    function handleTap(tileEl) {
      if (!tileEl) return;
      if (!selectedTile) {
        selectedTile = tileEl;
        tileEl.classList.add('selected');
      } else if (selectedTile === tileEl) {
        selectedTile.classList.remove('selected');
        selectedTile = null;
      } else {
        var prev = selectedTile;
        prev.classList.remove('selected');
        selectedTile = null;
        swapElements(prev, tileEl);
        updateCellStates();
        checkWin();
      }
    }

    /* bind events */
    document.addEventListener('pointerdown',   onPointerDown,   { signal: signal });
    document.addEventListener('pointermove',   onPointerMove,   { signal: signal });
    document.addEventListener('pointerup',     onPointerUp,     { signal: signal });
    document.addEventListener('pointercancel', onPointerCancel, { signal: signal });

    gridContainer.addEventListener('click', function(e) {
      if (solved || draggedTile) return;
      if (!e.target.closest('.puzzle-tile') && selectedTile) {
        selectedTile.classList.remove('selected');
        selectedTile = null;
      }
    }, { signal: signal });

    gridContainer.addEventListener('contextmenu', function(e) { e.preventDefault(); }, { signal: signal });

    // Auto-hide gesture hint after 8s
    setTimeout(function() {
      var gh = document.getElementById('gesture-hint');
      if (gh) gh.classList.add('hidden');
    }, 8000);

    /* ── public API ─────────────────────────────────────────────────────── */

    function hideSolvedOverlay() {
      var overlay = document.getElementById('puzzle-solved-overlay');
      if (overlay) {
        overlay.classList.add('hidden');
        overlay.classList.remove('visible');
      }
    }

    function reset() {
      hideSolvedOverlay();
      solved = false;
      // Clean up gesture state
      if (pinchFloatEl) pinchFloatEl.remove();
      pinchFloatEl = null;
      if (pinchGrabTile) {
        pinchGrabTile.classList.remove('pinch-grabbed');
        pinchGrabTile = null;
      }
      if (selectedTile) {
        selectedTile.classList.remove('selected');
        selectedTile = null;
      }
      if (draggedTile) {
        draggedTile.classList.remove('dragging');
        draggedTile.style.cssText = '';
        draggedTile = null;
      }
      removePlaceholder();
      shuffledTiles = shuffleTiles(tiles);
      // Pass gridSize so 4×4 / 5×5 puzzles don't revert to 3×3 on reset
      cells = createGrid(gridContainer, gridSize);
      populateGrid(shuffledTiles);
      clearGestureCanvas();
    }

    function destroy() {
      hideSolvedOverlay();
      abortController.abort();
      if (pinchFloatEl) pinchFloatEl.remove();
      pinchFloatEl = null;
      if (draggedTile) {
        draggedTile.classList.remove('dragging');
        draggedTile.remove();
        draggedTile = null;
      }
      removePlaceholder();
      if (selectedTile) {
        selectedTile.classList.remove('selected');
        selectedTile = null;
      }
      if (pinchGrabTile) {
        pinchGrabTile.classList.remove('pinch-grabbed');
        pinchGrabTile = null;
      }
      gridContainer.innerHTML = '';
      if (trayContainer) trayContainer.style.display = '';
      cells = [];
      solved = false;
      if (gestureCanvasRO) {
        gestureCanvasRO.disconnect();
        gestureCanvasRO = null;
      }
      clearGestureCanvas();
    }

    // Expose globally
    global.createPuzzle = createPuzzle;

    return { reset: reset, destroy: destroy, updateHandGesture: updateHandGesture };
  }

  // Expose createPuzzle globally
  global.createPuzzle = createPuzzle;

})(window);