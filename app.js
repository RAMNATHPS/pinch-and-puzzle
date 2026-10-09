/**
 * app.js — Main application controller for Pinch & Puzzle.
 *
 * State machine: NAME_ENTRY → CAMERA → CONFIRM → PUZZLE → RESULTS
 *
 * Key design decisions:
 *   - gestureController is created ONCE (on first "Start") and reused forever.
 *     It uses pauseTracking() / resumeTracking() to halt/resume hand-tracking
 *     without ever stopping the MediaStream (avoids repeated permission prompts).
 *   - Square crop: the captured region is forced to a square before the puzzle.
 *   - Dwell mode: when the puzzle view is active, gesture.js streams the index
 *     fingertip position to puzzleController.updateGesture() every frame.
 */

// ─── DOM References ────────────────────────────────────────────────

var views = {
  nameModal:   document.getElementById('name-modal'),
  category:    document.getElementById('category-view'),
  difficulty:  document.getElementById('difficulty-view'),
  camera:      document.getElementById('camera-view'),
  confirm:     document.getElementById('confirm-view'),
  puzzle:      document.getElementById('puzzle-view'),
  results:     document.getElementById('results-view'),
};

var els = {
  // App-wide controls
  btnFullscreen:    document.getElementById('btn-fullscreen'),

  // Name form
  nameForm:         document.getElementById('name-form'),
  inputName:        document.getElementById('input-name'),
  inputDepartment:  document.getElementById('input-department'),
  btnStart:         document.getElementById('btn-start'),
  formError:        document.getElementById('form-error'),

  // Camera
  webcam:           document.getElementById('webcam'),
  gestureCanvas:    document.getElementById('gesture-canvas'),
  cameraLoading:    document.getElementById('camera-loading'),
  handWarning:      document.getElementById('hand-warning'),
  btnCameraReset:   document.getElementById('btn-camera-reset'),

  // Confirm
  cropPreview:      document.getElementById('crop-preview'),
  btnConfirm:       document.getElementById('btn-confirm'),
  btnRetry:         document.getElementById('btn-retry'),

  // Puzzle
  puzzleBoard:      document.getElementById('puzzle-board'),
  tileTray:         document.getElementById('tile-tray'),
  timerDisplay:     document.getElementById('timer-display'),
  btnPuzzleReset:   document.getElementById('btn-puzzle-reset'),
  referenceImage:   document.getElementById('reference-image'),
  puzzleGestureCanvas: document.getElementById('puzzle-gesture-canvas'),

  // Results
  resultTime:       document.getElementById('result-time'),
  rankDisplay:      document.getElementById('rank-display'),
  leaderboardBody:  document.getElementById('leaderboard-body'),
  btnPlayAgain:     document.getElementById('btn-play-again'),
  btnExit:          document.getElementById('btn-exit'),

  // Category picker
  categoryGrid:         document.getElementById('category-grid'),
  btnCategoryBack:      document.getElementById('btn-category-back'),

  // Difficulty picker
  diffView:         document.getElementById('difficulty-view'),
  diffPreviewThumb: document.getElementById('diff-preview-thumb'),
  diffPreviewIcon:  document.getElementById('diff-preview-icon'),
  diffPreviewLabel: document.getElementById('diff-preview-label'),
  diffPreviewDept:  document.getElementById('diff-preview-dept'),
  diffPreviewBanner: document.getElementById('diff-preview-banner'),
  diffPreviewLevel: document.getElementById('diff-preview-level'),
  diffPreviewDetail: document.getElementById('diff-preview-detail'),
  btnDiffBack:      document.getElementById('btn-diff-back'),

  // Leaderboard tabs
  lbTabs:           document.getElementById('lb-tabs'),
  lbDeptRank:       document.getElementById('lb-dept-rank'),

  // Home leaderboard overlay
  btnHomeLb:        document.getElementById('btn-home-leaderboard'),
  homeLbOverlay:    document.getElementById('home-lb-overlay'),
  homeLbTabs:       document.getElementById('home-lb-tabs'),
  homeLbBody:       document.getElementById('home-leaderboard-body'),
  btnHomeLbClose:   document.getElementById('btn-home-lb-close'),

  // Category page header
  categoryTitle:    document.getElementById('category-title'),
  categorySubtitle: document.getElementById('category-subtitle'),

  // Fun fact
  funFactOverlay:       document.getElementById('fun-fact-overlay'),
  funFactBadge:         document.getElementById('fun-fact-badge'),
  funFactDept:          document.getElementById('fun-fact-dept'),
  funFactText:          document.getElementById('fun-fact-text'),
  btnDismissFunFact:    document.getElementById('btn-dismiss-funfact'),

  // Celebration
  celebrationOverlay:    document.getElementById('celebration-overlay'),
  recordTime:            document.getElementById('record-time'),
  btnDismissCelebration: document.getElementById('btn-dismiss-celebration'),
};

