/**
 * leaderboard.js — localStorage-based leaderboard for Pinch & Puzzle.
 *
 * Supports:
 *   - Separate leaderboards per difficulty (Easy / Medium / Hard)
 *   - Overall leaderboard (all departments)
 *   - Per-department filtering for:
 *     CSE, IT, AI&DS, CSBS, Mech, Civil, EEE, ECE, ECX
 *   - Medal badges (🥇🥈🥉) for top-3
 *   - Dept colour badges on each row
 *   - Department-best info card next to the tab the current player belongs to
 *
 * Entry shape (v3):
 *   { name, department, timeSeconds, date, difficulty }
 *   difficulty = 'easy' | 'medium' | 'hard'
 *   Old entries without difficulty default to 'easy' for backward compat.
 */

(function (global) {
  'use strict';

  // Fresh local leaderboard for the AI Museum '26 event.
  var STORAGE_KEY = 'pinch_puzzle_leaderboard_aimuseum26_v1';
  var MAX_ENTRIES = 300;

  /* ── Department registry ──────────────────────────────────────────── */
  var DEPARTMENTS = ['CSE', 'IT', 'AI&DS', 'CSBS', 'Mech', 'Civil', 'EEE', 'ECE', 'ECX', 'School', 'Guest'];

  /** Colour + icon for each department (used on row badges & tab accents). */
  var DEPT_META = {
    'CSE':   { color: '#1a73e8', icon: '💻' },
    'IT':    { color: '#0f9d58', icon: '🌐' },
    'AI&DS': { color: '#9c27b0', icon: '🤖' },
    'CSBS':  { color: '#00acc1', icon: '📊' },
    'Mech':  { color: '#f59e0b', icon: '🔩' },
    'Civil': { color: '#00e676', icon: '🏗️' },
    'EEE':   { color: '#ffca28', icon: '⚡' },
    'ECE':   { color: '#ef5350', icon: '📡' },
    'ECX':   { color: '#ec407a', icon: '🔬' },
    'School': { color: '#b66a2c', icon: '🏫' },
    'Guest': { color: '#78909c', icon: '👤' },
  };

  /* ── Difficulty registry ──────────────────────────────────────────── */
  var DIFFICULTIES = ['easy', 'medium', 'hard'];

  var DIFFICULTY_META = {
    easy:   { label: 'Easy',   icon: '🟢', grid: '3×3', color: '#34a853', gridSize: 3 },
    medium: { label: 'Medium', icon: '🟡', grid: '4×4', color: '#f9ab00', gridSize: 4 },
    hard:   { label: 'Hard',   icon: '🔴', grid: '5×5', color: '#ea4335', gridSize: 5 },
  };

  /** Map grid size number → difficulty string. */
  function gridSizeToDifficulty(size) {
    if (size === 4) return 'medium';
    if (size === 5) return 'hard';
    return 'easy'; // 3 or anything else
  }

  /* ── Storage helpers ──────────────────────────────────────────────── */

  function readFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // Try migrating data from v2 key
        var v2Raw = localStorage.getItem('pinch_puzzle_leaderboard_v2');
        if (v2Raw) {
          var v2Data = JSON.parse(v2Raw);
          if (Array.isArray(v2Data)) {
            // Migrate: treat old entries as 'easy' (3×3 was the original only mode)
            var migrated = v2Data.map(function(e) {
              if (e && typeof e === 'object') {
                return Object.assign({}, e, { difficulty: e.difficulty || 'easy' });
              }
              return null;
            }).filter(Boolean);
            writeToStorage(migrated);
            return migrated;
          }
        }
        // Try migrating from v1 key
        var v1Raw = localStorage.getItem('pinch_puzzle_leaderboard');
        if (v1Raw) {
          var v1Data = JSON.parse(v1Raw);
          if (Array.isArray(v1Data)) {
            var v1Migrated = v1Data.map(function(e) {
              if (e && typeof e === 'object') {
                return Object.assign({}, e, { difficulty: 'easy' });
              }
              return null;
            }).filter(Boolean);
            writeToStorage(v1Migrated);
            return v1Migrated;
          }
        }
        return [];
      }
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (e) {
        return e !== null &&
          typeof e === 'object' &&
          typeof e.timeSeconds === 'number' &&
          !isNaN(e.timeSeconds);
      }).map(function(e) {
        // Ensure difficulty is always set (backward compat for any v3 entries saved without it)
        return Object.assign({}, e, { difficulty: e.difficulty || 'easy' });
      });
    } catch (_) {
      return [];
    }
  }

  function writeToStorage(entries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (_) { /* storage full — fail silently */ }
  }

  /* ── Normalise helpers ────────────────────────────────────────────── */

  function normDept(dept) {
    if (!dept) return 'N/A';
    var d = dept.trim();
    for (var i = 0; i < DEPARTMENTS.length; i++) {
      if (d.toLowerCase() === DEPARTMENTS[i].toLowerCase()) return DEPARTMENTS[i];
    }
    return d;
  }

  function normDiff(diff) {
    if (!diff) return 'easy';
    var d = diff.toLowerCase().trim();
    if (DIFFICULTIES.indexOf(d) !== -1) return d;
    return 'easy';
  }

  /* ── Public API ───────────────────────────────────────────────────── */

  /**
   * Add a new score entry.
   * @param {object} entry  { name, department, timeSeconds, date, difficulty }
   *                        difficulty = 'easy'|'medium'|'hard'  (or gridSize 3/4/5)
   */
  function addEntry(entry) {
    var entries = readFromStorage();

    var diff = entry.difficulty;
    // Accept numeric gridSize as well
    if (typeof diff === 'number') diff = gridSizeToDifficulty(diff);
    diff = normDiff(diff);

    entries.push({
      name:        entry.name        || 'Anonymous',
      department:  normDept(entry.department),
      timeSeconds: typeof entry.timeSeconds === 'number'
                    ? entry.timeSeconds
                    : parseFloat(entry.timeSeconds) || 0,
      date:        entry.date || new Date().toISOString(),
      difficulty:  diff,
    });
    entries.sort(function (a, b) { return a.timeSeconds - b.timeSeconds; });
    writeToStorage(entries.slice(0, MAX_ENTRIES));
  }

  /**
   * Get entries, optionally filtered by department and/or difficulty.
   * @param {string} [deptFilter]  'ALL' or dept name
   * @param {string} [diffFilter]  'ALL' or 'easy'|'medium'|'hard'
   */
  function getEntries(deptFilter, diffFilter) {
    var all = readFromStorage();
    all.sort(function (a, b) { return a.timeSeconds - b.timeSeconds; });

    var byDept = (!deptFilter || deptFilter === 'ALL')
      ? all
      : all.filter(function(e) { return normDept(e.department) === deptFilter; });

    var byDiff = (!diffFilter || diffFilter === 'ALL')
      ? byDept
      : byDept.filter(function(e) { return normDiff(e.difficulty) === diffFilter; });

    return byDiff;
  }

  /**
   * Get rank of a score within the given filters.
   * @param {number} timeSeconds
   * @param {string} [deptFilter]
   * @param {string} [diffFilter]
   */
  function getRank(timeSeconds, deptFilter, diffFilter) {
    var entries = getEntries(deptFilter, diffFilter);
    var rank = 1;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].timeSeconds < timeSeconds) rank++;
      else break;
    }
    return rank;
  }

  /**
   * True if this time is the overall #1 for the given difficulty.
   * @param {number} timeSeconds
   * @param {string} [diffFilter]
   */
  function isNewRecord(timeSeconds, diffFilter) {
    var entries = getEntries('ALL', diffFilter || 'ALL');
    if (entries.length === 0) return true;
    return timeSeconds < entries[0].timeSeconds;
  }

  /**
   * True if this time is the dept #1 for the given difficulty.
   * @param {number} timeSeconds
   * @param {string} dept
   * @param {string} [diffFilter]
   */
  function isNewDeptRecord(timeSeconds, dept, diffFilter) {
    var entries = getEntries(dept, diffFilter || 'ALL');
    if (entries.length === 0) return true;
    return timeSeconds < entries[0].timeSeconds;
  }

  function clearLeaderboard() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  /* ── Formatting helpers ───────────────────────────────────────────── */

  function formatTime(s) {
    if (typeof s !== 'number' || isNaN(s)) return '—';
    return s.toFixed(1) + 's';
  }

  function formatDate(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (_) { return '—'; }
  }

  function medalFor(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank + '';
  }

  function deptBadgeHTML(dept) {
    var meta = DEPT_META[dept];
    if (!meta) return '<span class="lb-dept-chip">' + dept + '</span>';
    return '<span class="lb-dept-chip" style="--chip-color:' + meta.color + '">'
      + meta.icon + ' ' + dept
      + '</span>';
  }

  /* ── Main render ──────────────────────────────────────────────────── */

  /**
   * Renders the leaderboard into a <tbody>.
   * @param {HTMLTableSectionElement} tbody
   * @param {number}  [highlightTime]   Row with this time gets `.highlighted`
   * @param {string}  [deptFilter]      'ALL' or a dept name
   * @param {string}  [diffFilter]      'ALL' | 'easy' | 'medium' | 'hard'
   */
  function renderLeaderboard(tbody, highlightTime, deptFilter, diffFilter) {
    if (!tbody) return;
    tbody.innerHTML = '';

    var dept = deptFilter || 'ALL';
    var diff = diffFilter || 'ALL';
    var entries = getEntries(dept, diff);

    if (entries.length === 0) {
      var emptyRow = tbody.insertRow();
      var emptyCell = emptyRow.insertCell();
      emptyCell.className = 'leaderboard-empty';
      emptyCell.colSpan = 5;
      emptyCell.style.cssText = 'text-align:center;padding:1.5rem;opacity:.6;font-style:italic;';

      var diffLabel = diff !== 'ALL' && DIFFICULTY_META[diff]
        ? DIFFICULTY_META[diff].icon + ' ' + DIFFICULTY_META[diff].label
        : '';
      var deptLabel = dept !== 'ALL' ? dept : '';
      var qualifier = [diffLabel, deptLabel].filter(Boolean).join(' · ');

      emptyCell.textContent = qualifier
        ? 'No scores for ' + qualifier + ' yet — set the first time.'
        : 'No scores yet — set the first time.';
      return;
    }

    var highlightMatched = false;

    entries.forEach(function (entry, idx) {
      var row = tbody.insertRow();

      // ── Rank cell ────────────────────────────────────────────────
      var rankCell = row.insertCell();
      rankCell.className = 'lb-rank-cell';
      rankCell.innerHTML = '<span class="lb-medal">' + medalFor(idx + 1) + '</span>';

      // ── Name cell ─────────────────────────────────────────────────
      var nameCell = row.insertCell();
      nameCell.textContent = entry.name || 'Anonymous';
      nameCell.style.fontWeight = idx < 3 ? '600' : '';

      // ── Dept cell ─────────────────────────────────────────────────
      var deptCell = row.insertCell();
      deptCell.innerHTML = deptBadgeHTML(entry.department);

      // ── Time cell ─────────────────────────────────────────────────
      var timeCell = row.insertCell();
      timeCell.textContent = formatTime(entry.timeSeconds);
      timeCell.style.fontFamily = 'var(--ff-mono)';
      timeCell.style.fontWeight = idx < 3 ? '700' : '';
      timeCell.style.color = idx === 0 ? 'var(--md-primary)' : '';

      // ── Date cell ─────────────────────────────────────────────────
      var dateCell = row.insertCell();
      dateCell.textContent = formatDate(entry.date);
      dateCell.style.color = 'var(--md-on-surface-variant)';
      dateCell.style.fontSize = 'var(--fs-xs)';

      // ── Highlight current player's row ────────────────────────────
      if (
        !highlightMatched &&
        highlightTime !== undefined &&
        highlightTime !== null &&
        Math.abs(entry.timeSeconds - highlightTime) < 0.001
      ) {
        row.classList.add('highlighted');
        highlightMatched = true;
      }

      // Top-3 glow row
      if (idx < 3) row.classList.add('lb-top-row');
    });
  }

  /* ── Internal shared state ────────────────────────────────────────── */

  var _currentDept      = 'ALL';
  var _currentDiff      = 'easy';   // default: show Easy tab first
  var _currentHighlight = null;
  var _userDept         = null;
  var _currentTbody     = null;
  var _currentDeptRankEl = null;

  /* ── Department Tab bar wiring ────────────────────────────────────── */

  /**
   * Wire up the department filter tab bar.
   * @param {HTMLElement} tabBar
   * @param {HTMLElement} tbody
   * @param {HTMLElement} deptRankEl
   * @param {number}      highlightTime
   * @param {string}      userDept
   * @param {string}      [initialDiff]  difficulty to filter by (e.g. 'easy')
   */
  function initTabs(tabBar, tbody, deptRankEl, highlightTime, userDept, initialDiff) {
    if (!tabBar) return;

    _currentHighlight  = highlightTime;
    _userDept          = normDept(userDept);
    _currentTbody      = tbody;
    _currentDeptRankEl = deptRankEl;
    _currentDiff       = initialDiff || 'easy';

    var tabs = tabBar.querySelectorAll('.lb-tab');

    tabs.forEach(function (tab) {
      var tabDept = tab.dataset.dept;
      if (tabDept !== 'ALL' && tabDept === _userDept) {
        tab.classList.add('lb-tab--mine');
      }

      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        _currentDept = tab.dataset.dept;
        renderLeaderboard(tbody, _currentHighlight, _currentDept, _currentDiff);
        updateDeptRank(deptRankEl, _currentDept, highlightTime, _currentDiff);
      });
    });

    // Initial render
    renderLeaderboard(tbody, highlightTime, 'ALL', _currentDiff);
    updateDeptRank(deptRankEl, 'ALL', highlightTime, _currentDiff);
  }

  /* ── Difficulty Tab bar wiring ────────────────────────────────────── */

  /**
   * Wire up the difficulty filter tab bar.
   * Call AFTER initTabs() so shared state (_currentTbody etc.) is set.
   * @param {HTMLElement} diffTabBar    Container with .lb-diff-tab buttons
   * @param {string}      initialDiff   Which tab to start active ('easy'|'medium'|'hard')
   */
  function initDiffTabs(diffTabBar, initialDiff) {
    if (!diffTabBar) return;

    var startDiff = initialDiff || 'easy';
    var tabs = diffTabBar.querySelectorAll('.lb-diff-tab');

    // Pre-select the correct tab
    tabs.forEach(function(tab) {
      var td = tab.dataset.diff;
      if (td === startDiff) {
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
      } else {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
      }
    });

    _currentDiff = startDiff;

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        _currentDiff = tab.dataset.diff;
        renderLeaderboard(_currentTbody, _currentHighlight, _currentDept, _currentDiff);
        updateDeptRank(_currentDeptRankEl, _currentDept, _currentHighlight, _currentDiff);
      });
    });

    // Re-render with initial difficulty
    renderLeaderboard(_currentTbody, _currentHighlight, _currentDept, _currentDiff);
    updateDeptRank(_currentDeptRankEl, _currentDept, _currentHighlight, _currentDiff);
  }

  /* ── Dept rank banner ─────────────────────────────────────────────── */

  /** Show dept-specific rank info banner */
  function updateDeptRank(el, dept, highlightTime, diffFilter) {
    if (!el) return;
    if (dept === 'ALL' || !highlightTime) { el.textContent = ''; return; }

    var diff = diffFilter || _currentDiff || 'ALL';
    var rank    = getRank(highlightTime, dept, diff);
    var entries = getEntries(dept, diff);
    var total   = entries.length;

    if (total === 0) { el.textContent = ''; return; }

    el.innerHTML = 'Your rank in <strong>' + dept + '</strong>: '
      + '<span class="lb-dept-rank-num">' + medalFor(rank) + ' #' + rank + '</span>'
      + ' of ' + total;
  }

  /* ── Expose globally ──────────────────────────────────────────────── */
  global.Leaderboard = {
    DEPARTMENTS:          DEPARTMENTS,
    DEPT_META:            DEPT_META,
    DIFFICULTIES:         DIFFICULTIES,
    DIFFICULTY_META:      DIFFICULTY_META,
    gridSizeToDifficulty: gridSizeToDifficulty,
    addEntry:             addEntry,
    getEntries:           getEntries,
    getRank:              getRank,
    isNewRecord:          isNewRecord,
    isNewDeptRecord:      isNewDeptRecord,
    clearLeaderboard:     clearLeaderboard,
    renderLeaderboard:    renderLeaderboard,
    initTabs:             initTabs,
    initDiffTabs:         initDiffTabs,
    normDept:             normDept,
    normDiff:             normDiff,
  };

})(window);