// ─── State ─────────────────────────────────────────────────────────

var userName         = 'Name';
var userDepartment   = 'N/A';
var gestureController = null;  // created once, kept alive forever
var puzzleController  = null;
var timer             = null;
var selectedRect      = null;  // { x, y, width, height } — guaranteed square from gesture.js
var capturedFrame     = null;  // full video frame canvas (off-screen)
var croppedCanvas     = null;  // square cropped canvas
var confettiCleanup   = null;
var activeCategoryId  = null;  // currently selected category id
var selectedGridSize  = 3;     // 3 | 4 | 5 (chosen on difficulty screen)
var pendingFunFact    = null;  // fun fact text to show after puzzle solved
var pendingElapsed    = null;  // time to pass to results after fun fact dismissed
var htBadgeActive     = false; // tracks whether hand-tracking badge shows "ON"

// ─── Fullscreen ────────────────────────────────────────────────────

function syncFullscreenControl() {
  if (!els.btnFullscreen) return;

  var isFullscreen = Boolean(document.fullscreenElement);
  var label = isFullscreen ? 'Exit full screen' : 'Full screen';
  els.btnFullscreen.setAttribute('aria-pressed', String(isFullscreen));
  els.btnFullscreen.setAttribute('aria-label', label);
  els.btnFullscreen.title = label;
  els.btnFullscreen.querySelector('.fullscreen-label').textContent = label;
}

els.btnFullscreen.addEventListener('click', function() {
  if (document.fullscreenElement) {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(function() {});
    }
    return;
  }

  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(function() {});
  }
});

document.addEventListener('fullscreenchange', syncFullscreenControl);
document.addEventListener('fullscreenerror', syncFullscreenControl);
syncFullscreenControl();

// ─── View Management ───────────────────────────────────────────────

function showView(viewKey) {
  Object.values(views).forEach(function(v) { v.classList.remove('active'); });
  views[viewKey].classList.add('active');
}

// ─── 1. NAME ENTRY ───────────────────────────────────────────────────

/**
 * Returns true only when both the name field has text AND a department
 * (including Guest) is selected from the dropdown.
 */
function isFormValid() {
  return els.inputName.value.trim().length > 0 &&
         els.inputDepartment.value !== '';
}

/** Sync the submit button enabled state with form validity. */
function validateNameForm() {
  var valid = isFormValid();
  els.btnStart.disabled = !valid;
  if (valid) {
    // Clear any prior error once the user fixes both fields
    els.formError.classList.add('hidden');
  }
}

// Live validation — re-check on every keystroke / selection change
els.inputName.addEventListener('input', validateNameForm);
els.inputDepartment.addEventListener('change', validateNameForm);

// Run once so the button starts disabled (HTML `disabled` attr is the
// initial state, but JS-driven check keeps things in sync if the browser
// auto-fills fields on reload)
validateNameForm();

els.nameForm.addEventListener('submit', function(e) {
  e.preventDefault();

  // Guard: double-check validity in case the button was somehow activated
  if (!isFormValid()) {
    els.formError.classList.remove('hidden');
    // Shake both empty fields for emphasis
    if (!els.inputName.value.trim())      els.inputName.classList.add('input-shake');
    if (!els.inputDepartment.value)       els.inputDepartment.classList.add('input-shake');
    setTimeout(function() {
      els.inputName.classList.remove('input-shake');
      els.inputDepartment.classList.remove('input-shake');
    }, 500);
    return;
  }

  userName       = els.inputName.value.trim();
  userDepartment = els.inputDepartment.value;   // 'Guest' is a valid value now
  buildCategoryGrid();
  showView('category');
});

// ─── 1a-LB. HOME LEADERBOARD ───────────────────────────────────────

/** Open the standalone leaderboard overlay from the home screen. */
function openHomeLb() {
  var homeDiffTabBar = document.getElementById('home-lb-diff-tabs');
  Leaderboard.initTabs(
    els.homeLbTabs,
    els.homeLbBody,
    null,   // no dept-rank banner element
    null,   // no highlight time
    null,   // no active userDept filter
    'easy'  // default difficulty tab
  );
  Leaderboard.initDiffTabs(homeDiffTabBar, 'easy');
  els.homeLbOverlay.classList.remove('hidden');
}

/** Close the home leaderboard overlay. */
function closeHomeLb() {
  els.homeLbOverlay.classList.add('hidden');
}

els.btnHomeLb.addEventListener('click', openHomeLb);
els.btnHomeLbClose.addEventListener('click', closeHomeLb);
// Click on dark backdrop also closes it
els.homeLbOverlay.addEventListener('click', function(e) {
  if (e.target === els.homeLbOverlay) closeHomeLb();
});


/**
 * Returns true if a category should be shown for the current user.
 * - Camera (dept = 'ANY') → always shown.
 * - School and Guest → all categories shown.
 * - Department user → only the category whose dept matches theirs.
 */
function isCategoryVisibleForUser(cat) {
  // Camera is always visible
  if (cat.dept === 'ANY') return true;
  // School and Guest participants can choose any puzzle category.
  if (userDepartment === 'Guest' || userDepartment === 'School') return true;
  // Department user sees only their matching puzzle
  return cat.dept.toLowerCase() === userDepartment.toLowerCase();
}

/** Build (or rebuild) the category picker cards. */
function buildCategoryGrid() {
  var grid = els.categoryGrid;
  grid.innerHTML = '';

  // Update heading based on user type
  var canChooseAnyPuzzle = (userDepartment === 'Guest' || userDepartment === 'School');
  if (els.categoryTitle) {
    els.categoryTitle.textContent = userDepartment === 'Guest'
      ? '🎓 All Puzzles'
      : '🎓 ' + userDepartment + ' — Choose Your Puzzle';
  }
  if (els.categorySubtitle) {
    els.categorySubtitle.textContent = canChooseAnyPuzzle
      ? 'Pick any preset engineering image or capture your own!'
      : 'Your department puzzle is ready — or capture your own photo!';
  }

  var cats = PuzzleCategories.getAll();
  // Filter to only the categories this user should see
  var visibleCats = cats.filter(function(cat) {
    return isCategoryVisibleForUser(cat);
  });

  visibleCats.forEach(function(cat) {
    var card = document.createElement('div');
    card.className = 'category-card';
    if (cat.id === 'camera') {
      card.classList.add('category-card--camera');
    }

    // Thumbnail
    var thumbEl;
    if (cat.id === 'camera') {
      thumbEl = document.createElement('div');
      thumbEl.className = 'category-thumb-icon';
      thumbEl.textContent = cat.icon;
    } else {
      // Generate the engineering image
      var genCanvas = PuzzleCategories.generateCanvas(cat.id);
      thumbEl = document.createElement('div');
      thumbEl.className = 'category-thumb';
      if (genCanvas) {
        // Scale down to thumbnail
        var thumb = document.createElement('canvas');
        var ts = 200;
        thumb.width = ts;
        thumb.height = ts;
        thumb.getContext('2d').drawImage(genCanvas, 0, 0, ts, ts);
        thumbEl.appendChild(thumb);
      }
    }

    var badge = '<span class="category-dept-badge">' + cat.deptLabel + '</span>';
    var iconEl = '<span class="category-icon">' + cat.icon + '</span>';
    var labelEl = '<span class="category-label">' + cat.label + '</span>';
    var descEl  = '<span class="category-desc">'  + cat.description + '</span>';

    card.appendChild(thumbEl);
    card.insertAdjacentHTML('beforeend',
      iconEl + labelEl + descEl + badge
    );
    card.style.setProperty('--cat-color', cat.deptColor);

    card.addEventListener('click', function() {
      selectCategory(cat.id);
    });

    grid.appendChild(card);
  });
}

/** Handle category selection — go to difficulty picker first. */
function selectCategory(catId) {
  activeCategoryId = catId;
  var cat = PuzzleCategories.getById(catId);
  pendingFunFact = cat ? cat.funFact : null;

  // Show difficulty picker with a preview of the chosen puzzle
  showDifficultyPicker(cat, catId);
}

/** Populate and show the difficulty screen. */
function showDifficultyPicker(cat, catId) {
  // Fill preview banner
  els.diffPreviewIcon.textContent  = cat ? cat.icon  : '🧩';
  els.diffPreviewLabel.textContent = cat ? cat.label : 'Puzzle';
  els.diffPreviewDept.textContent  = cat ? (cat.deptLabel || cat.dept) : '';

  // Thumbnail canvas
  els.diffPreviewThumb.innerHTML = '';
  if (catId !== 'camera' && cat && cat.generate) {
    var genC = PuzzleCategories.generateCanvas(catId);
    if (genC) {
      var th = document.createElement('canvas');
      th.width = 96; th.height = 96;
      th.getContext('2d').drawImage(genC, 0, 0, 96, 96);
      els.diffPreviewThumb.appendChild(th);
    }
  } else {
    els.diffPreviewThumb.textContent = '📷';
    els.diffPreviewThumb.style.fontSize = '2.5rem';
    els.diffPreviewThumb.style.lineHeight = '96px';
    els.diffPreviewThumb.style.textAlign = 'center';
  }

  showView('difficulty');
}

// ─── Difficulty card click handlers ─────────────────────────────

['easy','medium','hard'].forEach(function(level) {
  var card = document.getElementById('diff-card-' + level);
  var previewCopy = {
    easy:   { label: 'Easy · 3×3',   detail: '9 tiles · about 30–60 sec', steps: 1 },
    medium: { label: 'Medium · 4×4', detail: '16 tiles · about 1–3 min', steps: 2 },
    hard:   { label: 'Hard · 5×5',   detail: '25 tiles · about 3–8 min', steps: 3 },
  }[level];

  function previewLevel() {
    els.diffPreviewBanner.dataset.level = level;
    els.diffPreviewLevel.textContent = previewCopy.label;
    els.diffPreviewDetail.textContent = previewCopy.detail;
    els.diffPreviewBanner.querySelectorAll('.diff-preview-meter i').forEach(function(bar, index) {
      bar.classList.toggle('is-filled', index < previewCopy.steps);
    });
    document.querySelectorAll('.diff-card').forEach(function(otherCard) {
      otherCard.classList.toggle('preview-active', otherCard === card);
    });
  }

  card.addEventListener('pointerenter', previewLevel);
  card.addEventListener('focus', previewLevel);
  card.addEventListener('click', function() {
      selectedGridSize = parseInt(this.dataset.size, 10);
      if (activeCategoryId === 'camera') {
        startCameraView();
      } else {
        croppedCanvas = PuzzleCategories.generateCanvas(activeCategoryId);
        if (!croppedCanvas) return;
        selectedRect  = null;
        capturedFrame = null;
        showView('puzzle');
        startEngineeringPuzzle();
      }
    });
  // Keyboard accessibility
  card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.click(); }
    });
});

els.btnDiffBack.addEventListener('click', function() {
  showView('category');
});

/** Start puzzle directly from an engineering category canvas (no camera). */
function startEngineeringPuzzle() {
  // Show reference image
  var refCanvas = els.referenceImage;
  refCanvas.width  = croppedCanvas.width;
  refCanvas.height = croppedCanvas.height;
  refCanvas.getContext('2d').drawImage(croppedCanvas, 0, 0);

  if (els.puzzleGestureCanvas) {
    els.puzzleGestureCanvas.width  = window.innerWidth;
    els.puzzleGestureCanvas.height = window.innerHeight;
  }

  if (puzzleController) { puzzleController.destroy(); puzzleController = null; }

  timer = createTimer(els.timerDisplay);

  puzzleController = createPuzzle(
    croppedCanvas,
    els.puzzleBoard,
    els.tileTray,
    onPuzzleSolved,
    els.puzzleGestureCanvas,
    selectedGridSize,
  );

  // ── Hand tracking for engineering puzzles ──────────────────────────────
  // ensureGestureController() lazily creates the controller if not already
  // done (first time = camera permission prompt). On subsequent visits the
  // existing controller is reused — no second permission prompt.
  ensureGestureController();
  gestureController.setMode('puzzle-pinch');
  gestureController.resumeTracking();
  // Badge starts as "loading" until onModelLoaded fires (or immediately if
  // the model was already loaded on a previous visit)
  updateHandTrackingBadge(true);

  timer.start();
}

// Category Back button → back to name modal
els.btnCategoryBack.addEventListener('click', function() {
  showView('nameModal');
});

// ─── Gesture Controller (shared across camera + engineering paths) ──────────

/**
 * Lazily creates the gesture controller the first time it is needed.
 * Subsequent calls are no-ops — the same instance is reused forever.
 *
 * The single callback set handles both modes:
 *   'pinch'        — camera view (draw selection box)
 *   'puzzle-pinch' — puzzle view (stream hand data to puzzle controller)
 */
function ensureGestureController() {
  if (gestureController) return;

  gestureController = initGesture(els.webcam, els.gestureCanvas, {

    onModelLoaded: function() {
      // Hide camera spinner (only relevant when arriving via camera view)
      els.cameraLoading.classList.add('hidden');

      // If we're already on the puzzle view (engineering path), update badge
      if (views.puzzle.classList.contains('active')) {
        updateHandTrackingBadge(true);
      }
    },

    onBoxFinalized: function(rect) {
      selectedRect = rect;           // already a square from gesture.js
      captureAndShowConfirm();
    },

    onHandLost: function() {
      if (views.camera.classList.contains('active')) {
        els.handWarning.classList.add('visible');
      }
    },

    onHandFound: function() {
      els.handWarning.classList.remove('visible');
    },

    onDrawing: function(_rect) {
      // Visual feedback handled by gesture.js canvas drawing
    },

    onHandData: function(data) {
      // Puzzle-pinch mode: relay full hand data to puzzle controller
      if (puzzleController && views.puzzle.classList.contains('active')) {
        puzzleController.updateHandGesture(data);
      }
    },
  });
}

/** Update the "Hand Tracking ON/OFF" badge in the puzzle header. */
function updateHandTrackingBadge(active) {
  htBadgeActive = active;
  var badge = document.querySelector('.hand-tracking-badge');
  if (!badge) return;
  if (active) {
    badge.textContent = '🖐 Hand Tracking ON';
    badge.classList.remove('badge--off');
    badge.classList.add('badge--on');
  } else {
    badge.textContent = '🖐 Hand Tracking OFF';
    badge.classList.remove('badge--on');
    badge.classList.add('badge--off');
  }
}

// ─── 2. CAMERA VIEW ────────────────────────────────────────────────

function startCameraView() {
  showView('camera');
  selectedRect = null;
  capturedFrame = null;
  croppedCanvas = null;
  els.cameraLoading.classList.remove('hidden');
  els.handWarning.classList.remove('visible');
  ensureGestureController();

  gestureController.setMode('pinch');
  gestureController.resumeTracking();

  updateHandTrackingBadge(true);
}
// Pause hand tracking but keep the camera stream alive
function pauseCameraTracking() {

  if (gestureController) {
    gestureController.pauseTracking();
    gestureController.resetSelection();
  }

  els.handWarning.classList.remove('visible');
}


// Completely stop the laptop camera
function stopCameraTracking() {

  if (gestureController) {
    gestureController.pauseTracking();
    gestureController.resetSelection();
  }

  if (els.webcam && els.webcam.srcObject) {
    var stream = els.webcam.srcObject;

    stream.getTracks().forEach(function(track) {
      track.stop();
    });

    els.webcam.srcObject = null;
  }

  gestureController = null;

  els.handWarning.classList.remove('visible');
}

// Camera "Start Over" → completely close camera

els.btnCameraReset.addEventListener('click', function() {

  stopCameraTracking();

  selectedRect = null;
  capturedFrame = null;
  croppedCanvas = null;
  activeCategoryId = null;
  pendingFunFact = null;
  pendingElapsed = null;
  selectedGridSize = 3;

  showView('nameModal');

});

// ─── 3. CONFIRM VIEW ───────────────────────────────────────────────

function captureAndShowConfirm() {
  if (!selectedRect) return;

  var video = els.webcam;

  // ── 1. Capture full video frame ─────────────────────────────────────
  capturedFrame        = document.createElement('canvas');
  capturedFrame.width  = video.videoWidth;
  capturedFrame.height = video.videoHeight;
  capturedFrame.getContext('2d').drawImage(video, 0, 0);

  // ── 2. Map display (CSS) coords → native video resolution ───────────
  //
  // The gesture canvas and video both have CSS `transform: scaleX(-1)`.
  // MediaPipe reports landmarks in the original (un-mirrored) 0-1 space.
  // squareRectFromPoints() builds the rect in the SAME un-mirrored space
  // (landmark coords × canvas size). So the rect x/y is already in the
  // un-mirrored frame — we do NOT need to flip x again; we just scale.
  //
  var displayW = video.clientWidth  || video.offsetWidth  || 1;
  var displayH = video.clientHeight || video.offsetHeight || 1;
  var scaleX   = video.videoWidth  / displayW;
  var scaleY   = video.videoHeight / displayH;

  var srcX = selectedRect.x * scaleX;
  var srcY = selectedRect.y * scaleY;
  var srcW = selectedRect.width  * scaleX;
  var srcH = selectedRect.height * scaleY;

  // Force square from shorter dimension (safety net)
  var side = Math.min(srcW, srcH);
  srcW = side;
  srcH = side;

  // Clamp to frame bounds
  srcX = Math.max(0, Math.min(srcX, video.videoWidth  - side));
  srcY = Math.max(0, Math.min(srcY, video.videoHeight - side));

  // ── 3. Crop the square region ───────────────────────────────────────
  croppedCanvas        = document.createElement('canvas');
  croppedCanvas.width  = Math.round(side);
  croppedCanvas.height = Math.round(side);
  var cropCtx = croppedCanvas.getContext('2d');

  // Mirror horizontally to match what the user saw in the live feed
  cropCtx.translate(croppedCanvas.width, 0);
  cropCtx.scale(-1, 1);
  cropCtx.drawImage(
    capturedFrame,
    Math.round(srcX), Math.round(srcY), Math.round(side), Math.round(side),
    0, 0, Math.round(side), Math.round(side),
  );

  // ── 4. Show preview ─────────────────────────────────────────────────
  var preview = els.cropPreview;
  preview.width  = croppedCanvas.width;
  preview.height = croppedCanvas.height;
  preview.getContext('2d').drawImage(croppedCanvas, 0, 0);
  pauseCameraTracking();   // pause tracking, keep camera for Retry
  showView('confirm');
}

// Confirm → start puzzle
els.btnConfirm.addEventListener('click', function() {
  startPuzzle();
});

// Retry → back to camera (instant — no permission prompt)
els.btnRetry.addEventListener('click', function() {
  selectedRect = null;
  if (gestureController) {
    gestureController.setMode('pinch');
    gestureController.resetSelection();
    gestureController.resumeTracking();
  }
  showView('camera');
});

// ─── 4. PUZZLE VIEW ────────────────────────────────────────────────

function startPuzzle() {
  showView('puzzle');

  // Show reference image
  var refCanvas = els.referenceImage;
  refCanvas.width  = croppedCanvas.width;
  refCanvas.height = croppedCanvas.height;
  refCanvas.getContext('2d').drawImage(croppedCanvas, 0, 0);

  // Resize puzzle gesture canvas to full viewport (it's fixed-position)
  if (els.puzzleGestureCanvas) {
    els.puzzleGestureCanvas.width  = window.innerWidth;
    els.puzzleGestureCanvas.height = window.innerHeight;
  }

  // Destroy any previous puzzle
  if (puzzleController) { puzzleController.destroy(); puzzleController = null; }

  // Create timer
  timer = createTimer(els.timerDisplay);

  // Create puzzle (pass gesture canvas for dwell cursor drawing)
  puzzleController = createPuzzle(
    croppedCanvas,
    els.puzzleBoard,
    els.tileTray,
    onPuzzleSolved,
    els.puzzleGestureCanvas,
    selectedGridSize,
  );

  // Switch gesture to puzzle-pinch mode (controller guaranteed to exist:
  // it was created in startCameraView() before reaching startPuzzle())
  gestureController.setMode('puzzle-pinch');
  gestureController.resumeTracking();
  updateHandTrackingBadge(true);

  // Start timer
  timer.start();
}

function onPuzzleSolved() {
  // Switch back to pinch mode (stops streaming to puzzle) and pause
  if (gestureController) {
    gestureController.setMode('pinch');
    gestureController.pauseTracking();
  }
  updateHandTrackingBadge(false);
  var elapsed = timer.stop();

  // Show fun fact for engineering categories before results
  if (pendingFunFact && activeCategoryId !== 'camera') {
    pendingElapsed = elapsed;
    showFunFact();
  } else {
    showResults(elapsed);
  }
}

// ─── FUN FACT ──────────────────────────────────────────────

function showFunFact() {
  var cat = PuzzleCategories.getById(activeCategoryId);
  els.funFactBadge.textContent = cat ? cat.icon : '🧠';
  els.funFactDept.textContent  = (cat ? cat.deptLabel : '') + ' Engineering';
  els.funFactText.textContent  = pendingFunFact || '';
  els.funFactOverlay.classList.remove('hidden');
}

els.btnDismissFunFact.addEventListener('click', function() {
  els.funFactOverlay.classList.add('hidden');
  pendingFunFact = null;
  showResults(pendingElapsed);
  pendingElapsed = null;
});

// Puzzle "Start Over"
els.btnPuzzleReset.addEventListener('click', function() {

  if (timer) {
    timer.reset();
    timer = null;
  }

  if (puzzleController) {
    puzzleController.destroy();
    puzzleController = null;
  }

  // Completely close camera
  stopCameraTracking();

  els.funFactOverlay.classList.add('hidden');

  pendingFunFact = null;
  pendingElapsed = null;
  activeCategoryId = null;
  selectedGridSize = 3;
  selectedRect = null;
  capturedFrame = null;
  croppedCanvas = null;

  showView('nameModal');
});
// ─── 5. RESULTS VIEW ───────────────────────────────────────────────

function showResults(timeSeconds) {
  var roundedTime = Math.round(timeSeconds * 100) / 100;  // 2 dp
  var currentDiff = Leaderboard.gridSizeToDifficulty(selectedGridSize);

  var newRecord = Leaderboard.isNewRecord(roundedTime, currentDiff);

  Leaderboard.addEntry({
    name:        userName,
    department:  userDepartment,
    timeSeconds: roundedTime,
    date:        new Date().toISOString(),
    difficulty:  currentDiff,
  });

  var rank         = Leaderboard.getRank(roundedTime, 'ALL', currentDiff);
  var totalEntries = Leaderboard.getEntries('ALL', currentDiff).length;

  if (newRecord) {
    showCelebration(roundedTime, currentDiff);
  } else {
    showResultsView(roundedTime, rank, totalEntries, currentDiff);
  }
}

function showResultsView(timeSeconds, rank, totalEntries, difficulty) {
  var diff = difficulty || Leaderboard.gridSizeToDifficulty(selectedGridSize);
  var diffMeta = Leaderboard.DIFFICULTY_META[diff] || Leaderboard.DIFFICULTY_META.easy;
  var resultsDiffTabBar = document.getElementById('lb-diff-tabs');

  els.resultTime.textContent = timeSeconds.toFixed(2) + 's';

  var overallRankEmoji = rank === 1 ? '🏆' : rank <= 3 ? '🥈' : '🎯';
  els.rankDisplay.innerHTML =
    overallRankEmoji + ' ' + diffMeta.icon + ' ' + diffMeta.label +
    ' rank: <strong>#' + rank + '</strong> of ' + totalEntries;

  // Show dept-specific rank if player has a known department
  var userNormDept = Leaderboard.normDept(userDepartment);
  if (userNormDept && userNormDept !== 'N/A' && Leaderboard.DEPARTMENTS.indexOf(userNormDept) !== -1) {
    var deptEntries = Leaderboard.getEntries(userNormDept, diff);
    var deptRank    = Leaderboard.getRank(timeSeconds, userNormDept, diff);
    var meta        = Leaderboard.DEPT_META[userNormDept];
    var deptEmoji   = meta ? meta.icon : '🏢';
    els.rankDisplay.innerHTML +=
      '<br><span class="rank-dept-line">' +
      deptEmoji + ' ' + userNormDept + ' rank: <strong>#' + deptRank +
      '</strong> of ' + deptEntries.length + '</span>';
  }

  // Initialise department tabs (dept tabs), then difficulty tabs
  Leaderboard.initTabs(
    els.lbTabs,
    els.leaderboardBody,
    els.lbDeptRank,
    timeSeconds,
    userDepartment,
    diff
  );
  Leaderboard.initDiffTabs(resultsDiffTabBar, diff);

  showView('results');
}

function showCelebration(timeSeconds, difficulty) {
  els.recordTime.textContent = timeSeconds.toFixed(2) + 's';
  // Stash difficulty for use when the celebration is dismissed
  els.celebrationOverlay.dataset.diff = difficulty || Leaderboard.gridSizeToDifficulty(selectedGridSize);
  els.celebrationOverlay.classList.remove('hidden');

  if (confettiCleanup) confettiCleanup();
  confettiCleanup = launchConfetti(els.celebrationOverlay);
}

els.btnDismissCelebration.addEventListener('click', function() {
  els.celebrationOverlay.classList.add('hidden');
  if (confettiCleanup) { confettiCleanup(); confettiCleanup = null; }

  var roundedTime  = parseFloat(els.recordTime.textContent);
  var diff         = els.celebrationOverlay.dataset.diff || Leaderboard.gridSizeToDifficulty(selectedGridSize);
  var rank         = Leaderboard.getRank(roundedTime, 'ALL', diff);
  var totalEntries = Leaderboard.getEntries('ALL', diff).length;
  showResultsView(roundedTime, rank, totalEntries, diff);
});

// ─── 6. LEADERBOARD / PLAY AGAIN ──────────────────────────────────

els.btnPlayAgain.addEventListener('click', function() {

  // Stop camera completely
  stopCameraTracking();

  // Full state reset
  selectedRect = null;
  capturedFrame = null;
  croppedCanvas = null;
  activeCategoryId = null;
  pendingFunFact = null;
  pendingElapsed = null;
  selectedGridSize = 3;

  if (puzzleController) {
    puzzleController.destroy();
    puzzleController = null;
  }

  if (timer) {
    timer.reset();
    timer = null;
  }

  showView('nameModal');

});

// ─── Keyboard shortcuts ────────────────────────────────────────────

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (!els.celebrationOverlay.classList.contains('hidden')) {
      els.btnDismissCelebration.click();
    }
  }
});

// ─── Handle puzzle-gesture-canvas resize ──────────────────────────

window.addEventListener('resize', function() {
  if (els.puzzleGestureCanvas && views.puzzle.classList.contains('active')) {
    els.puzzleGestureCanvas.width  = window.innerWidth;
    els.puzzleGestureCanvas.height = window.innerHeight;
  }
});

// ─── Init ──────────────────────────────────────────────────────────
console.log('🤏 Pinch & Puzzle loaded — localStorage leaderboard');

// ─── EXIT / LOGOUT ────────────────────────────────────────────────
if (els.btnExit) {
  els.btnExit.addEventListener('click', function () {

    // Completely stop the laptop camera
    stopCameraTracking();

    // Stop timer if running
    if (timer) {
      timer.stop();
      timer = null;
    }

    // Clear current game data
    selectedRect = null;
    capturedFrame = null;
    croppedCanvas = null;
    activeCategoryId = null;
    pendingFunFact = null;
    pendingElapsed = null;

    // Return to Login / Name Entry screen
    showView('nameModal');
  });
}
// Close camera when website/tab is closed
window.addEventListener('pagehide', function() {
  stopCameraTracking();
});

window.addEventListener('beforeunload', function() {
  stopCameraTracking();
});