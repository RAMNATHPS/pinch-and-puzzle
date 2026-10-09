/**
 * categories.js — Department-specific Puzzle Image Generator
 *
 * One hand-crafted engineering/technical image per department:
 *   CSE   — Binary Search Tree
 *   IT    — Network Topology
 *   AI&DS — Neural Network diagram
 *   CSBS  — ER / Business Process diagram
 *   Mech  — Gear Assembly
 *   Civil — Suspension Bridge Blueprint
 *   EEE   — Power Transmission System Blueprint
 *   ECE   — Oscilloscope Display (real instrument look)
 *   ECX   — IoT Wireless Sensor Network
 *
 * All images are drawn with Canvas 2D API — no external files needed.
 * Exported: window.PuzzleCategories
 */

(function (global) {
  'use strict';

  var SIZE = 480;

  /* ── Polyfills & Shared helpers ──────────────────────────────────── */

  // Polyfill for roundRect in older environments or embedded webviews
  if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
      if (!radii) {
        radii = 0;
      }
      var rTopLeft = 0, rTopRight = 0, rBottomRight = 0, rBottomLeft = 0;
      if (typeof radii === 'number') {
        rTopLeft = rTopRight = rBottomRight = rBottomLeft = radii;
      } else if (Array.isArray(radii)) {
        if (radii.length === 1) {
          rTopLeft = rTopRight = rBottomRight = rBottomLeft = radii[0];
        } else if (radii.length === 2) {
          rTopLeft = rBottomRight = radii[0];
          rTopRight = rBottomLeft = radii[1];
        } else if (radii.length === 3) {
          rTopLeft = radii[0];
          rTopRight = rBottomLeft = radii[1];
          rBottomRight = radii[2];
        } else if (radii.length >= 4) {
          rTopLeft = radii[0];
          rTopRight = radii[1];
          rBottomRight = radii[2];
          rBottomLeft = radii[3];
        }
      }
      rTopLeft = Math.min(rTopLeft, w / 2, h / 2);
      rTopRight = Math.min(rTopRight, w / 2, h / 2);
      rBottomRight = Math.min(rBottomRight, w / 2, h / 2);
      rBottomLeft = Math.min(rBottomLeft, w / 2, h / 2);

      this.moveTo(x + rTopLeft, y);
      this.lineTo(x + w - rTopRight, y);
      this.quadraticCurveTo(x + w, y, x + w, y + rTopRight);
      this.lineTo(x + w, y + h - rBottomRight);
      this.quadraticCurveTo(x + w, y + h, x + w - rBottomRight, y + h);
      this.lineTo(x + rBottomLeft, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - rBottomLeft);
      this.lineTo(x, y + rTopLeft);
      this.quadraticCurveTo(x, y, x + rTopLeft, y);
      this.closePath();
      return this;
    };
  }

  function makeCanvas() {
    var c = document.createElement('canvas');
    c.width = SIZE; c.height = SIZE;
    return c;
  }

  function bg(ctx, color, dotColor) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = dotColor;
    for (var x = 24; x < SIZE; x += 24) {
      for (var y = 24; y < SIZE; y += 24) {
        ctx.beginPath();
        ctx.arc(x, y, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  function txt(ctx, text, x, y, size, color, align) {
    ctx.save();
    ctx.font = 'bold ' + (size || 13) + 'px "Roboto Mono", monospace';
    ctx.fillStyle = color || '#fff';
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function titleBar(ctx, text, accent) {
    ctx.fillStyle = accent + '28';
    ctx.fillRect(0, 438, SIZE, 42);
    ctx.strokeStyle = accent + '55';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 438); ctx.lineTo(SIZE, 438); ctx.stroke();
    txt(ctx, text, SIZE / 2, 459, 11, accent);
  }

  /* ══════════════════════════════════════════════════════════════
     1. CSE — City Pathfinding on a Grid (A*)
     ══════════════════════════════════════════════════════════════ */
  function drawCSE() {
    var c = makeCanvas(), ctx = c.getContext('2d');

    // ── Blueprint background ──────────────────────────────────────
    ctx.fillStyle = '#d6e8f2';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Fine dot grid (blueprint paper)
    ctx.fillStyle = 'rgba(70,120,175,0.22)';
    for (var bdx = 9; bdx < SIZE; bdx += 9) {
      for (var bdy = 9; bdy < SIZE; bdy += 9) {
        ctx.beginPath(); ctx.arc(bdx, bdy, 0.65, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ── Grid parameters ───────────────────────────────────────────
    var COLS = 20, ROWS = 20;
    var cs = 17;           // cell size in pixels
    var gx = 62, gy = 42; // grid top-left pixel
    var gw = cs * COLS;    // 340
    var gh = cs * ROWS;    // 340

    // (col, row) → canvas pixel; col 1..20 left-right, row 1..20 bottom-top
    function cx(col) { return gx + (col - 1) * cs; }
    function cy(row) { return gy + (ROWS - row) * cs; }
    function ccx(col) { return cx(col) + cs / 2; }
    function ccy(row) { return cy(row) + cs / 2; }

    // ── Data ─────────────────────────────────────────────────────
    var PATH = [
      [2,2],[3,2],[3,3],[3,4],[4,4],[5,4],[5,5],[6,5],[7,5],
      [7,6],[8,6],[8,7],[9,7],[9,8],[10,8],[10,9],[10,10],
      [11,10],[11,11],[12,11],[12,12],[13,12],[13,13],[14,13],
      [14,14],[15,14],[15,15],[16,15],[16,16],[17,16],[17,17]
    ];
    var pathSet = {};
    PATH.forEach(function(p) { pathSet[p[0] + ',' + p[1]] = true; });

    var OBSTACLES = [
      [4,3],[5,3],[6,6],[8,8],[9,9],[11,9],[12,10],[14,12],[15,13],[16,14]
    ];
    var obsSet = {};
    OBSTACLES.forEach(function(o) { obsSet[o[0] + ',' + o[1]] = true; });

    // Explored: diagonal band (±4 cells) around the path
    var exploredCells = [];
    for (var ec = 1; ec <= 19; ec++) {
      for (var er = 1; er <= 19; er++) {
        var diagDist = Math.abs((er - 2) - (ec - 2));
        if (diagDist <= 4 && !pathSet[ec + ',' + er] && !obsSet[ec + ',' + er]) {
          exploredCells.push([ec, er]);
        }
      }
    }

    // ── Fill layers ───────────────────────────────────────────────
    // Base grid (pale blue)
    ctx.fillStyle = '#b4ccdc';
    ctx.fillRect(gx, gy, gw, gh);

    // Explored region (slightly lighter blue)
    exploredCells.forEach(function(e) {
      ctx.fillStyle = 'rgba(188,216,232,0.85)';
      ctx.fillRect(cx(e[0]) + 0.5, cy(e[1]) + 0.5, cs - 1, cs - 1);
    });

    // Obstacles (rounded gray blocks)
    OBSTACLES.forEach(function(o) {
      ctx.fillStyle = 'rgba(162,162,167,0.82)';
      ctx.beginPath();
      ctx.roundRect(cx(o[0]) + 1, cy(o[1]) + 1, cs - 2, cs - 2, 2);
      ctx.fill();
      // Subtle shadow
      ctx.fillStyle = 'rgba(90,90,95,0.18)';
      ctx.beginPath();
      ctx.roundRect(cx(o[0]) + 3, cy(o[1]) + 3, cs - 2, cs - 2, 2);
      ctx.fill();
    });

    // Optimal path (amber)
    PATH.forEach(function(p) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(cx(p[0]) + 0.5, cy(p[1]) + 0.5, cs - 1, cs - 1);
    });

    // ── Grid lines ────────────────────────────────────────────────
    ctx.strokeStyle = '#1a3a5c';
    ctx.lineWidth = 0.45;
    for (var ci = 0; ci <= COLS; ci++) {
      ctx.beginPath();
      ctx.moveTo(gx + ci * cs, gy);
      ctx.lineTo(gx + ci * cs, gy + gh);
      ctx.stroke();
    }
    for (var ri = 0; ri <= ROWS; ri++) {
      ctx.beginPath();
      ctx.moveTo(gx, gy + ri * cs);
      ctx.lineTo(gx + gw, gy + ri * cs);
      ctx.stroke();
    }
    // Border
    ctx.strokeStyle = '#1a3a5c';
    ctx.lineWidth = 2.2;
    ctx.strokeRect(gx, gy, gw, gh);

    // ── Arrow heads along path ────────────────────────────────────
    ctx.fillStyle = '#78350f';
    for (var pi = 0; pi < PATH.length - 1; pi++) {
      var pa = PATH[pi], pb = PATH[pi + 1];
      var ax1 = ccx(pa[0]), ay1 = ccy(pa[1]);
      var ax2 = ccx(pb[0]), ay2 = ccy(pb[1]);
      var adx = ax2 - ax1, ady = ay2 - ay1;
      var alen = Math.sqrt(adx * adx + ady * ady);
      var ux = adx / alen, uy = ady / alen;
      var mx = (ax1 + ax2) / 2, my = (ay1 + ay2) / 2;
      ctx.beginPath();
      ctx.moveTo(mx + ux * 3.5,  my + uy * 3.5);
      ctx.lineTo(mx + ux * 3.5 - ux * 5.5 + uy * 3, my + uy * 3.5 - uy * 5.5 - ux * 3);
      ctx.lineTo(mx + ux * 3.5 - ux * 5.5 - uy * 3, my + uy * 3.5 - uy * 5.5 + ux * 3);
      ctx.closePath();
      ctx.fill();
    }

    // ── Explored node indicators (open circles + short line) ──────
    var indicators = exploredCells.filter(function(_, i) { return i % 4 === 1; }).slice(0, 22);
    indicators.forEach(function(n) {
      ctx.strokeStyle = '#1a3a5c';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(ccx(n[0]), ccy(n[1]), 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ccx(n[0]) + 3, ccy(n[1]) - 3);
      ctx.lineTo(ccx(n[0]) + 8, ccy(n[1]) - 8);
      ctx.stroke();
    });

    // ── Start marker — green circle ───────────────────────────────
    ctx.beginPath();
    ctx.arc(ccx(2), ccy(2), 7.5, 0, Math.PI * 2);
    ctx.fillStyle = '#16a34a';
    ctx.fill();
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ── End marker — red circle ───────────────────────────────────
    ctx.beginPath();
    ctx.arc(ccx(17), ccy(17), 7.5, 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ── Axis numbers ──────────────────────────────────────────────
    ctx.font = '6.5px "Roboto Mono", monospace';
    ctx.fillStyle = '#1a3a5c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var col = 1; col <= COLS; col++) {
      ctx.fillText(String(col), ccx(col), gy - 10);       // top
      ctx.fillText(String(col), ccx(col), gy + gh + 10);  // bottom
    }
    for (var row = 1; row <= ROWS; row++) {
      ctx.fillText(String(row), gx - 8, ccy(row));          // left
      ctx.fillText(String(row), gx + gw + 8, ccy(row));     // right
    }

    // ── "ZONE A" dimension bracket at top ─────────────────────────
    var bracketY = gy - 24;
    ctx.strokeStyle = '#1a3a5c';
    ctx.fillStyle   = '#1a3a5c';
    ctx.lineWidth   = 0.9;
    // Horizontal bar
    ctx.beginPath(); ctx.moveTo(gx, bracketY); ctx.lineTo(gx + gw, bracketY); ctx.stroke();
    // Tick marks
    ctx.beginPath(); ctx.moveTo(gx,      gy - 18); ctx.lineTo(gx,      gy - 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx + gw, gy - 18); ctx.lineTo(gx + gw, gy - 30); ctx.stroke();
    // Arrowheads (inward)
    ctx.beginPath(); ctx.moveTo(gx,       bracketY); ctx.lineTo(gx + 6, bracketY - 3); ctx.lineTo(gx + 6, bracketY + 3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(gx + gw,  bracketY); ctx.lineTo(gx + gw - 6, bracketY - 3); ctx.lineTo(gx + gw - 6, bracketY + 3); ctx.closePath(); ctx.fill();
    // Labels
    ctx.font = 'bold 8px "Roboto Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ZONE A', gx + gw / 2, bracketY - 7);
    ctx.font = '7px "Roboto Mono", monospace';
    ctx.fillText('SEARCH GRID DIMS: 100m × 100m', gx + gw / 2, bracketY + 8);

    // ── Rotated side label ─────────────────────────────────────────
    ctx.save();
    ctx.translate(10, gy + gh / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = 'bold 7px "Roboto Mono", monospace';
    ctx.fillStyle = '#1a3a5c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ZONE A  ·  BLOCK 03', 0, 0);
    ctx.restore();

    // ── START / END labels ────────────────────────────────────────
    ctx.font = '7px "Roboto Mono", monospace';
    ctx.fillStyle = '#1a3a5c';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('START (2,2)',  ccx(2)  + 10, ccy(2));
    ctx.fillText('END (17,17)', ccx(17) + 10, ccy(17));

    // ── Legend ────────────────────────────────────────────────────
    var ly = gy + gh + 23;
    var legendItems = [
      { shape: 'circle', color: '#16a34a',              label: 'START NODE' },
      { shape: 'circle', color: '#dc2626',              label: 'END NODE' },
      { shape: 'rect',   color: '#f59e0b',              label: 'OPTIMAL PATH' },
      { shape: 'rect',   color: 'rgba(162,162,167,0.9)',label: 'OBSTACLES' },
      { shape: 'rect',   color: '#b4ccdc',              label: 'EXPLORED' },
    ];
    var colW = 90;
    var lxStart = (SIZE - legendItems.length * colW) / 2 + 4;
    legendItems.forEach(function(item, i) {
      var lx2 = lxStart + i * colW;
      if (item.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(lx2 + 5, ly + 4, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.strokeStyle = '#1a3a5c';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      } else {
        ctx.fillStyle = item.color;
        ctx.fillRect(lx2, ly, 11, 9);
        ctx.strokeStyle = '#1a3a5c';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(lx2, ly, 11, 9);
      }
      ctx.font = '6.5px "Roboto Mono", monospace';
      ctx.fillStyle = '#1a3a5c';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, lx2 + 14, ly + 4.5);
    });

    titleBar(ctx, '💻 CITY PATHFINDING — CSE DEPT', '#38bdf8');
    return c;
  }

  /* ══════════════════════════════════════════════════════════════
     2. IT — Network Topology
     ══════════════════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════════════
     2. IT — Live Cloud Architecture
     ══════════════════════════════════════════════════════════════ */
  function drawIT() {
    var c = makeCanvas(), ctx = c.getContext('2d');

    // ── Schematic background (light technical gray/blue) ──────────
    ctx.fillStyle = '#eff4f8';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Fine grid lines
    ctx.strokeStyle = 'rgba(148,163,184,0.22)';
    ctx.lineWidth = 0.6;
    for (var gx = 20; gx < SIZE; gx += 20) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, SIZE); ctx.stroke();
    }
    for (var gy = 20; gy < SIZE; gy += 20) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(SIZE, gy); ctx.stroke();
    }

    // Colors
    var navy  = '#1e293b';
    var blue  = '#0284c7';
    var amber = '#f59e0b';
    var amberDark = '#b45309';

    // Helper: draw an amber data dot
    function dataDot(x, y, r) {
      ctx.beginPath();
      ctx.arc(x, y, r || 3.5, 0, Math.PI * 2);
      ctx.fillStyle = amber;
      ctx.fill();
      ctx.strokeStyle = amberDark;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Helper: draw a curved connection line with dots
    function flowLine(x1, y1, x2, y2, dotProgressArray) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      var cx1 = x1 + (x2 - x1) * 0.45;
      var cy1 = y1;
      var cx2 = x1 + (x2 - x1) * 0.55;
      var cy2 = y2;
      ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
      ctx.strokeStyle = navy;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      if (dotProgressArray) {
        dotProgressArray.forEach(function(t) {
          var mt = 1 - t;
          var bx = mt*mt*mt*x1 + 3*mt*mt*t*cx1 + 3*mt*t*t*cx2 + t*t*t*x2;
          var by = mt*mt*mt*y1 + 3*mt*mt*t*cy1 + 3*mt*t*t*cy2 + t*t*t*y2;
          dataDot(bx, by, 3.2);
        });
      }
    }

    // ── 1. USERS Column (Left) ────────────────────────────────────
    var ux = 28, uy = 55, uw = 46, uh = 295;
    // Dashed border container
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(ux, uy, uw, uh);
    ctx.setLineDash([]);
    // Container Header
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(ux, uy, uw, 18);
    ctx.font = 'bold 8px "Roboto Mono", monospace';
    ctx.fillStyle = navy;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('USERS', ux + uw / 2, uy + 9);
    ctx.fillText('USERS', ux + uw / 2, uy + uh + 10);

    // 5 User icons
    var userYs = [88, 145, 202, 259, 316];
    userYs.forEach(function(py) {
      // Laptop / User silhouette
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = navy;
      ctx.lineWidth = 1.3;
      // Head
      ctx.beginPath(); ctx.arc(ux + uw/2, py - 10, 5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      // Shoulders
      ctx.beginPath();
      ctx.arc(ux + uw/2, py + 1, 9, Math.PI, 0);
      ctx.fill(); ctx.stroke();
      // Laptop base
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(ux + 8, py + 2, uw - 16, 8);
      ctx.strokeRect(ux + 8, py + 2, uw - 16, 8);
      ctx.fillStyle = navy;
      ctx.beginPath(); ctx.arc(ux + uw/2, py + 6, 1.2, 0, Math.PI*2); ctx.fill();
    });

    // "USER TRAFFIC (HTTP/S)" label
    ctx.font = '7.5px "Roboto Mono", monospace';
    ctx.fillStyle = navy;
    ctx.textAlign = 'left';
    ctx.fillText('USER TRAFFIC', 85, 92);
    ctx.fillText('(HTTP/S)', 85, 102);
    ctx.fillText('USER TRAFFIC', 90, 310);
    ctx.fillText('(HTTP/S)', 90, 320);

    // ── 2. CDN NODE ───────────────────────────────────────────────
    var cdnX = 142, cdnY = 175, cdnW = 68, cdnH = 68;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = navy;
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.roundRect(cdnX, cdnY, cdnW, cdnH, 6); ctx.fill(); ctx.stroke();
    // Globe & Cache icon inside CDN
    ctx.strokeStyle = blue; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cdnX + 26, cdnY + 34, 15, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cdnX + 26, cdnY + 34, 7, 15, 0, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cdnX + 11, cdnY + 34); ctx.lineTo(cdnX + 41, cdnY + 34); ctx.stroke();
    // Small database disks next to globe
    ctx.fillStyle = '#e0f2fe'; ctx.strokeStyle = navy; ctx.lineWidth = 1.2;
    [24, 32, 40].forEach(function(dy) {
      ctx.beginPath();
      ctx.ellipse(cdnX + 50, cdnY + dy, 9, 3.5, 0, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();
    });
    // Label
    ctx.font = 'bold 8.5px "Roboto Mono", monospace';
    ctx.fillStyle = navy;
    ctx.textAlign = 'center';
    ctx.fillText('CDN NODE', cdnX + cdnW/2, cdnY + cdnH + 11);
    ctx.font = '7px "Roboto Mono", monospace';
    ctx.fillText('(Content Delivery Network)', cdnX + cdnW/2, cdnY + cdnH + 21);
    // "EDGE CACHE" pointer
    ctx.font = '7.5px "Roboto Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('EDGE CACHE', cdnX + 22, cdnY - 8);
    ctx.beginPath(); ctx.moveTo(cdnX + 35, cdnY - 6); ctx.lineTo(cdnX + 35, cdnY); ctx.stroke();

    // ── 3. LOAD BALANCER ──────────────────────────────────────────
    var lbX = 260, lbY = 182, lbW = 56, lbH = 54;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = navy;
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.roundRect(lbX, lbY, lbW, lbH, 6); ctx.fill(); ctx.stroke();
    // Split arrows icon inside LB
    ctx.strokeStyle = navy; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lbX + 13, lbY + 27); ctx.lineTo(lbX + 25, lbY + 27);
    ctx.lineTo(lbX + 41, lbY + 16);
    ctx.moveTo(lbX + 25, lbY + 27); ctx.lineTo(lbX + 41, lbY + 38);
    ctx.stroke();
    // Arrowheads
    ctx.fillStyle = navy;
    ctx.beginPath(); ctx.moveTo(lbX+43, lbY+16); ctx.lineTo(lbX+37, lbY+12); ctx.lineTo(lbX+37, lbY+20); ctx.fill();
    ctx.beginPath(); ctx.moveTo(lbX+43, lbY+38); ctx.lineTo(lbX+37, lbY+34); ctx.lineTo(lbX+37, lbY+42); ctx.fill();
    // Amber node at split
    dataDot(lbX + 17, lbY + 27, 3.5);
    // Label
    ctx.font = 'bold 8.5px "Roboto Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LOAD', lbX + lbW/2, lbY + lbH + 11);
    ctx.fillText('BALANCER', lbX + lbW/2, lbY + lbH + 21);
    ctx.font = '7px "Roboto Mono", monospace';
    ctx.fillText('TRAFFIC DISTRIBUTION', lbX + lbW/2, lbY - 7);

    // ── 4. APP SERVERS Container ──────────────────────────────────
    var asX = 365, asY = 65, asW = 95, asH = 195;
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = navy;
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.roundRect(asX, asY, asW, asH, 6); ctx.fill(); ctx.stroke();
    // Header
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath(); ctx.roundRect(asX, asY, asW, 20, [6,6,0,0]); ctx.fill();
    ctx.font = 'bold 8.5px "Roboto Mono", monospace';
    ctx.fillStyle = navy;
    ctx.textAlign = 'center';
    ctx.fillText('APP SERVERS', asX + asW/2, asY + 10);

    // 3 App Server Rack Boxes
    var srvYs = [95, 150, 205];
    srvYs.forEach(function(sy, idx) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = navy;
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.roundRect(asX + 9, sy, asW - 18, 38, 4); ctx.fill(); ctx.stroke();
      // Trapezoid vent on server
      ctx.beginPath();
      ctx.moveTo(asX + 16, sy + 22);
      ctx.lineTo(asX + 22, sy + 7);
      ctx.lineTo(asX + asW - 22, sy + 7);
      ctx.lineTo(asX + asW - 16, sy + 22);
      ctx.closePath();
      ctx.fillStyle = '#e2e8f0'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 0.8; ctx.stroke();
      // LED indicator circle
      ctx.beginPath(); ctx.arc(asX + asW - 18, sy + 30, 2.5, 0, Math.PI*2);
      ctx.fillStyle = '#10b981'; ctx.fill(); ctx.strokeStyle = navy; ctx.stroke();
      // Server Label
      ctx.font = 'bold 7.5px "Roboto Mono", monospace';
      ctx.fillStyle = navy;
      ctx.textAlign = 'center';
      ctx.fillText('APP SERVER ' + (idx + 1), asX + asW/2, sy + 47);
    });

    // ── 5. DATABASE CLUSTER (CYLINDER) ────────────────────────────
    var dbX = 368, dbY = 330, dbW = 60, dbH = 58;
    // 3 stacked database disks
    [0, 15, 30].forEach(function(offset) {
      var dy = dbY + offset;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = navy;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(dbX + dbW/2, dy + 12, dbW/2, 11, 0, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.rect(dbX, dy + 12, dbW, 14);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(dbX, dy + 12); ctx.lineTo(dbX, dy + 26);
      ctx.moveTo(dbX + dbW, dy + 12); ctx.lineTo(dbX + dbW, dy + 26);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(dbX + dbW/2, dy + 26, dbW/2, 11, 0, 0, Math.PI);
      ctx.stroke();
      // Disk LED
      ctx.beginPath(); ctx.arc(dbX + dbW - 12, dy + 19, 2, 0, Math.PI*2);
      ctx.fillStyle = '#38bdf8'; ctx.fill(); ctx.strokeStyle = navy; ctx.stroke();
    });
    // Inner cylinder detail
    ctx.beginPath();
    ctx.ellipse(dbX + dbW/2, dbY + 12, dbW/4, 5, 0, 0, Math.PI*2);
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1; ctx.stroke();
    // Labels
    ctx.font = 'bold 8px "Roboto Mono", monospace';
    ctx.fillStyle = navy;
    ctx.textAlign = 'center';
    ctx.fillText('DATABASE CLUSTER', dbX + dbW/2, dbY + 77);
    ctx.font = '7px "Roboto Mono", monospace';
    ctx.fillText('(CYLINDER)', dbX + dbW/2, dbY + 87);
    // "DATA PERSISTENCE" side label
    ctx.textAlign = 'left';
    ctx.fillText('DATA', dbX + dbW + 8, dbY + 34);
    ctx.fillText('PERSISTENCE', dbX + dbW + 8, dbY + 44);

    // ── 6. CONNECTING FLOW LINES & AMBER DATA DOTS ────────────────
    // Users → CDN
    userYs.forEach(function(uyVal, i) {
      var dots = i % 2 === 0 ? [0.25, 0.75] : [0.4, 0.85];
      flowLine(ux + uw, uyVal, cdnX, cdnY + cdnH/2, dots);
    });

    // CDN → Load Balancer
    flowLine(cdnX + cdnW, cdnY + cdnH/2, lbX, lbY + lbH/2, [0.25, 0.5, 0.75]);

    // Load Balancer → App Servers
    flowLine(lbX + lbW, lbY + lbH/2 - 6, asX, 95 + 19,  [0.35, 0.75]);
    flowLine(lbX + lbW, lbY + lbH/2,     asX, 150 + 19, [0.5]);
    flowLine(lbX + lbW, lbY + lbH/2 + 6, asX, 205 + 19, [0.35, 0.75]);

    // App Servers → Database Cluster
    flowLine(asX + 25, 95 + 38,  dbX + 18, dbY + 8, [0.45, 0.8]);
    flowLine(asX + 45, 150 + 38, dbX + 30, dbY + 8, [0.5]);
    flowLine(asX + 65, 205 + 38, dbX + 42, dbY + 8, [0.35, 0.75]);

    // ── 7. DIMENSION BRACKETS & LATENCY LABELS ────────────────────
    ctx.strokeStyle = '#64748b';
    ctx.fillStyle = '#64748b';
    ctx.lineWidth = 0.8;

    // Top Left: "NETWORK PATH DISTANCE" (between x=74 and x=142)
    var dimY = 32;
    ctx.beginPath(); ctx.moveTo(74, dimY); ctx.lineTo(142, dimY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(74, dimY-5); ctx.lineTo(74, dimY+5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(142, dimY-5); ctx.lineTo(142, dimY+5); ctx.stroke();
    ctx.font = '7px "Roboto Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NETWORK PATH DISTANCE', 108, dimY - 6);

    // Top Right: "CDN TO LB LATENCY (msec)" (between x=210 and x=365)
    ctx.beginPath(); ctx.moveTo(210, dimY); ctx.lineTo(365, dimY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(210, dimY-5); ctx.lineTo(210, dimY+5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(365, dimY-5); ctx.lineTo(365, dimY+5); ctx.stroke();
    ctx.fillText('CDN TO LB LATENCY (msec)', 287, dimY - 6);

    // Left vertical dimension: "NETWORK PATH DISTANCE"
    ctx.save();
    ctx.translate(14, 202);
    ctx.rotate(-Math.PI / 2);
    ctx.beginPath(); ctx.moveTo(-115, 0); ctx.lineTo(115, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-115, -4); ctx.lineTo(-115, 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(115, -4); ctx.lineTo(115, 4); ctx.stroke();
    ctx.font = '7px "Roboto Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NETWORK PATH DISTANCE', 0, -6);
    ctx.restore();

    // Right vertical dimension: "CDN TO LB LATENCY"
    ctx.save();
    ctx.translate(468, 175);
    ctx.rotate(Math.PI / 2);
    ctx.beginPath(); ctx.moveTo(-65, 0); ctx.lineTo(65, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-65, -4); ctx.lineTo(-65, 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(65, -4); ctx.lineTo(65, 4); ctx.stroke();
    ctx.font = '7px "Roboto Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CDN TO LB LATENCY', 0, -6);
    ctx.restore();

    // Right lower vertical dimension: "APP TO DB (msec)"
    ctx.save();
    ctx.translate(468, 320);
    ctx.rotate(Math.PI / 2);
    ctx.font = '7px "Roboto Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('APP TO DB (msec)', 0, -4);
    ctx.restore();

    // ── 8. SCHEMATIC LEGEND (Bottom) ──────────────────────────────
    var legY = 416;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = navy;
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.roundRect(14, legY, SIZE - 28, 30, 4); ctx.fill(); ctx.stroke();

    ctx.font = 'bold 7px "Roboto Mono", monospace';
    ctx.fillStyle = navy;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('LEGEND:', 22, legY + 8);

    // Left legend items
    ctx.font = '7px "Roboto Mono", monospace';
    ctx.fillText('| USER ICON', 62, legY + 8);
    ctx.fillText('| CONNECTION LINE', 130, legY + 8);
    // Data dot icon in legend
    dataDot(225, legY + 8, 3);
    ctx.fillText('AMBER DATA DOT', 233, legY + 8);

    // Right legend items (Row 2)
    ctx.font = '6.5px "Roboto Mono", monospace';
    ctx.fillText('BLOCKS: CDN, LOAD BALANCER, APP SERVERS, DB CLUSTER', 22, legY + 21);
    ctx.fillStyle = navy;
    ctx.fillText('NAVY-BLUE: INFRASTRUCTURE', 245, legY + 21);
    ctx.fillStyle = amberDark;
    ctx.fillText('AMBER-GOLD: DATAFLOW', 362, legY + 21);

    titleBar(ctx, '🌐 LIVE CLOUD ARCHITECTURE — IT DEPT', '#38bdf8');
    return c;
  }

  /* ══════════════════════════════════════════════════════════════
     3. AI&DS — Neural Network Diagram
     ══════════════════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════════════
     3. AI&DS — CNN Architecture Schematic
     ══════════════════════════════════════════════════════════════ */
  function drawAIDS() {
    var c = makeCanvas(), ctx = c.getContext('2d');

    // ── Schematic background (light technical gray/blue) ──────────
    ctx.fillStyle = '#eff4f8';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Fine grid lines
    ctx.strokeStyle = 'rgba(148,163,184,0.22)';
    ctx.lineWidth = 0.6;
    for (var gx = 20; gx < SIZE; gx += 20) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, SIZE); ctx.stroke();
    }
    for (var gy = 20; gy < SIZE; gy += 20) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(SIZE, gy); ctx.stroke();
    }

    // Colors
    var navy      = '#1e293b';
    var blue      = '#0284c7';
    var amber     = '#f59e0b';
    var amberDark = '#b45309';

    // Helper: draw an amber data dot
    function dataDot(x, y, r) {
      ctx.beginPath();
      ctx.arc(x, y, r || 3.2, 0, Math.PI * 2);
      ctx.fillStyle = amber;
      ctx.fill();
      ctx.strokeStyle = amberDark;
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }

    // Helper: draw 3D tensor stack (for Conv/Pool layers)
    function draw3DGrid(x, y, w, h, layersCount, dx, dy, labelTop) {
      for (var l = layersCount - 1; l >= 0; l--) {
        var px = x + l * dx;
        var py = y + l * dy;
        ctx.fillStyle = l === 0 ? '#ffffff' : '#f1f5f9';
        ctx.strokeStyle = navy;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.rect(px, py, w, h);
        ctx.fill();
        ctx.stroke();

        // Front face grid mesh
        if (l === 0) {
          ctx.strokeStyle = 'rgba(30,41,59,0.35)';
          ctx.lineWidth = 0.7;
          var cols = 4, rows = Math.max(3, Math.round(h / 12));
          for (var ci = 1; ci < cols; ci++) {
            ctx.beginPath();
            ctx.moveTo(px + (w / cols) * ci, py);
            ctx.lineTo(px + (w / cols) * ci, py + h);
            ctx.stroke();
          }
          for (var ri = 1; ri < rows; ri++) {
            ctx.beginPath();
            ctx.moveTo(px, py + (h / rows) * ri);
            ctx.lineTo(px + w, py + (h / rows) * ri);
            ctx.stroke();
          }
        }
      }
      if (labelTop) {
        ctx.font = '6.5px "Roboto Mono", monospace';
        ctx.fillStyle = navy;
        ctx.textAlign = 'center';
        ctx.fillText(labelTop, x + w / 2 + (layersCount * dx) / 2, y + (layersCount * dy) - 7);
      }
    }

    // ── 1. INPUT IMAGE (Left) ─────────────────────────────────────
    var imgX = 16, imgY = 192, imgW = 38, imgH = 38;
    ctx.fillStyle = '#fef3c7';
    ctx.strokeStyle = navy;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.rect(imgX, imgY, imgW, imgH); ctx.fill(); ctx.stroke();
    // Cute cat silhouette in input box
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(imgX + 19, imgY + 23, 9, 0, Math.PI * 2); // head
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(imgX + 12, imgY + 17); ctx.lineTo(imgX + 10, imgY + 10); ctx.lineTo(imgX + 16, imgY + 15); // left ear
    ctx.moveTo(imgX + 26, imgY + 17); ctx.lineTo(imgX + 28, imgY + 10); ctx.lineTo(imgX + 22, imgY + 15); // right ear
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(imgX + 16, imgY + 22, 1.5, 0, Math.PI * 2);
    ctx.arc(imgX + 22, imgY + 22, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Label below
    ctx.font = 'bold 7.5px "Roboto Mono", monospace';
    ctx.fillStyle = navy;
    ctx.textAlign = 'center';
    ctx.fillText('INPUT', imgX + imgW/2, imgY + imgH + 12);
    ctx.fillText('IMAGE', imgX + imgW/2, imgY + imgH + 22);
    ctx.font = '6.5px "Roboto Mono", monospace';
    ctx.fillText('224x224x3', imgX + imgW/2, imgY + imgH + 32);

    // ── 2. CONV LAYER 1 ───────────────────────────────────────────
    var c1X = 78, c1Y = 158, c1W = 14, c1H = 95;
    draw3DGrid(c1X, c1Y, c1W, c1H, 4, 4, -4, 'CONV KERNELS');
    // Labels below
    ctx.font = 'bold 7.5px "Roboto Mono", monospace';
    ctx.fillStyle = navy;
    ctx.textAlign = 'center';
    ctx.fillText('CONV', c1X + 10, c1Y + c1H + 12);
    ctx.fillText('LAYER 1', c1X + 10, c1Y + c1H + 22);
    ctx.font = '6.5px "Roboto Mono", monospace';
    ctx.fillText('112x112x64', c1X + 10, c1Y + c1H + 32);
    // Channel depth annotation
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(c1X, c1Y + c1H + 4); ctx.lineTo(c1X + 16, c1Y + c1H + 4); ctx.stroke();
    ctx.font = '6px "Roboto Mono", monospace';
    ctx.fillText('CHANNEL', c1X + 25, c1Y + c1H - 12);
    ctx.fillText('DEPTH', c1X + 25, c1Y + c1H - 4);

    // ── 3. CONV LAYER 2 ───────────────────────────────────────────
    var c2X = 142, c2Y = 176, c2W = 11, c2H = 62;
    draw3DGrid(c2X, c2Y, c2W, c2H, 3, 4, -4, null);
    ctx.font = 'bold 7.5px "Roboto Mono", monospace';
    ctx.fillStyle = navy;
    ctx.textAlign = 'center';
    ctx.fillText('CONV', c2X + 8, c1Y + c1H + 12);
    ctx.fillText('LAYER 2', c2X + 8, c1Y + c1H + 22);
    ctx.font = '6.5px "Roboto Mono", monospace';
    ctx.fillText('56x56x128', c2X + 8, c1Y + c1H + 32);

    // ── 4. POOLING LAYER ──────────────────────────────────────────
    var pX = 192, pY = 188, pW = 9, pH = 38;
    draw3DGrid(pX, pY, pW, pH, 2, 3, -3, null);
    // Max pool up-arrow
    ctx.strokeStyle = navy; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(pX + 5, pY + pH + 22); ctx.lineTo(pX + 5, pY + pH + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pX + 2, pY + pH + 9); ctx.lineTo(pX + 5, pY + pH + 6); ctx.lineTo(pX + 8, pY + pH + 9); ctx.stroke();
    ctx.font = '6.5px "Roboto Mono", monospace';
    ctx.fillStyle = navy;
    ctx.textAlign = 'center';
    ctx.fillText('MAX', pX + 5, pY + pH + 30);
    ctx.fillText('POOL', pX + 5, pY + pH + 38);
    ctx.fillText('2x2', pX + 5, pY + pH + 46);
    // Label below
    ctx.font = 'bold 7.5px "Roboto Mono", monospace';
    ctx.fillText('POOLING', pX + 5, c1Y + c1H + 12);
    ctx.fillText('LAYER', pX + 5, c1Y + c1H + 22);
    ctx.font = '6.5px "Roboto Mono", monospace';
    ctx.fillText('28x28x128', pX + 5, c1Y + c1H + 32);

    // ── 5. CONV LAYER 3 ───────────────────────────────────────────
    var c3X = 232, c3Y = 194, c3W = 7, c3H = 28;
    draw3DGrid(c3X, c3Y, c3W, c3H, 3, 3, -3, null);
    ctx.font = 'bold 7.5px "Roboto Mono", monospace';
    ctx.fillStyle = navy;
    ctx.textAlign = 'center';
    ctx.fillText('CONV', c3X + 6, c1Y + c1H + 12);
    ctx.fillText('LAYER 3', c3X + 6, c1Y + c1H + 22);
    ctx.font = '6.5px "Roboto Mono", monospace';
    ctx.fillText('14x14x256', c3X + 6, c1Y + c1H + 32);

    // ── 6. FLATTEN COLUMN ─────────────────────────────────────────
    var flX = 274, flY = 156, flW = 10, flH = 100;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = navy;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.roundRect(flX, flY, flW, flH, 4); ctx.fill(); ctx.stroke();
    // Rotated text inside Flatten
    ctx.save();
    ctx.translate(flX + 7, flY + flH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = 'bold 7.5px "Roboto Mono", monospace';
    ctx.fillStyle = navy;
    ctx.textAlign = 'center';
    ctx.fillText('FLATTEN', 0, 0);
    ctx.restore();
    // Label below
    ctx.font = 'bold 7.5px "Roboto Mono", monospace';
    ctx.fillStyle = navy;
    ctx.textAlign = 'center';
    ctx.fillText('FLATTEN', flX + 5, flY + flH + 15);
    ctx.font = '6.5px "Roboto Mono", monospace';
    ctx.fillText('1x1x50176', flX + 5, flY + flH + 25);

    // ── 7. DENSE FULLY-CONNECTED LAYERS ───────────────────────────
    var d1X = 320, d2X = 362, d3X = 400;
    var d1Nodes = [], d2Nodes = [], d3Nodes = [];
    // Dense Layer 1 (11 nodes)
    for (var n1 = 0; n1 < 11; n1++) {
      var ny1 = 96 + n1 * 22;
      d1Nodes.push({ x: d1X, y: ny1 });
    }
    // Dense Layer 2 (9 nodes)
    for (var n2 = 0; n2 < 9; n2++) {
      var ny2 = 118 + n2 * 22;
      d2Nodes.push({ x: d2X, y: ny2 });
    }
    // Dense Output (5 nodes)
    for (var n3 = 0; n3 < 5; n3++) {
      var ny3 = 162 + n3 * 22;
      d3Nodes.push({ x: d3X, y: ny3 });
    }

    // Connect Flatten edge to Dense 1 (dense mesh)
    var flNodes = [175, 195, 210, 225, 240];
    flNodes.forEach(function(fy) {
      d1Nodes.forEach(function(dn1) {
        ctx.strokeStyle = 'rgba(30,58,138,0.22)';
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(flX + flW, fy); ctx.lineTo(dn1.x, dn1.y); ctx.stroke();
      });
    });

    // Connect Dense 1 to Dense 2
    d1Nodes.forEach(function(dn1) {
      d2Nodes.forEach(function(dn2) {
        ctx.strokeStyle = 'rgba(30,58,138,0.25)';
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(dn1.x, dn1.y); ctx.lineTo(dn2.x, dn2.y); ctx.stroke();
      });
    });

    // Connect Dense 2 to Dense Output
    d2Nodes.forEach(function(dn2) {
      d3Nodes.forEach(function(dn3) {
        ctx.strokeStyle = 'rgba(30,58,138,0.28)';
        ctx.lineWidth = 0.75;
        ctx.beginPath(); ctx.moveTo(dn2.x, dn2.y); ctx.lineTo(dn3.x, dn3.y); ctx.stroke();
      });
    });

    // Highlighted amber feature paths across Dense layers
    var amberPaths = [
      [{x:flX+flW,y:195}, d1Nodes[2], d2Nodes[2], d3Nodes[1]],
      [{x:flX+flW,y:210}, d1Nodes[5], d2Nodes[4], d3Nodes[2]],
      [{x:flX+flW,y:225}, d1Nodes[7], d2Nodes[6], d3Nodes[3]]
    ];
    amberPaths.forEach(function(p) {
      for (var i = 0; i < p.length - 1; i++) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(p[i].x, p[i].y); ctx.lineTo(p[i+1].x, p[i+1].y); ctx.stroke();
        var mx = (p[i].x + p[i+1].x) / 2;
        var my = (p[i].y + p[i+1].y) / 2;
        dataDot(mx, my, 2.7);
      }
    });

    // Draw all circular nodes
    function drawNodeArray(nodesArr) {
      nodesArr.forEach(function(nd, idx) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = navy;
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(nd.x, nd.y, 4.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
    }
    drawNodeArray(d1Nodes);
    drawNodeArray(d2Nodes);
    drawNodeArray(d3Nodes);

    // Labels below Dense layers
    ctx.font = 'bold 7.5px "Roboto Mono", monospace';
    ctx.fillStyle = navy;
    ctx.textAlign = 'center';
    ctx.fillText('DENSE', d1X, c1Y + c1H + 42);
    ctx.fillText('FULLY-CONNECTED', d1X, c1Y + c1H + 52);
    ctx.fillText('LAYER', d1X, c1Y + c1H + 62);
    ctx.font = '6.5px "Roboto Mono", monospace';
    ctx.fillText('1x1x4096', d1X, c1Y + c1H + 72);

    ctx.font = 'bold 7.5px "Roboto Mono", monospace';
    ctx.fillText('DENSE', d2X, c1Y + c1H + 42);
    ctx.fillText('LAYER 2', d2X, c1Y + c1H + 52);

    ctx.fillText('OUTPUT', d3X, c1Y + c1H + 42);
    ctx.fillText('DENSE', d3X, c1Y + c1H + 52);
    ctx.fillText('LAYER', d3X, c1Y + c1H + 62);
    ctx.font = '6.5px "Roboto Mono", monospace';
    ctx.fillText('1x1xN', d3X, c1Y + c1H + 72);

    // ── 8. OUTPUT LABEL (Right Card) ──────────────────────────────
    var outX = 422, outY = 166, outW = 46, outH = 78;
    // Arrow lines from output nodes to card
    d3Nodes.forEach(function(nd) {
      ctx.strokeStyle = navy; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(nd.x + 4, nd.y); ctx.lineTo(outX, outY + outH / 2); ctx.stroke();
      dataDot((nd.x + 4 + outX) / 2, (nd.y + outY + outH / 2) / 2, 2.8);
    });
    // Card background
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = navy;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.roundRect(outX, outY, outW, outH, 6); ctx.fill(); ctx.stroke();
    // Header
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath(); ctx.roundRect(outX, outY, outW, 18, [6,6,0,0]); ctx.fill();
    ctx.font = 'bold 7.5px "Roboto Mono", monospace';
    ctx.fillStyle = navy;
    ctx.textAlign = 'center';
    ctx.fillText('OUTPUT', outX + outW / 2, outY + 8);
    ctx.fillText('LABEL', outX + outW / 2, outY + 16);
    // Classification text
    ctx.font = '6.5px "Roboto Mono", monospace';
    ctx.fillText('CLASSIFICATION:', outX + outW / 2, outY + 30);
    ctx.font = 'bold 9px "Roboto Mono", monospace';
    ctx.fillText('CAT', outX + outW / 2, outY + 43);
    // Amber 98.5% confidence badge button
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = amberDark;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(outX + 4, outY + 52, outW - 8, 20, 5); ctx.fill(); ctx.stroke();
    ctx.font = 'bold 6.8px "Roboto Mono", monospace';
    ctx.fillStyle = navy;
    ctx.fillText('98.5%', outX + outW / 2, outY + 60);
    ctx.fillText('CONFIDENCE', outX + outW / 2, outY + 68);

    // ── 9. DIMENSION BRACKETS & PARAMETER SPANS ───────────────────
    ctx.strokeStyle = '#64748b';
    ctx.fillStyle = '#64748b';
    ctx.lineWidth = 0.8;

    // Top Brackets (y = 35)
    var topY = 35;
    function hDim(x1, x2, labelText) {
      ctx.beginPath(); ctx.moveTo(x1, topY); ctx.lineTo(x2, topY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1, topY - 4); ctx.lineTo(x1, topY + 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2, topY - 4); ctx.lineTo(x2, topY + 4); ctx.stroke();
      ctx.font = '6.5px "Roboto Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(labelText, (x1 + x2) / 2, topY - 6);
    }
    hDim(45, 175, 'CONV KERNELS');
    hDim(175, 255, 'POOLING LAYER');
    ctx.font = '6.5px "Roboto Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FLATTEN', 279, topY - 11);
    ctx.fillText('ARROW', 279, topY - 3);
    hDim(305, 412, 'TOTAL PARAMETERS');

    // Bottom Dimension Span (y = 378)
    var botY = 378;
    ctx.beginPath(); ctx.moveTo(78, botY); ctx.lineTo(396, botY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(78, botY - 5); ctx.lineTo(78, botY + 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(396, botY - 5); ctx.lineTo(396, botY + 5); ctx.stroke();
    ctx.font = 'bold 7px "Roboto Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TOTAL PARAMETERS', 237, botY - 6);

    // ── 10. SCHEMATIC LEGEND (Bottom) ─────────────────────────────
    var legY = 416;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = navy;
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.roundRect(14, legY, SIZE - 28, 30, 4); ctx.fill(); ctx.stroke();

    ctx.font = 'bold 7px "Roboto Mono", monospace';
    ctx.fillStyle = navy;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('LEGEND:', 22, legY + 8);

    // Left legend items
    ctx.font = '7px "Roboto Mono", monospace';
    ctx.fillText('| NAVY LINE: STRUCTURE', 64, legY + 8);
    // Data dot icon in legend
    dataDot(183, legY + 8, 2.7);
    ctx.fillText('AMBER-GOLD DOTS: FEATURE FLOW', 190, legY + 8);
    ctx.fillText('| CONV LAYER: GRID STACK', 338, legY + 8);

    // Right legend items (Row 2)
    ctx.font = '6.5px "Roboto Mono", monospace';
    ctx.fillText('| DENSE LAYER: NODE ARRAY', 22, legY + 21);
    ctx.fillText('| OUTPUT: LABEL & BADGE', 145, legY + 21);
    ctx.fillText('| BACKGROUND: LIGHT GRAY', 260, legY + 21);
    ctx.fillStyle = amberDark;
    ctx.fillText('SCHEMATIC STYLE: HIGH DETAIL', 370, legY + 21);

    titleBar(ctx, '🤖 CNN ARCHITECTURE — AI&DS DEPT', '#a78bfa');
    return c;
  }

  /* ══════════════════════════════════════════════════════════════
     4. CSBS — Star Schema / Data Warehouse Diagram
     ══════════════════════════════════════════════════════════════ */
  function drawCSBS() {
    var c = makeCanvas(), ctx = c.getContext('2d');

    // ── Schematic background ──────────────────────────────────────
    ctx.fillStyle = '#eff4f8';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = 'rgba(148,163,184,0.22)';
    ctx.lineWidth = 0.6;
    for (var gx = 20; gx < SIZE; gx += 20) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, SIZE); ctx.stroke();
    }
    for (var gy = 20; gy < SIZE; gy += 20) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(SIZE, gy); ctx.stroke();
    }

    var navy      = '#1e293b';
    var amber     = '#f59e0b';
    var amberDark = '#b45309';

    // ── Helper: amber connector dot ───────────────────────────────
    function dot(x, y) {
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = amber; ctx.fill();
      ctx.strokeStyle = amberDark; ctx.lineWidth = 1; ctx.stroke();
    }

    // ── Helper: draw a dimension / fact table card ─────────────────
    // headerLines: array of strings for the bold header area
    // rows: array of strings for the body
    function schemaCard(x, y, w, bodyRows, headerLines, isFact) {
      var lineH   = 14;
      var headerH = headerLines.length * 16 + 8;
      var bodyH   = bodyRows.length * lineH + 6;
      var totalH  = headerH + bodyH;

      // Drop shadow
      ctx.fillStyle = 'rgba(30,41,59,0.10)';
      ctx.beginPath(); ctx.roundRect(x + 3, y + 3, w, totalH, 6); ctx.fill();

      // Card body
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = navy;
      ctx.lineWidth = isFact ? 2.2 : 1.6;
      ctx.beginPath(); ctx.roundRect(x, y, w, totalH, 6); ctx.fill(); ctx.stroke();

      // Header fill
      ctx.fillStyle = isFact ? '#1e3a5f' : '#1e293b';
      ctx.beginPath(); ctx.roundRect(x, y, w, headerH, [6, 6, 0, 0]); ctx.fill();

      // Header text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px "Roboto Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      headerLines.forEach(function(hl, i) {
        ctx.fillText(hl, x + w / 2, y + 10 + i * 16);
      });

      // Divider line
      ctx.strokeStyle = 'rgba(30,41,59,0.2)';
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(x, y + headerH); ctx.lineTo(x + w, y + headerH); ctx.stroke();

      // Body rows
      ctx.font = '7px "Roboto Mono", monospace';
      ctx.fillStyle = navy;
      ctx.textAlign = 'left';
      bodyRows.forEach(function(row, i) {
        var isPK = row.indexOf('(PK)') !== -1;
        var isFK = row.indexOf('(FK)') !== -1;
        ctx.fillStyle = isPK ? '#0284c7' : (isFK ? '#7c3aed' : navy);
        ctx.font = isPK ? 'bold 7px "Roboto Mono", monospace' : '7px "Roboto Mono", monospace';
        ctx.fillText(row, x + 6, y + headerH + 9 + i * lineH);
      });

      // Return center coordinates
      return { cx: x + w / 2, cy: y + totalH / 2, top: y, bottom: y + totalH, left: x, right: x + w };
    }

    // ── Helper: draw a KPI mini-card ───────────────────────────────
    function kpiCard(x, y, w, h, title, chartFn) {
      ctx.fillStyle = 'rgba(30,41,59,0.08)';
      ctx.beginPath(); ctx.roundRect(x + 2, y + 2, w, h, 5); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = navy; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.roundRect(x, y, w, h, 5); ctx.fill(); ctx.stroke();
      ctx.font = 'bold 6.5px "Roboto Mono", monospace';
      ctx.fillStyle = navy; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(title, x + w / 2, y + 9);
      // inner chart area
      ctx.strokeStyle = 'rgba(30,41,59,0.15)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(x + 4, y + 16); ctx.lineTo(x + w - 4, y + 16); ctx.stroke();
      if (chartFn) chartFn(x, y, w, h);
    }

    // ── 1. FACT TABLE (centre) ────────────────────────────────────
    var fW = 120, fX = (SIZE - fW) / 2, fY = 148;
    var fact = schemaCard(fX, fY, fW,
      ['Sales_ID (PK)', 'Time_ID (FK)', 'Product_ID (FK)',
       'Customer_ID (FK)', 'Region_ID (FK)', 'Order_Number',
       'Quantity', 'Sales_Amount', 'Discount', 'Unit_Price'],
      ['FACT TABLE', '(SALES TRANSACTION)'], true);

    // ── 2. TIME DIMENSION (top-left) ─────────────────────────────
    var dW = 106;
    var time = schemaCard(24, 80, dW,
      ['Time_ID (PK)', 'Date', 'Month', 'Quarter', 'Year', 'Day_of_Week'],
      ['TIME', 'DIMENSION'], false);

    // ── 3. PRODUCT DIMENSION (top-right) ─────────────────────────
    var prod = schemaCard(SIZE - dW - 24, 80, dW,
      ['Product_ID (PK)', 'Product_Name', 'Category', 'Sub-category', 'Brand', 'Unit_Cost'],
      ['PRODUCT', 'DIMENSION'], false);

    // ── 4. CUSTOMER DIMENSION (bottom-left) ─────────────────────
    var cust = schemaCard(24, 310, dW,
      ['Customer_ID (PK)', 'Customer_Name', 'Segment', 'Loyalty_Tier', 'City', 'State'],
      ['CUSTOMER', 'DIMENSION'], false);

    // ── 5. REGION DIMENSION (bottom-right) ───────────────────────
    var reg = schemaCard(SIZE - dW - 24, 310, dW,
      ['Region_ID (PK)', 'Region_Name', 'Country', 'Territory', 'Sales_Manager'],
      ['REGION', 'DIMENSION'], false);

    // ── 6. CONNECTOR LINES + DOTS ────────────────────────────────
    ctx.strokeStyle = navy; ctx.lineWidth = 1.5;

    function connLine(x1, y1, x2, y2) {
      // Arrow from dim to fact
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      // Arrowhead near fact
      var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx*dx+dy*dy);
      var ux = dx/len, uy = dy/len;
      var ax = x2 - ux*8, ay = y2 - uy*8;
      var px = -uy, py = ux;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(ax + px*4, ay + py*4);
      ctx.lineTo(ax - px*4, ay - py*4);
      ctx.closePath();
      ctx.fillStyle = navy; ctx.fill();
    }

    // TIME → FACT
    var tx1 = time.right, ty1 = time.cy;
    var tx2 = fact.left, ty2 = fact.top + 22;
    connLine(tx1, ty1, tx2, ty2);
    dot(tx1, ty1);

    // PRODUCT → FACT
    var px1 = prod.left, py1 = prod.cy;
    var px2 = fact.right, py2 = fact.top + 22;
    connLine(px1, py1, px2, py2);
    dot(px1, py1);

    // CUSTOMER → FACT
    var cx1 = cust.right, cy1 = cust.cy;
    var cx2 = fact.left, cy2 = fact.bottom - 40;
    connLine(cx1, cy1, cx2, cy2);
    dot(cx1, cy1);

    // REGION → FACT
    var rx1 = reg.left, ry1 = reg.cy;
    var rx2 = fact.right, ry2 = fact.bottom - 40;
    connLine(rx1, ry1, rx2, ry2);
    dot(rx1, ry1);

    // ── 7. KPI CARDS ─────────────────────────────────────────────
    // TOTAL SALES (top centre-left)
    kpiCard(148, 42, 68, 50, 'TOTAL SALES', function(x, y, w, h) {
      // Line chart trending up
      ctx.strokeStyle = '#1e3a5f'; ctx.lineWidth = 1.5;
      var pts = [[x+8,y+42],[x+18,y+36],[x+28,y+32],[x+40,y+26],[x+52,y+20],[x+w-8,y+22]];
      ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
      for (var i=1;i<pts.length;i++) ctx.lineTo(pts[i][0],pts[i][1]);
      ctx.stroke();
      // 7.6% badge
      ctx.fillStyle = '#10b981'; ctx.font = 'bold 7px "Roboto Mono",monospace';
      ctx.textAlign = 'center'; ctx.fillText('▲ 7.6%', x+w/2, y+h-6);
    });

    // SALES YTD (top centre-right)
    kpiCard(224, 42, 68, 50, 'SALES YTD', function(x, y, w, h) {
      // Bar chart (navy + amber bars)
      var bars = [[0.4,navy],[0.55,navy],[0.7,navy],[0.9,amber]];
      var bW = 9, bBase = y + h - 6;
      bars.forEach(function(b, i) {
        var bH = (h - 24) * b[0];
        ctx.fillStyle = b[1];
        ctx.fillRect(x + 8 + i * (bW + 5), bBase - bH, bW, bH);
      });
      // Year labels
      ctx.font = '5.5px "Roboto Mono",monospace'; ctx.fillStyle = navy;
      ['18','19','20','23'].forEach(function(yr,i){
        ctx.textAlign='center';
        ctx.fillText(yr, x+12+i*(bW+5), bBase+5);
      });
    });

    // CUSTOMER COUNT (right-mid, near PRODUCT dim)
    kpiCard(SIZE-80, 186, 66, 38, 'CUSTOMER', function(x, y, w, h) {
      ctx.font = '6px "Roboto Mono",monospace'; ctx.fillStyle = '#0284c7';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('COUNT', x+w/2, y+24);
      // person icon
      ctx.beginPath(); ctx.arc(x+w/2-16, y+26, 4, 0, Math.PI*2);
      ctx.fillStyle = '#0284c7'; ctx.fill();
      ctx.beginPath(); ctx.arc(x+w/2-16, y+33, 6, Math.PI, 0);
      ctx.fill();
      ctx.font = 'bold 6px "Roboto Mono",monospace';
      ctx.fillStyle = navy; ctx.fillText('METRIC', x+w/2+4, y+29);
    });

    // PRODUCT PENETRATION (right-low)
    kpiCard(SIZE-80, 238, 66, 40, 'PRODUCT', function(x, y, w, h) {
      ctx.font = '5.5px "Roboto Mono",monospace';
      ctx.fillStyle = navy; ctx.textAlign='center';
      ctx.fillText('PENETRATION', x+w/2, y+24);
      // small bar chart
      [[0.5,navy],[0.8,amber],[0.6,navy],[0.9,amber]].forEach(function(b,i){
        var bH = 10*b[0], bW2 = 7;
        ctx.fillStyle = b[1];
        ctx.fillRect(x+8+i*(bW2+3), y+h-6-bH, bW2, bH);
      });
    });

    // MARGIN % (bottom centre-left)
    kpiCard(148, 388, 68, 46, 'MARGIN %', function(x, y, w, h) {
      // Zigzag line
      ctx.strokeStyle = '#1e3a5f'; ctx.lineWidth = 1.4;
      var mpts = [[x+6,y+36],[x+16,y+24],[x+26,y+34],[x+36,y+22],[x+46,y+30],[x+w-6,y+26]];
      ctx.beginPath(); ctx.moveTo(mpts[0][0],mpts[0][1]);
      for (var i=1;i<mpts.length;i++) ctx.lineTo(mpts[i][0],mpts[i][1]);
      ctx.stroke();
    });

    // UNITS SOLD (bottom centre-right)
    kpiCard(224, 388, 68, 46, 'UNITS SOLD', function(x, y, w, h) {
      [[0.6,amber],[0.85,navy],[0.5,amber],[0.9,navy]].forEach(function(b,i){
        var bH = (h-26)*b[0], bW3 = 9;
        ctx.fillStyle = b[1];
        ctx.fillRect(x+6+i*(bW3+5), y+h-8-bH, bW3, bH);
      });
    });

    // ── 8. SCHEMATIC LEGEND (Bottom) ─────────────────────────────
    var legY = 436;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = navy; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.roundRect(14, legY, SIZE-28, 30, 4); ctx.fill(); ctx.stroke();
    ctx.font = 'bold 7px "Roboto Mono", monospace';
    ctx.fillStyle = navy; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('LEGEND:', 22, legY + 8);
    ctx.font = '7px "Roboto Mono", monospace';
    ctx.fillText('| NAVY BLUE: SCHEMA STRUCTURE', 64, legY + 8);
    dot(203, legY + 8);
    ctx.fillStyle = amberDark;
    ctx.fillText('AMBER GOLD: KPI ACCENTS', 210, legY + 8);
    ctx.fillStyle = navy;
    ctx.fillText('| GRAY: TEXT & LINES', 340, legY + 8);
    ctx.font = '6.5px "Roboto Mono", monospace';
    ctx.fillText('VECTOR SCHEMATIC STYLE', 22, legY + 21);
    ctx.fillText('| BACKGROUND: LIGHT GRAY', 130, legY + 21);
    ctx.fillStyle = '#0284c7'; ctx.fillText('PK: PRIMARY KEY', 265, legY + 21);
    ctx.fillStyle = '#7c3aed'; ctx.fillText('| FK: FOREIGN KEY', 360, legY + 21);

    titleBar(ctx, '📊 STAR SCHEMA — CSBS DEPT', '#4ade80');
    return c;
  }

  /* ══════════════════════════════════════════════════════════════
     5. MECH — Engine Cross-Section Blueprint
     ══════════════════════════════════════════════════════════════ */
  function drawMech() {
    var c = makeCanvas(), ctx = c.getContext('2d');

    // ── Blueprint background ──────────────────────────────────────
    ctx.fillStyle = '#dde8f4';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = 'rgba(90,130,190,0.20)'; ctx.lineWidth = 0.65;
    for (var gx = 12; gx < SIZE; gx += 12) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,SIZE); ctx.stroke(); }
    for (var gy = 12; gy < SIZE; gy += 12) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(SIZE,gy); ctx.stroke(); }

    var navy = '#1a3a6b', gold = '#c5a040', blue = '#2060d0';

    // ── Layout constants ─────────────────────────────────────────
    var CX        = 234, BR = 87;
    var bL        = CX - BR, bR = CX + BR, WW = 13;
    var LV_X      = bL + 22, RV_X = bR - 22;
    var HEAD_TOP  = 126, HEAD_BOT = 148;
    var CYL_BOT   = 306;
    var PISTON_T  = 210, PISTON_B = 268;
    var ROD_BOT   = 373;
    var CR        = 42, CRANK_CY = 388;
    var webL_l    = CX - CR - 59, webL_r = CX - CR - 17;
    var webR_l    = CX + CR + 17, webR_r = CX + CR + 59;
    var CASE_BOT  = 432, PAN_BOT = 454;
    var SPR_TOP   = 44, PORT_Y = HEAD_BOT + 46;
    var portL     = bL - WW - 32, portR = bL - WW;

    // ── Helpers ──────────────────────────────────────────────────
    function lbl(text, tx, ty, px, py, align) {
      ctx.strokeStyle = navy; ctx.lineWidth = 0.85;
      ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(px,py); ctx.stroke();
      ctx.font = '8.5px Arial, sans-serif';
      ctx.fillStyle = navy; ctx.textAlign = align || 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(text, tx, ty);
    }
    function coilSpring(cx, y1, y2, hw, coils) {
      var h = y2-y1, step = h/coils;
      ctx.strokeStyle = navy; ctx.lineWidth = 1.55;
      ctx.beginPath(); ctx.moveTo(cx,y1); ctx.lineTo(cx, y1+step*0.18);
      for (var i=0; i<coils-1; i++) {
        var yt = y1+i*step+step*0.18;
        ctx.bezierCurveTo(cx+hw,yt, cx+hw,yt+step*0.5, cx,yt+step*0.5);
        ctx.bezierCurveTo(cx-hw,yt+step*0.5, cx-hw,yt+step, cx,yt+step);
      }
      ctx.lineTo(cx,y2); ctx.stroke();
    }
    function blueArrow(x1,y1,x2,y2) {
      ctx.strokeStyle = blue; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      var dx=x2-x1, dy=y2-y1, len=Math.sqrt(dx*dx+dy*dy);
      var ux=dx/len, uy=dy/len, ax=x2-ux*11, ay=y2-uy*11, ppx=-uy, ppy=ux;
      ctx.fillStyle=blue; ctx.beginPath();
      ctx.moveTo(x2,y2); ctx.lineTo(ax+ppx*5.5,ay+ppy*5.5); ctx.lineTo(ax-ppx*5.5,ay-ppy*5.5);
      ctx.closePath(); ctx.fill();
    }
    function hatch(x,y,w,h) {
      ctx.save(); ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip();
      ctx.strokeStyle='rgba(26,58,107,0.28)'; ctx.lineWidth=0.65;
      for (var hi=y; hi<y+h+w; hi+=7) {
        ctx.beginPath(); ctx.moveTo(x,hi); ctx.lineTo(x+w,hi-w); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x,hi-w); ctx.lineTo(x+w,hi); ctx.stroke();
      }
      ctx.restore();
    }

    // ═══════ 1. CRANKCASE BELL SHAPE ════════════════════════════
    ctx.fillStyle='rgba(205,220,238,0.72)'; ctx.strokeStyle=navy; ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(bL-WW, CYL_BOT);
    ctx.bezierCurveTo(bL-WW-28, CYL_BOT+32, bL-WW-52, CRANK_CY-38, bL-WW-52, CRANK_CY);
    ctx.bezierCurveTo(bL-WW-52, CRANK_CY+44, bL-WW-28, CASE_BOT-6,  CX-56, CASE_BOT);
    ctx.bezierCurveTo(CX-18, CASE_BOT+16, CX+18, CASE_BOT+16, CX+56, CASE_BOT);
    ctx.bezierCurveTo(bR+WW+28, CASE_BOT-6,  bR+WW+52, CRANK_CY+44, bR+WW+52, CRANK_CY);
    ctx.bezierCurveTo(bR+WW+52, CRANK_CY-38, bR+WW+28, CYL_BOT+32,  bR+WW, CYL_BOT);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // ═══════ 2. CYLINDER WALLS ══════════════════════════════════
    ctx.fillStyle='rgba(182,202,222,0.70)'; ctx.strokeStyle=navy; ctx.lineWidth=2;
    ctx.fillRect(bL-WW,HEAD_BOT,WW,CYL_BOT-HEAD_BOT); ctx.strokeRect(bL-WW,HEAD_BOT,WW,CYL_BOT-HEAD_BOT);
    hatch(bL-WW,HEAD_BOT,WW,CYL_BOT-HEAD_BOT);
    ctx.fillRect(bR,HEAD_BOT,WW,CYL_BOT-HEAD_BOT); ctx.strokeRect(bR,HEAD_BOT,WW,CYL_BOT-HEAD_BOT);
    hatch(bR,HEAD_BOT,WW,CYL_BOT-HEAD_BOT);
    // Bore fill
    ctx.fillStyle='#ecf3fa'; ctx.fillRect(bL,HEAD_BOT,BR*2,CYL_BOT-HEAD_BOT);
    // Gold liner strips
    ctx.fillStyle=gold; ctx.strokeStyle=navy; ctx.lineWidth=1;
    ctx.fillRect(bL,HEAD_BOT,9,CYL_BOT-HEAD_BOT); ctx.strokeRect(bL,HEAD_BOT,9,CYL_BOT-HEAD_BOT);
    ctx.fillRect(bR-9,HEAD_BOT,9,CYL_BOT-HEAD_BOT); ctx.strokeRect(bR-9,HEAD_BOT,9,CYL_BOT-HEAD_BOT);

    // ═══════ 3. CYLINDER HEAD PLATE ═════════════════════════════
    ctx.fillStyle='rgba(172,196,218,0.88)'; ctx.strokeStyle=navy; ctx.lineWidth=2.2;
    ctx.beginPath(); ctx.roundRect(bL-WW-12,HEAD_TOP,BR*2+WW*2+24,HEAD_BOT-HEAD_TOP,[3,3,0,0]);
    ctx.fill(); ctx.stroke();
    hatch(bL-WW-12,HEAD_TOP,BR*2+WW*2+24,HEAD_BOT-HEAD_TOP);
    // Gold valve-port flanges
    ctx.fillStyle=gold; ctx.strokeStyle=navy; ctx.lineWidth=1;
    ctx.fillRect(bL+6,HEAD_TOP,32,HEAD_BOT-HEAD_TOP); ctx.strokeRect(bL+6,HEAD_TOP,32,HEAD_BOT-HEAD_TOP);
    ctx.fillRect(bR-38,HEAD_TOP,32,HEAD_BOT-HEAD_TOP); ctx.strokeRect(bR-38,HEAD_TOP,32,HEAD_BOT-HEAD_TOP);

    // ═══════ 4. GOLD PORT BRACKETS (combustion chamber) ═════════
    ctx.fillStyle=gold; ctx.strokeStyle=navy; ctx.lineWidth=1.2;
    ctx.beginPath();
    ctx.moveTo(bL,HEAD_BOT); ctx.lineTo(bL+36,HEAD_BOT); ctx.lineTo(CX-24,HEAD_BOT+52); ctx.lineTo(CX-24,HEAD_BOT+28); ctx.lineTo(bL+20,HEAD_BOT);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bR,HEAD_BOT); ctx.lineTo(bR-36,HEAD_BOT); ctx.lineTo(CX+24,HEAD_BOT+52); ctx.lineTo(CX+24,HEAD_BOT+28); ctx.lineTo(bR-20,HEAD_BOT);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // ═══════ 5. VALVE STEMS & HEADS ═════════════════════════════
    var STEM_TOP = SPR_TOP + 18;
    ctx.fillStyle='rgba(194,210,228,0.92)'; ctx.strokeStyle=navy; ctx.lineWidth=1.4;
    ctx.fillRect(LV_X-5,STEM_TOP,10,HEAD_BOT-STEM_TOP+12); ctx.strokeRect(LV_X-5,STEM_TOP,10,HEAD_BOT-STEM_TOP+12);
    ctx.fillStyle=gold; ctx.strokeStyle=navy; ctx.lineWidth=1.3;
    ctx.beginPath(); ctx.moveTo(LV_X-19,HEAD_BOT+12); ctx.lineTo(LV_X+19,HEAD_BOT+12); ctx.lineTo(LV_X+13,HEAD_BOT+26); ctx.lineTo(LV_X-13,HEAD_BOT+26); ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle='rgba(194,210,228,0.92)'; ctx.strokeStyle=navy; ctx.lineWidth=1.4;
    ctx.fillRect(RV_X-5,STEM_TOP,10,HEAD_BOT-STEM_TOP+12); ctx.strokeRect(RV_X-5,STEM_TOP,10,HEAD_BOT-STEM_TOP+12);
    ctx.fillStyle=gold; ctx.strokeStyle=navy; ctx.lineWidth=1.3;
    ctx.beginPath(); ctx.moveTo(RV_X-19,HEAD_BOT+12); ctx.lineTo(RV_X+19,HEAD_BOT+12); ctx.lineTo(RV_X+13,HEAD_BOT+26); ctx.lineTo(RV_X-13,HEAD_BOT+26); ctx.closePath(); ctx.fill(); ctx.stroke();

    // ═══════ 6. VALVE SPRINGS ═══════════════════════════════════
    ctx.fillStyle='#8fa0b2'; ctx.strokeStyle=navy; ctx.lineWidth=1;
    // Bottom keepers
    ctx.fillRect(LV_X-11,HEAD_TOP-9,22,8); ctx.strokeRect(LV_X-11,HEAD_TOP-9,22,8);
    ctx.fillRect(RV_X-11,HEAD_TOP-9,22,8); ctx.strokeRect(RV_X-11,HEAD_TOP-9,22,8);
    // Top retainer caps
    ctx.fillRect(LV_X-13,SPR_TOP+6,26,8); ctx.strokeRect(LV_X-13,SPR_TOP+6,26,8);
    ctx.fillRect(RV_X-13,SPR_TOP+6,26,8); ctx.strokeRect(RV_X-13,SPR_TOP+6,26,8);
    // Top bolt half-circles
    ctx.fillStyle='#99aabb';
    ctx.beginPath(); ctx.arc(LV_X,SPR_TOP+3,7,Math.PI,0); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(RV_X,SPR_TOP+3,7,Math.PI,0); ctx.fill(); ctx.stroke();
    // Coil springs
    coilSpring(LV_X, SPR_TOP+14, HEAD_TOP-9, 12, 9);
    coilSpring(RV_X, SPR_TOP+14, HEAD_TOP-9, 12, 9);

    // ═══════ 7. SPARK PLUG ══════════════════════════════════════
    ctx.strokeStyle='#333'; ctx.lineWidth=2.6;
    ctx.beginPath(); ctx.moveTo(CX,56); ctx.lineTo(CX,34); ctx.stroke();
    ctx.fillStyle='#484848'; ctx.strokeStyle=navy; ctx.lineWidth=1;
    ctx.fillRect(CX-5,26,10,12); ctx.strokeRect(CX-5,26,10,12);
    ctx.fillStyle='#e2d0a8'; ctx.strokeStyle=navy; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.roundRect(CX-4,55,8,50,2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#c0ccd8'; ctx.strokeStyle=navy; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.roundRect(CX-7,72,14,56,3); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#8899aa'; ctx.strokeStyle=navy; ctx.lineWidth=1;
    ctx.fillRect(CX-9,96,18,18); ctx.strokeRect(CX-9,96,18,18);
    ctx.strokeStyle='rgba(26,58,107,0.4)'; ctx.lineWidth=0.7;
    ctx.beginPath(); ctx.moveTo(CX-9,105); ctx.lineTo(CX+9,105); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CX,96); ctx.lineTo(CX,114); ctx.stroke();
    ctx.fillStyle='#f0c040'; ctx.strokeStyle='#8a6010'; ctx.lineWidth=0.9;
    ctx.beginPath(); ctx.roundRect(CX-3,127,6,18,1); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='#555'; ctx.lineWidth=2.2;
    ctx.beginPath(); ctx.moveTo(CX+3,144); ctx.lineTo(CX+12,144); ctx.lineTo(CX+12,136); ctx.stroke();

    // ═══════ 8. AIR-FUEL PORT COIL (left external) ══════════════
    var portHw=7, portCoils=5, portStep=(portR-portL)/portCoils;
    ctx.strokeStyle=navy; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(portL,PORT_Y);
    for (var pi=0; pi<portCoils; pi++) {
      var px0=portL+pi*portStep;
      ctx.bezierCurveTo(px0+portStep*0.25,PORT_Y-portHw, px0+portStep*0.75,PORT_Y-portHw, px0+portStep*0.5,PORT_Y);
      ctx.bezierCurveTo(px0+portStep*0.75,PORT_Y+portHw, px0+portStep,PORT_Y+portHw, px0+portStep,PORT_Y);
    }
    ctx.stroke();
    ctx.fillStyle='rgba(190,210,232,0.55)'; ctx.fillRect(portL-2,PORT_Y-8,portR-portL+2,16);
    ctx.strokeStyle=navy; ctx.lineWidth=0.9; ctx.strokeRect(portL-2,PORT_Y-8,portR-portL+2,16);

    // ═══════ 9. PISTON ══════════════════════════════════════════
    ctx.fillStyle='rgba(205,220,238,0.95)'; ctx.strokeStyle=navy; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(bL+9,PISTON_T,BR*2-18,PISTON_B-PISTON_T,5); ctx.fill(); ctx.stroke();
    ctx.fillStyle=gold; ctx.fillRect(bL+9,PISTON_T,BR*2-18,5);
    [PISTON_T+8,PISTON_T+18,PISTON_T+28].forEach(function(ry){
      ctx.fillStyle=gold; ctx.strokeStyle='rgba(140,110,20,0.8)'; ctx.lineWidth=1;
      ctx.fillRect(bL,ry,9,5); ctx.strokeRect(bL,ry,9,5);
      ctx.fillRect(bR-9,ry,9,5); ctx.strokeRect(bR-9,ry,9,5);
      ctx.strokeStyle='rgba(170,135,25,0.45)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(bL+9,ry+2); ctx.lineTo(bR-9,ry+2); ctx.stroke();
    });
    var wristY = PISTON_T + (PISTON_B-PISTON_T)*0.62;
    ctx.fillStyle='#8899aa'; ctx.strokeStyle=navy; ctx.lineWidth=1.6;
    ctx.beginPath(); ctx.arc(CX,wristY,13,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(CX,wristY,5,0,Math.PI*2); ctx.fillStyle='#334'; ctx.fill();

    // ═══════ 10. CONNECTING ROD ═════════════════════════════════
    var rodTopY=wristY+6, rodBotY=ROD_BOT;
    ctx.fillStyle='rgba(183,203,224,0.90)'; ctx.strokeStyle=navy; ctx.lineWidth=1.8;
    ctx.beginPath(); ctx.moveTo(CX-11,rodTopY); ctx.lineTo(CX+11,rodTopY); ctx.lineTo(CX+17,rodBotY); ctx.lineTo(CX-17,rodBotY); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle=gold; ctx.strokeStyle=navy; ctx.lineWidth=1;
    ctx.fillRect(CX-14,rodTopY-5,28,8); ctx.strokeRect(CX-14,rodTopY-5,28,8);
    ctx.fillRect(CX-20,rodBotY-4,40,8); ctx.strokeRect(CX-20,rodBotY-4,40,8);

    // ═══════ 11. CRANKSHAFT ═════════════════════════════════════
    var cy2=CRANK_CY;
    ctx.fillStyle='rgba(178,198,220,0.92)'; ctx.strokeStyle=navy; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(CX,cy2,CR+17,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='rgba(26,58,107,0.35)'; ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.arc(CX,cy2,CR+9,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(CX,cy2,CR-10,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle=gold; ctx.strokeStyle=navy; ctx.lineWidth=1.8;
    ctx.beginPath(); ctx.arc(CX,cy2,CR,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#c2d3e4'; ctx.strokeStyle=navy; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(CX,cy2,17,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(CX,cy2,7,0,Math.PI*2); ctx.fillStyle='#334'; ctx.fill();
    // Crank webs
    ctx.fillStyle='rgba(162,184,210,0.92)'; ctx.strokeStyle=navy; ctx.lineWidth=1.6;
    ctx.fillRect(webL_l,cy2-9,42,18); ctx.strokeRect(webL_l,cy2-9,42,18);
    ctx.fillRect(webR_l,cy2-9,42,18); ctx.strokeRect(webR_l,cy2-9,42,18);
    // Main bearing saddles
    ctx.fillStyle=gold; ctx.strokeStyle=navy; ctx.lineWidth=1.3;
    ctx.fillRect(webL_l-15,cy2-15,15,30); ctx.strokeRect(webL_l-15,cy2-15,15,30);
    ctx.fillRect(webR_r,cy2-15,15,30);    ctx.strokeRect(webR_r,cy2-15,15,30);
    ctx.fillStyle='#8fa0b2';
    [webL_l-7, webR_r+7].forEach(function(bx){
      ctx.beginPath(); ctx.arc(bx,cy2-7,2.8,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx,cy2+7,2.8,0,Math.PI*2); ctx.fill(); ctx.stroke();
    });

    // ═══════ 12. OIL PAN ════════════════════════════════════════
    ctx.fillStyle='rgba(142,168,198,0.50)'; ctx.strokeStyle=navy; ctx.lineWidth=1.8;
    ctx.beginPath();
    ctx.moveTo(CX-68,CASE_BOT); ctx.lineTo(CX-46,PAN_BOT); ctx.lineTo(CX+46,PAN_BOT); ctx.lineTo(CX+68,CASE_BOT);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // ═══════ 13. BLUE AIRFLOW ARROWS ════════════════════════════
    blueArrow(portL-24, PORT_Y, portL-2, PORT_Y);
    blueArrow(bR+WW+4, PORT_Y, bR+WW+50, PORT_Y);

    // ═══════ 14. DIMENSION LINES ════════════════════════════════
    ctx.strokeStyle=navy; ctx.lineWidth=0.9; ctx.fillStyle=navy;
    // BORE horizontal
    ctx.beginPath(); ctx.moveTo(bL,23); ctx.lineTo(bR,23); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bL,19); ctx.lineTo(bL,27); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bR,19); ctx.lineTo(bR,27); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bL,23); ctx.lineTo(bL+10,20); ctx.lineTo(bL+10,26); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bR,23); ctx.lineTo(bR-10,20); ctx.lineTo(bR-10,26); ctx.fill();
    ctx.font='bold 9px Arial, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('BORE (mm)', CX, 13);
    ctx.font='8px Arial, sans-serif';
    ctx.fillText('BORE 86mm', CX, HEAD_BOT+28);
    // STROKE vertical
    var dimX = bR+WW+58, midS=(HEAD_BOT+CYL_BOT)/2;
    ctx.strokeStyle=navy; ctx.lineWidth=0.9;
    ctx.beginPath(); ctx.moveTo(dimX,HEAD_BOT); ctx.lineTo(dimX,CYL_BOT); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dimX-4,HEAD_BOT); ctx.lineTo(dimX+4,HEAD_BOT); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dimX-4,CYL_BOT);  ctx.lineTo(dimX+4,CYL_BOT);  ctx.stroke();
    ctx.fillStyle=navy;
    ctx.beginPath(); ctx.moveTo(dimX,HEAD_BOT); ctx.lineTo(dimX-3,HEAD_BOT+10); ctx.lineTo(dimX+3,HEAD_BOT+10); ctx.fill();
    ctx.beginPath(); ctx.moveTo(dimX,CYL_BOT);  ctx.lineTo(dimX-3,CYL_BOT-10);  ctx.lineTo(dimX+3,CYL_BOT-10);  ctx.fill();
    ctx.save(); ctx.translate(dimX+13,midS); ctx.rotate(Math.PI/2); ctx.font='bold 8.5px Arial, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('STROKE 86mm',0,0); ctx.restore();
    ctx.save(); ctx.translate(dimX+24,midS); ctx.rotate(Math.PI/2); ctx.font='7.5px Arial, sans-serif'; ctx.textAlign='center'; ctx.fillText('STROKE (mm)',0,0); ctx.restore();

    // ═══════ 15. PART LABELS ════════════════════════════════════
    var LX=bL-WW-14, RX=bR+WW+14;
    lbl('Intake Valve',   LX, 118, LV_X-6,   86,         'right');
    lbl('Valve Spring',   LX, 136, LV_X,      106,        'right');
    lbl('Air-fuel Port',  LX, 157, portL-6,   PORT_Y,     'right');
    lbl('Intake Port',    LX, 178, bL-WW,     176,        'right');
    lbl('Cylinder Block', LX, 228, bL-WW,     225,        'right');
    lbl('Piston Rings',   LX, 253, bL,        258,        'right');
    lbl('Piston',         LX, 275, bL+22,     272,        'right');
    lbl('Connecting Rod', LX, 320, CX-14,     320,        'right');
    lbl('Crankshaft',     LX, 366, webL_l-4,  362,        'right');
    lbl('Main Bearings',  LX, 392, webL_l-8,  388,        'right');
    lbl('Oil Pan',        LX, 452, CX-46,     PAN_BOT-2,  'right');
    lbl('Exhaust Valve',     RX,     118, RV_X+6,  86,      'left');
    lbl('Valve Spring',      RX,     136, RV_X,    106,     'left');
    lbl('Exhaust Port',      RX,     157, bR+WW,   PORT_Y,  'left');
    lbl('Camshaft Drive',    RX,     188, bR+WW,   186,     'left');
    lbl('(simplified)',      RX+2,   200, RX,       200,    'left');
    lbl('Spark Plug gap',    CX+28,  50,  CX+2,    50,     'left');
    lbl('Ground electrode',  CX+28,  64,  CX+12,   140,    'left');

    // ═══════ 16. CRANKSHAFT ROTATION CURVED TEXT ════════════════
    ctx.save(); ctx.translate(CX,cy2);
    var arcR3=CR+30, crtxt='CRANKSHAFT ROTATION', totA=1.55, stA=Math.PI/2+totA/2;
    ctx.font='bold 6.5px Arial, sans-serif'; ctx.fillStyle=navy; ctx.textAlign='center'; ctx.textBaseline='middle';
    for (var ci2=0; ci2<crtxt.length; ci2++) {
      var cang=stA-(ci2/(crtxt.length-1))*totA;
      ctx.save(); ctx.rotate(cang-Math.PI/2); ctx.translate(0,-arcR3); ctx.rotate(-cang+Math.PI/2);
      ctx.fillText(crtxt[ci2],0,0); ctx.restore();
    }
    var arcO=arcR3+13; ctx.strokeStyle=navy; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.arc(0,0,arcO,0.45,1.25); ctx.stroke();
    var ea3=1.25, ex3=Math.cos(ea3)*arcO, ey3=Math.sin(ea3)*arcO; ctx.fillStyle=navy;
    ctx.beginPath(); ctx.moveTo(ex3,ey3); ctx.lineTo(ex3-5,ey3-6); ctx.lineTo(ex3+3,ey3-7); ctx.fill();
    ctx.restore();

    // ═══════ 17. SPECIFICATIONS BOX ═════════════════════════════
    var sbW=136, sbH=34, sbX=bR+4, sbY=440;
    ctx.fillStyle='#ffffff'; ctx.strokeStyle=navy; ctx.lineWidth=1.3;
    ctx.beginPath(); ctx.roundRect(sbX,sbY,sbW,sbH,3); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#dde8f4';
    ctx.beginPath(); ctx.moveTo(sbX+sbW-12,sbY); ctx.lineTo(sbX+sbW,sbY+12); ctx.lineTo(sbX+sbW,sbY); ctx.fill();
    ctx.strokeStyle=navy; ctx.lineWidth=0.75;
    ctx.beginPath(); ctx.moveTo(sbX+sbW-12,sbY); ctx.lineTo(sbX+sbW-12,sbY+12); ctx.lineTo(sbX+sbW,sbY+12); ctx.stroke();
    ctx.font='bold 7.5px Arial, sans-serif'; ctx.fillStyle=navy; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText('SPECIFICATIONS:', sbX+5, sbY+10);
    ctx.font='7px Arial, sans-serif';
    ctx.fillText('Bore 86mm \u00b7 Stroke 86mm \u00b7 Compression 10.5:1', sbX+5, sbY+24);

    titleBar(ctx, '\ud83d\udd29 ENGINE CROSS-SECTION \u2014 MECH DEPT', '#f59e0b');
    return c;
  }

  /* ══════════════════════════════════════════════════════════════
     6. CIVIL — Architectural Floor Plan (enhanced)
     ══════════════════════════════════════════════════════════════ */
  function drawCivil() {
    var c = makeCanvas(), ctx = c.getContext('2d');

    /* ── Blueprint background ───────────────────────────────────── */
    ctx.fillStyle = '#dce8f5';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Fine grid lines
    ctx.strokeStyle = 'rgba(100,140,200,0.25)';
    ctx.lineWidth = 0.5;
    for (var gx = 0; gx < SIZE; gx += 10) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, SIZE); ctx.stroke();
    }
    for (var gy = 0; gy < SIZE; gy += 10) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(SIZE, gy); ctx.stroke();
    }
    // Major grid lines
    ctx.strokeStyle = 'rgba(100,140,200,0.45)';
    ctx.lineWidth = 0.8;
    for (var mgx = 0; mgx < SIZE; mgx += 50) {
      ctx.beginPath(); ctx.moveTo(mgx, 0); ctx.lineTo(mgx, SIZE); ctx.stroke();
    }
    for (var mgy = 0; mgy < SIZE; mgy += 50) {
      ctx.beginPath(); ctx.moveTo(0, mgy); ctx.lineTo(SIZE, mgy); ctx.stroke();
    }

    // Outer border
    ctx.strokeStyle = '#2255aa';
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, SIZE - 12, SIZE - 12);

    /* ── Layout constants ───────────────────────────────────────── */
    var inkBlue   = '#1a3a6e';
    var cableClr  = '#b8860b';
    var deckY     = 310;       // deck road surface Y
    var groundY   = 330;       // ground/water surface Y
    var riverBotY = 400;       // bottom of river/piles
    var leftTowerX  = 130;     // center-x of left tower
    var rightTowerX = 350;     // center-x of right tower
    var towerTopY   = 110;     // top of towers
    var towerBotY   = 390;     // bottom of towers (below deck)
    var towerW      = 18;      // tower width

    /* ═══════════════════════════════════════════════════════════
       1. ANCHORAGE BLOCKS (gravity mass)
       ═══════════════════════════════════════════════════════════ */
    function drawAnchorage(ax, ay, flipped) {
      ctx.fillStyle = '#b0c4d8';
      ctx.strokeStyle = inkBlue;
      ctx.lineWidth = 1.2;
      var bw = 44, bh = 30;
      var bx = flipped ? ax - bw : ax;
      ctx.fillRect(bx, ay, bw, bh);
      ctx.strokeRect(bx, ay, bw, bh);
      // hatch marks
      ctx.strokeStyle = 'rgba(26,58,110,0.35)';
      ctx.lineWidth = 0.8;
      for (var hi = 5; hi < bh; hi += 5) {
        ctx.beginPath(); ctx.moveTo(bx, ay+hi); ctx.lineTo(bx+bw, ay+hi); ctx.stroke();
      }
      ctx.strokeStyle = inkBlue; ctx.lineWidth = 1.2;
    }
    // Left anchorage
    drawAnchorage(20, groundY, false);
    // Right anchorage
    drawAnchorage(SIZE - 64, groundY, false);

    /* ═══════════════════════════════════════════════════════════
       2. RIVERBED + FOUNDATION PILES
       ═══════════════════════════════════════════════════════════ */
    // Water fill
    ctx.fillStyle = 'rgba(100,160,220,0.18)';
    ctx.fillRect(20, groundY + 30, SIZE - 40, 70);

    // Riverbed wavy line
    ctx.strokeStyle = 'rgba(26,58,110,0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(20, groundY + 30);
    for (var wx = 20; wx <= SIZE - 20; wx += 20) {
      ctx.quadraticCurveTo(wx + 10, groundY + 34, wx + 20, groundY + 30);
    }
    ctx.stroke();

    // Foundation piles for left tower
    ctx.strokeStyle = inkBlue; ctx.lineWidth = 3;
    ctx.fillStyle = '#b0c4d8';
    for (var pi = -1; pi <= 1; pi++) {
      ctx.fillRect(leftTowerX + pi * 9 - 3, groundY + 30, 7, 60);
      ctx.strokeRect(leftTowerX + pi * 9 - 3, groundY + 30, 7, 60);
    }
    // Foundation piles for right tower
    for (var pj = -1; pj <= 1; pj++) {
      ctx.fillRect(rightTowerX + pj * 9 - 3, groundY + 30, 7, 60);
      ctx.strokeRect(rightTowerX + pj * 9 - 3, groundY + 30, 7, 60);
    }

    // Foundation base slabs
    ctx.fillStyle = '#a0b4c8';
    ctx.strokeStyle = inkBlue; ctx.lineWidth = 1.5;
    ctx.fillRect(leftTowerX - 25, groundY + 88, 50, 12);
    ctx.strokeRect(leftTowerX - 25, groundY + 88, 50, 12);
    ctx.fillRect(rightTowerX - 25, groundY + 88, 50, 12);
    ctx.strokeRect(rightTowerX - 25, groundY + 88, 50, 12);

    /* ═══════════════════════════════════════════════════════════
       3. TOWERS (lattice structure)
       ═══════════════════════════════════════════════════════════ */
    function drawTower(tx) {
      var tw2 = towerW / 2;
      ctx.fillStyle = '#c8b460';
      ctx.strokeStyle = '#8a6a00';
      ctx.lineWidth = 1.5;

      // Main tower body
      ctx.beginPath();
      ctx.moveTo(tx - tw2 - 3, towerTopY);
      ctx.lineTo(tx - tw2, towerBotY);
      ctx.lineTo(tx + tw2, towerBotY);
      ctx.lineTo(tx + tw2 + 3, towerTopY);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Lattice cross bracing
      ctx.strokeStyle = '#6a5000'; ctx.lineWidth = 1;
      var segH = 28;
      for (var ly = towerTopY + 4; ly < towerBotY - 4; ly += segH) {
        var bot = Math.min(ly + segH, towerBotY - 4);
        ctx.beginPath();
        ctx.moveTo(tx - tw2, ly); ctx.lineTo(tx + tw2, bot); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tx + tw2, ly); ctx.lineTo(tx - tw2, bot); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tx - tw2, ly); ctx.lineTo(tx + tw2, ly); ctx.stroke();
      }

      // Tower cap
      ctx.fillStyle = '#a89040';
      ctx.strokeStyle = '#6a5000'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(tx, towerTopY, 6, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // Cross beam at deck level
      ctx.fillStyle = '#c8b460';
      ctx.strokeStyle = '#8a6a00'; ctx.lineWidth = 1.5;
      ctx.fillRect(tx - tw2 - 4, deckY - 8, towerW + 8, 10);
      ctx.strokeRect(tx - tw2 - 4, deckY - 8, towerW + 8, 10);
    }
    drawTower(leftTowerX);
    drawTower(rightTowerX);

    /* ═══════════════════════════════════════════════════════════
       4. MAIN CABLES (catenary curve)
       ═══════════════════════════════════════════════════════════ */
    function drawMainCable(yOffset) {
      ctx.strokeStyle = cableClr;
      ctx.lineWidth = 3;
      ctx.beginPath();
      // Left side cable (from left anchorage to left tower)
      ctx.moveTo(20, groundY + 5);
      ctx.quadraticCurveTo(leftTowerX - 60, towerTopY + 60, leftTowerX, towerTopY + 2);
      // Main catenary (left tower to right tower)
      ctx.quadraticCurveTo(SIZE / 2, deckY - 10 + yOffset, rightTowerX, towerTopY + 2);
      // Right side cable (from right tower to right anchorage)
      ctx.quadraticCurveTo(rightTowerX + 60, towerTopY + 60, SIZE - 20, groundY + 5);
      ctx.stroke();
    }
    drawMainCable(0);
    // Slight second cable for thickness illusion
    ctx.strokeStyle = 'rgba(184,134,11,0.45)';
    ctx.lineWidth = 1.5;
    drawMainCable(4);

    /* ═══════════════════════════════════════════════════════════
       5. VERTICAL SUSPENDER CABLES + LOAD ARROWS
       ═══════════════════════════════════════════════════════════ */
    // Calculate approximate catenary Y at each suspender X
    function catenaryY(x) {
      // Map x → parameter t in [0,1]
      var span = rightTowerX - leftTowerX;
      var t = (x - leftTowerX) / span;
      // Parabola: y = towerTopY + sag * 4*t*(1-t)
      var sag = (deckY - 10) - towerTopY;
      return towerTopY + sag * 4 * t * (1 - t) + 2;
    }

    var suspCount = 14;
    var suspSpacing = (rightTowerX - leftTowerX) / (suspCount + 1);

    ctx.lineWidth = 1;
    for (var si = 1; si <= suspCount; si++) {
      var sx = leftTowerX + si * suspSpacing;
      var topY = catenaryY(sx);
      var botY = deckY - 4;

      // Cable line
      ctx.strokeStyle = 'rgba(184,134,11,0.7)';
      ctx.beginPath(); ctx.moveTo(sx, topY); ctx.lineTo(sx, botY); ctx.stroke();

      // Golden downward arrow
      ctx.fillStyle = '#c8a030';
      ctx.beginPath();
      ctx.moveTo(sx, botY + 6);
      ctx.lineTo(sx - 3, botY - 1);
      ctx.lineTo(sx + 3, botY - 1);
      ctx.closePath();
      ctx.fill();
    }

    /* ═══════════════════════════════════════════════════════════
       6. DECK (road surface)
       ═══════════════════════════════════════════════════════════ */
    // Deck truss outline
    ctx.fillStyle = '#c8d8e8';
    ctx.strokeStyle = inkBlue;
    ctx.lineWidth = 2;
    ctx.fillRect(20, deckY, SIZE - 40, 20);
    ctx.strokeRect(20, deckY, SIZE - 40, 20);

    // Truss detail lines
    ctx.strokeStyle = 'rgba(26,58,110,0.4)';
    ctx.lineWidth = 0.8;
    var trussStep = 20;
    for (var ti = 20; ti < SIZE - 40; ti += trussStep) {
      ctx.beginPath();
      ctx.moveTo(20 + ti, deckY);
      ctx.lineTo(20 + ti + trussStep / 2, deckY + 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(20 + ti + trussStep / 2, deckY + 20);
      ctx.lineTo(20 + ti + trussStep, deckY);
      ctx.stroke();
    }

    // Road lane markings (dashed center)
    ctx.strokeStyle = '#e0e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(20, deckY + 10); ctx.lineTo(SIZE - 20, deckY + 10); ctx.stroke();
    ctx.setLineDash([]);

    // Small cars silhouettes on deck
    ctx.fillStyle = 'rgba(26,58,110,0.35)';
    [75, 160, 230, 310, 385].forEach(function(carX) {
      ctx.fillRect(carX - 8, deckY + 2, 16, 8);
    });

    /* ═══════════════════════════════════════════════════════════
       7. BACK STAY CABLES (tower top to anchorage)
       ═══════════════════════════════════════════════════════════ */
    ctx.strokeStyle = cableClr;
    ctx.lineWidth = 2.5;
    // Left backstay
    ctx.beginPath(); ctx.moveTo(leftTowerX, towerTopY + 2);
    ctx.lineTo(20, groundY + 5); ctx.stroke();
    // Right backstay
    ctx.beginPath(); ctx.moveTo(rightTowerX, towerTopY + 2);
    ctx.lineTo(SIZE - 20, groundY + 5); ctx.stroke();

    /* ═══════════════════════════════════════════════════════════
       8. CABLE TENSION ARROWS (big blue diagonal)
       ═══════════════════════════════════════════════════════════ */
    function blueArrow(x1, y1, x2, y2) {
      ctx.strokeStyle = '#1a6fd4';
      ctx.fillStyle = '#1a6fd4';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      // Arrowhead
      var angle = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 9 * Math.cos(angle - 0.4), y2 - 9 * Math.sin(angle - 0.4));
      ctx.lineTo(x2 - 9 * Math.cos(angle + 0.4), y2 - 9 * Math.sin(angle + 0.4));
      ctx.closePath(); ctx.fill();
    }
    // Two tension arrows on each side of the main span
    blueArrow(leftTowerX + 45, towerTopY + 80, leftTowerX + 20, towerTopY + 50);
    blueArrow(rightTowerX - 45, towerTopY + 80, rightTowerX - 20, towerTopY + 50);
    // Tower compression arrows
    blueArrow(leftTowerX - 28, deckY + 10, leftTowerX - 35, towerTopY + 80);
    blueArrow(rightTowerX + 28, deckY + 10, rightTowerX + 35, towerTopY + 80);

    /* ═══════════════════════════════════════════════════════════
       9. LOAD ARROWS (dead & live load on deck)
       ═══════════════════════════════════════════════════════════ */
    function downArrow(ax, ay, clr, label, labelSide) {
      ctx.fillStyle = clr; ctx.strokeStyle = clr; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, ay - 18); ctx.lineTo(ax, ay); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.lineTo(ax - 5, ay - 8); ctx.lineTo(ax + 5, ay - 8);
      ctx.closePath(); ctx.fill();
      ctx.font = 'bold 7px "Roboto Mono",monospace';
      ctx.fillStyle = inkBlue;
      ctx.textAlign = labelSide === 'left' ? 'right' : 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, labelSide === 'left' ? ax - 7 : ax + 7, ay - 10);
    }
    downArrow(SIZE / 2 - 12, deckY - 2, '#1a6fd4', 'DEAD LOAD', 'left');
    downArrow(SIZE / 2 + 12, deckY - 2, '#c8a030', 'LIVE LOAD', 'right');

    /* ═══════════════════════════════════════════════════════════
       10. DIMENSION LINES & LABELS
       ═══════════════════════════════════════════════════════════ */
    ctx.strokeStyle = inkBlue;
    ctx.fillStyle = inkBlue;
    ctx.lineWidth = 1;

    function dimLine(x1, y1, x2, y2, label, lx, ly, fontSize) {
      ctx.strokeStyle = inkBlue; ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.setLineDash([]);
      // End ticks
      if (y1 === y2) {
        ctx.beginPath(); ctx.moveTo(x1, y1 - 4); ctx.lineTo(x1, y1 + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2, y2 - 4); ctx.lineTo(x2, y2 + 4); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(x1 - 4, y1); ctx.lineTo(x1 + 4, y1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2 - 4, y2); ctx.lineTo(x2 + 4, y2); ctx.stroke();
      }
      ctx.font = 'bold ' + (fontSize || 8) + 'px "Roboto Mono",monospace';
      ctx.fillStyle = inkBlue;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      // White background for readability
      var tm = ctx.measureText(label);
      ctx.fillStyle = 'rgba(220,232,245,0.85)';
      ctx.fillRect(lx - tm.width / 2 - 2, ly - 6, tm.width + 4, 12);
      ctx.fillStyle = inkBlue;
      ctx.fillText(label, lx, ly);
    }

    // Total span dimension (top)
    dimLine(20, 28, SIZE - 20, 28, 'TOTAL SPAN LENGTH (1850 m)', SIZE / 2, 20, 7);
    // Main span dimension (second row)
    dimLine(leftTowerX, 44, rightTowerX, 44, 'MAIN SPAN (1200 m)', SIZE / 2, 36, 7);
    // Tower height (left side vertical)
    dimLine(16, towerTopY, 16, deckY, 'TOWER HEIGHT (125 m)', 10, (towerTopY + deckY) / 2, 6);
    // Bottom main span
    dimLine(leftTowerX, groundY + 48, rightTowerX, groundY + 48, 'MAIN SPAN (1200 m)', SIZE / 2, groundY + 56, 7);

    /* ═══════════════════════════════════════════════════════════
       11. ANNOTATION LABELS
       ═══════════════════════════════════════════════════════════ */
    ctx.font = 'bold 7.5px "Roboto Mono",monospace';
    ctx.fillStyle = inkBlue;
    ctx.textBaseline = 'middle';

    function annotate(label, ax, ay, align) {
      ctx.textAlign = align || 'left';
      // Background pill
      var tm2 = ctx.measureText(label);
      ctx.fillStyle = 'rgba(220,232,245,0.85)';
      var bx2 = align === 'right' ? ax - tm2.width - 3 : ax - 2;
      ctx.fillRect(bx2, ay - 6, tm2.width + 4, 12);
      ctx.fillStyle = inkBlue;
      ctx.fillText(label, ax, ay);
    }

    // Right-side labels
    annotate('MAIN TOWER', rightTowerX + 12, towerTopY + 20);
    annotate('(LATTICE STRUCTURE)', rightTowerX + 12, towerTopY + 31);
    annotate('MAIN CABLE TENSION', rightTowerX + 12, towerTopY + 55);
    annotate('MAIN CABLE (STEEL WIRE)', rightTowerX + 12, towerTopY + 70);
    annotate('VERTICAL SUSPENDER', rightTowerX + 12, towerTopY + 90);
    annotate('CABLES', rightTowerX + 12, towerTopY + 101);
    // Bottom labels
    annotate('DECK SPAN (VEHICLE LANES)', SIZE / 2 - 60, deckY + 34);
    annotate('RIVERBED FOUNDATION', SIZE / 2 - 52, groundY + 75);
    // Left-side labels
    annotate('ANCHORAGE', 22, groundY + 8);
    annotate('(GRAVITY MASS)', 22, groundY + 19);
    annotate('ANCHORAGE', SIZE - 102, groundY + 8);
    annotate('(GRAVITY MASS)', SIZE - 108, groundY + 19);

    /* ═══════════════════════════════════════════════════════════
       12. SPECIFICATIONS BOX (bottom-right corner)
       ═══════════════════════════════════════════════════════════ */
    var bxX = SIZE - 172, bxY = SIZE - 62, bxW = 160, bxH = 52;
    ctx.fillStyle = '#f0f5fa';
    ctx.strokeStyle = inkBlue;
    ctx.lineWidth = 1.5;
    ctx.fillRect(bxX, bxY, bxW, bxH);
    ctx.strokeRect(bxX, bxY, bxW, bxH);

    // Dog-ear fold
    ctx.beginPath();
    ctx.moveTo(bxX + bxW - 12, bxY);
    ctx.lineTo(bxX + bxW, bxY + 12);
    ctx.lineTo(bxX + bxW - 12, bxY + 12);
    ctx.closePath();
    ctx.fillStyle = '#c8d8e8'; ctx.fill();
    ctx.strokeStyle = inkBlue; ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = inkBlue;
    ctx.font = 'bold 8px "Roboto Mono",monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('SPECIFICATIONS:', bxX + 6, bxY + 11);

    ctx.font = '7px "Roboto Mono",monospace';
    ctx.fillText('Total Span: 1850 m | Main Span: 1200 m', bxX + 6, bxY + 24);
    ctx.fillText('Tower Height: 125 m | Dead Load (est.):', bxX + 6, bxY + 35);
    ctx.fillText('1.2 \u00d7 10\u2075 kN', bxX + 6, bxY + 46);

    /* ═══════════════════════════════════════════════════════════
       13. TITLE BAR
       ═══════════════════════════════════════════════════════════ */
    titleBar(ctx, '\uD83C\uDFD7\uFE0F SUSPENSION BRIDGE — CIVIL DEPT', inkBlue);
    return c;
  }

  /* ══════════════════════════════════════════════════════════════
     7. EEE — Power Transmission System Blueprint
     ══════════════════════════════════════════════════════════════ */
  function drawEEE() {
    var c = makeCanvas(), ctx = c.getContext('2d');

    /* ── Blueprint background (matches Civil style) ─────────────── */
    ctx.fillStyle = '#dce8f5';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = 'rgba(100,140,200,0.22)';
    ctx.lineWidth = 0.5;
    for (var gx = 0; gx < SIZE; gx += 10) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,SIZE); ctx.stroke(); }
    for (var gy = 0; gy < SIZE; gy += 10) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(SIZE,gy); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(100,140,200,0.42)'; ctx.lineWidth = 0.8;
    for (var mgx = 0; mgx < SIZE; mgx += 50) { ctx.beginPath(); ctx.moveTo(mgx,0); ctx.lineTo(mgx,SIZE); ctx.stroke(); }
    for (var mgy = 0; mgy < SIZE; mgy += 50) { ctx.beginPath(); ctx.moveTo(0,mgy); ctx.lineTo(SIZE,mgy); ctx.stroke(); }
    ctx.strokeStyle = '#2255aa'; ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, SIZE - 12, SIZE - 12);

    var ink   = '#1a3a6e';
    var gold  = '#c8a030';
    var arrow = '#1a6fd4';

    /* ── Shared helpers ─────────────────────────────────────────── */
    function pill(label, px, py, align) {
      ctx.font = 'bold 7px "Roboto Mono",monospace';
      ctx.textBaseline = 'middle';
      ctx.textAlign = align || 'left';
      var tw = ctx.measureText(label).width;
      var bx = align === 'right' ? px - tw - 3 : align === 'center' ? px - tw/2 - 2 : px - 2;
      ctx.fillStyle = 'rgba(220,232,245,0.9)';
      ctx.fillRect(bx, py - 6, tw + 4, 12);
      ctx.fillStyle = ink;
      ctx.fillText(label, px, py);
    }
    function blueArrow(x1,y1,x2,y2) {
      ctx.strokeStyle = arrow; ctx.fillStyle = arrow; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      var a = Math.atan2(y2-y1, x2-x1);
      ctx.beginPath();
      ctx.moveTo(x2,y2);
      ctx.lineTo(x2-8*Math.cos(a-0.4), y2-8*Math.sin(a-0.4));
      ctx.lineTo(x2-8*Math.cos(a+0.4), y2-8*Math.sin(a+0.4));
      ctx.closePath(); ctx.fill();
    }
    function dot(dx,dy) {
      ctx.fillStyle = gold;
      ctx.beginPath(); ctx.arc(dx,dy,4,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(dx,dy,4,0,Math.PI*2); ctx.stroke();
    }

    /* ════════════════════════════════════════════
       1. HYDRO DAM  (left side, ~x=38, y=230)
       ════════════════════════════════════════════ */
    var damX = 28, damY = 220;
    // Dam wall
    ctx.fillStyle = '#b0c4d8'; ctx.strokeStyle = ink; ctx.lineWidth = 1.2;
    ctx.fillRect(damX, damY, 56, 44); ctx.strokeRect(damX, damY, 56, 44);
    // Water
    ctx.fillStyle = 'rgba(80,150,220,0.4)';
    ctx.fillRect(damX+2, damY+28, 52, 14);
    // Turbine circle
    ctx.strokeStyle = gold; ctx.lineWidth = 1.5; ctx.fillStyle = 'rgba(200,160,48,0.2)';
    ctx.beginPath(); ctx.arc(damX+28, damY+20, 10, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    // Turbine blades
    ctx.strokeStyle = gold; ctx.lineWidth = 1;
    [0,60,120,180,240,300].forEach(function(deg) {
      var r = deg * Math.PI/180;
      ctx.beginPath(); ctx.moveTo(damX+28, damY+20);
      ctx.lineTo(damX+28+9*Math.cos(r), damY+20+9*Math.sin(r)); ctx.stroke();
    });
    // Dam grid hatch
    ctx.strokeStyle = 'rgba(26,58,110,0.25)'; ctx.lineWidth = 0.6;
    for (var dh = 4; dh < 44; dh += 7) { ctx.beginPath(); ctx.moveTo(damX,damY+dh); ctx.lineTo(damX+56,damY+dh); ctx.stroke(); }
    // Top detail
    ctx.fillStyle = '#a0b4c4'; ctx.strokeStyle = ink; ctx.lineWidth = 1;
    ctx.fillRect(damX, damY-6, 56, 6); ctx.strokeRect(damX, damY-6, 56, 6);
    pill('POWER GENERATOR', damX, damY+56);
    pill('GENERATION UNIT', damX, damY+66);
    pill('(HYDRO)', damX, damY+76);

    /* ════════════════════════════════════════════
       2. STEP-UP TRANSFORMER  (~x=148, y=220)
       ════════════════════════════════════════════ */
    var txUpX = 145, txUpY = 218;
    ctx.fillStyle = '#c8d8e8'; ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
    ctx.fillRect(txUpX, txUpY, 46, 50); ctx.strokeRect(txUpX, txUpY, 46, 50);
    // Coil lines
    ctx.strokeStyle = ink; ctx.lineWidth = 1;
    for (var ci = 0; ci < 6; ci++) {
      var cy2 = txUpY + 6 + ci * 7;
      ctx.beginPath(); ctx.moveTo(txUpX+4, cy2);
      ctx.bezierCurveTo(txUpX+4, cy2-4, txUpX+19, cy2-4, txUpX+19, cy2);
      ctx.bezierCurveTo(txUpX+19, cy2+4, txUpX+4, cy2+4, txUpX+4, cy2);
      ctx.stroke();
    }
    for (var ci2 = 0; ci2 < 6; ci2++) {
      var cy3 = txUpY + 6 + ci2 * 7;
      ctx.beginPath(); ctx.moveTo(txUpX+27, cy3);
      ctx.bezierCurveTo(txUpX+27, cy3-4, txUpX+42, cy3-4, txUpX+42, cy3);
      ctx.bezierCurveTo(txUpX+42, cy3+4, txUpX+27, cy3+4, txUpX+27, cy3);
      ctx.stroke();
    }
    // Center divider
    ctx.strokeStyle = 'rgba(26,58,110,0.4)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(txUpX+23, txUpY+2); ctx.lineTo(txUpX+23, txUpY+48); ctx.stroke();
    pill('GENERATOR', txUpX-2, txUpY-20);
    pill('BUSBAR', txUpX-2, txUpY-10);
    pill('STEP-UP', txUpX-2, txUpY+60);
    pill('TRANSFORMER', txUpX-2, txUpY+70);
    pill('(13.8kV to 500kV)', txUpX-2, txUpY+80);

    // Arrow generator → transformer
    blueArrow(damX+56, damY+22, txUpX, txUpY+25);
    dot(damX+56, damY+22);
    dot(txUpX, txUpY+25);

    /* ════════════════════════════════════════════
       3. HIGH-VOLTAGE TRANSMISSION TOWERS
       ════════════════════════════════════════════ */
    function hvTower(tx, ty, scale) {
      scale = scale || 1;
      var tw = 22*scale, th = 52*scale;
      ctx.strokeStyle = ink; ctx.lineWidth = 1;
      // Legs
      ctx.beginPath();
      ctx.moveTo(tx, ty); ctx.lineTo(tx - tw/2, ty + th); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tx, ty); ctx.lineTo(tx + tw/2, ty + th); ctx.stroke();
      // Cross arms
      var arms = [0.22, 0.45, 0.65];
      arms.forEach(function(frac) {
        var ay = ty + th*frac;
        var aw = (tw/2)*(1-frac*0.6);
        ctx.beginPath(); ctx.moveTo(tx-aw*1.4, ay); ctx.lineTo(tx+aw*1.4, ay); ctx.stroke();
        // Insulator dots
        [-aw*1.4, -aw*0.5, aw*0.5, aw*1.4].forEach(function(ox2) {
          ctx.fillStyle = gold;
          ctx.beginPath(); ctx.arc(tx+ox2, ay, 2.5*scale, 0, Math.PI*2); ctx.fill();
        });
      });
      // Vertical trunk
      ctx.beginPath(); ctx.moveTo(tx, ty+4*scale); ctx.lineTo(tx, ty+th); ctx.stroke();
      // Base X brace
      ctx.beginPath(); ctx.moveTo(tx-tw/2, ty+th); ctx.lineTo(tx+tw/2, ty+th); ctx.stroke();
    }

    // Three towers at different positions and sizes
    hvTower(248, 90, 1.1);
    hvTower(320, 78, 1.0);
    hvTower(370, 90, 0.9);

    // Three-phase conductor lines across towers
    var towerTops = [
      {x:248, y:90}, {x:320, y:78}, {x:370, y:90}
    ];
    var phaseOffsets = [-10, 0, 10];
    var lineColors = [ink, ink, ink];
    ctx.lineWidth = 1.2;
    phaseOffsets.forEach(function(ph) {
      ctx.strokeStyle = ink;
      ctx.beginPath();
      // From step-up transformer top busbar
      ctx.moveTo(txUpX+23, txUpY - 2);
      ctx.lineTo(txUpX+23, txUpY - 18 + ph);
      // Arc through towers
      towerTops.forEach(function(tt) {
        ctx.lineTo(tt.x + ph/2, tt.y + 12 + Math.abs(ph)*0.5);
      });
      // Down to step-down transformer
      ctx.lineTo(368, 148 + ph);
      ctx.stroke();
    });

    // Busbar dots on tower arms
    towerTops.forEach(function(tt) {
      phaseOffsets.forEach(function(ph) {
        dot(tt.x + ph/2, tt.y + 12);
      });
    });

    // Label
    pill('THREE-PHASE', 258, 178);
    pill('CONDUCTORS', 258, 188);
    pill('HIGH-VOLTAGE', 370, 60);
    pill('TRANSMISSION', 370, 70);
    pill('TOWERS', 370, 80);

    /* ════════════════════════════════════════════
       4. STEP-DOWN TRANSFORMER  (~x=358, y=148)
       ════════════════════════════════════════════ */
    var txDnX = 352, txDnY = 148;
    ctx.fillStyle = '#c8d8e8'; ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
    ctx.fillRect(txDnX, txDnY, 52, 46); ctx.strokeRect(txDnX, txDnY, 52, 46);
    // Three bobbin tops
    [txDnX+8, txDnX+26, txDnX+44].forEach(function(bx) {
      ctx.fillStyle = gold; ctx.strokeStyle = ink; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(bx, txDnY-4, 5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    });
    // Coils (simplified rectangles)
    ctx.strokeStyle = ink; ctx.lineWidth = 0.8;
    for (var ri = 0; ri < 5; ri++) {
      ctx.strokeRect(txDnX+4, txDnY+4+ri*8, 18, 6);
      ctx.strokeRect(txDnX+30, txDnY+4+ri*8, 18, 6);
    }
    pill('STEP-DOWN', txDnX+54, txDnY+5);
    pill('TRANSFORMER', txDnX+54, txDnY+15);
    pill('(500kV to 132kV)', txDnX+54, txDnY+25);

    // Arrows from step-down transformer down to substation
    blueArrow(txDnX+14, txDnY+46, txDnX+14, txDnY+70);
    blueArrow(txDnX+26, txDnY+46, txDnX+26, txDnY+70);
    blueArrow(txDnX+38, txDnY+46, txDnX+38, txDnY+70);

    /* ════════════════════════════════════════════
       5. SUBSTATION BOX  (~x=330, y=220)
       ════════════════════════════════════════════ */
    var subX = 318, subY = 218, subW = 90, subH = 60;
    ctx.fillStyle = 'rgba(200,216,232,0.5)';
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
    ctx.fillRect(subX, subY, subW, subH); ctx.strokeRect(subX, subY, subW, subH);

    // Substation bus bar (horizontal line)
    ctx.strokeStyle = ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(subX+4, subY+22); ctx.lineTo(subX+subW-4, subY+22); ctx.stroke();

    // Three switch/breaker symbols inside substation
    [subX+16, subX+45, subX+74].forEach(function(sx2) {
      ctx.strokeStyle = ink; ctx.lineWidth = 1;
      ctx.strokeRect(sx2-6, subY+28, 12, 24);
      ctx.beginPath(); ctx.moveTo(sx2, subY+22); ctx.lineTo(sx2, subY+28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx2, subY+52); ctx.lineTo(sx2, subY+60); ctx.stroke();
    });

    pill('SUBSTATION BUS', subX-2, subY+10);
    pill('SUBSTATION', subX+10, subY+subH+10, 'center');
    pill('SUBSTATION AREA', subX+subW+4, subY+subH/2);

    /* ════════════════════════════════════════════
       6. DISTRIBUTION LINE from substation down
       ════════════════════════════════════════════ */
    var distY = subY + subH; // 278
    // Horizontal distribution bus
    ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(subX+16, distY); ctx.lineTo(subX+subW-16, distY); ctx.stroke();

    // Dots on distribution bus
    [subX+16, subX+45, subX+74].forEach(function(dx) {
      dot(dx, distY);
    });

    // Vertical feeder lines down to buildings
    var feedY1 = distY + 40;  // top of building row 1
    var feedY2 = distY + 85;  // top of building row 2

    [subX+16, subX+45, subX+74].forEach(function(fx, fi) {
      ctx.strokeStyle = ink; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(fx, distY); ctx.lineTo(fx, feedY1-2); ctx.stroke();
      blueArrow(fx, feedY1-10, fx, feedY1);
    });

    pill('DISTRIBUTION', subX-20, distY+22);
    pill('FEEDERS', subX-20, distY+32);

    /* ════════════════════════════════════════════
       7. CITY BUILDINGS — ROW 1 (houses)
       ════════════════════════════════════════════ */
    function drawHouse(hx, hy, w, h) {
      ctx.fillStyle = '#c8b460'; ctx.strokeStyle = ink; ctx.lineWidth = 1;
      ctx.fillRect(hx, hy, w, h); ctx.strokeRect(hx, hy, w, h);
      // Roof
      ctx.fillStyle = '#1a3a6e';
      ctx.beginPath(); ctx.moveTo(hx-3, hy); ctx.lineTo(hx+w/2, hy-h*0.55); ctx.lineTo(hx+w+3, hy); ctx.closePath();
      ctx.fill(); ctx.stroke();
      // Door
      ctx.fillStyle = '#a09050'; ctx.strokeStyle = ink; ctx.lineWidth = 0.7;
      ctx.fillRect(hx+w/2-4, hy+h-10, 8, 10); ctx.strokeRect(hx+w/2-4, hy+h-10, 8, 10);
      // Window
      ctx.fillStyle = 'rgba(100,160,220,0.6)';
      ctx.fillRect(hx+4, hy+4, 8, 7); ctx.strokeRect(hx+4, hy+4, 8, 7);
    }
    function drawBuilding(bx, by, w, h) {
      ctx.fillStyle = '#b0c4d8'; ctx.strokeStyle = ink; ctx.lineWidth = 1;
      ctx.fillRect(bx, by, w, h); ctx.strokeRect(bx, by, w, h);
      // Windows grid
      ctx.fillStyle = 'rgba(100,160,220,0.5)';
      for (var wr = 0; wr < 2; wr++) {
        for (var wc = 0; wc < 2; wc++) {
          ctx.fillRect(bx+4+wc*9, by+4+wr*10, 6, 7);
          ctx.strokeRect(bx+4+wc*9, by+4+wr*10, 6, 7);
        }
      }
    }
    function streetLight(slx, sly) {
      ctx.strokeStyle = ink; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(slx, sly+20); ctx.lineTo(slx, sly); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(slx, sly); ctx.lineTo(slx+8, sly-2); ctx.stroke();
      ctx.fillStyle = gold;
      ctx.beginPath(); ctx.arc(slx+8, sly-2, 2.5, 0, Math.PI*2); ctx.fill();
    }

    // Row 1: houses & lamp posts
    drawHouse(subX-62, feedY1, 22, 16);
    streetLight(subX-34, feedY1+8);
    drawHouse(subX+16-11, feedY1, 22, 16);
    drawHouse(subX+45+5, feedY1, 18, 14);
    streetLight(subX+74+2, feedY1+8);
    drawBuilding(subX+84, feedY1, 20, 22);

    pill('CITY BUILDING', subX-72, feedY1+26);
    pill('ICONS', subX-72, feedY1+36);

    /* ════════════════════════════════════════════
       8. CITY GRID ROW 2 (more buildings)
       ════════════════════════════════════════════ */
    // Horizontal grid line
    ctx.strokeStyle = ink; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(subX-70, feedY1+42); ctx.lineTo(subX+subW+20, feedY1+42); ctx.stroke();
    dot(subX-44, feedY1+42); dot(subX+10, feedY1+42); dot(subX+45, feedY1+42); dot(subX+74, feedY1+42);

    // Row 2
    drawBuilding(subX-68, feedY2, 28, 26);
    streetLight(subX-32, feedY2+10);
    drawHouse(subX+6, feedY2, 22, 18);
    streetLight(subX+38, feedY2+10);
    drawBuilding(subX+55, feedY2, 24, 24);
    drawBuilding(subX+84, feedY2, 22, 24);

    pill('CITY GRID', subX+30, feedY2+32, 'center');
    pill('(DISTRIBUTION)', subX+30, feedY2+42, 'center');

    /* ════════════════════════════════════════════
       9. TRANSMISSION LINE TENSION label + dim
       ════════════════════════════════════════════ */
    ctx.strokeStyle = ink; ctx.lineWidth = 1;
    ctx.setLineDash([4,3]);
    ctx.beginPath(); ctx.moveTo(txUpX+23, 32); ctx.lineTo(txDnX+26, 32); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(txUpX+23, 28); ctx.lineTo(txUpX+23, 36); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(txDnX+26, 28); ctx.lineTo(txDnX+26, 36); ctx.stroke();
    // Arrowheads on dim line
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.moveTo(txUpX+23,32); ctx.lineTo(txUpX+30,29); ctx.lineTo(txUpX+30,35); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(txDnX+26,32); ctx.lineTo(txDnX+19,29); ctx.lineTo(txDnX+19,35); ctx.closePath(); ctx.fill();
    pill('TRANSMISSION DISTANCE (km)', SIZE/2, 22, 'center');
    pill('TRANSMISSION', txUpX+46, 46);
    pill('LINE TENSION', txUpX+46, 56);

    /* ════════════════════════════════════════════
       10. DISTRIBUTION REACH dim (right side)
       ════════════════════════════════════════════ */
    ctx.strokeStyle = ink; ctx.lineWidth = 1;
    ctx.setLineDash([4,3]);
    ctx.beginPath(); ctx.moveTo(SIZE-18, distY); ctx.lineTo(SIZE-18, feedY2+26); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(SIZE-22, distY); ctx.lineTo(SIZE-14, distY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(SIZE-22, feedY2+26); ctx.lineTo(SIZE-14, feedY2+26); ctx.stroke();
    // Rotated text for DISTRIBUTION REACH
    ctx.save();
    ctx.translate(SIZE-10, (distY + feedY2+26)/2);
    ctx.rotate(Math.PI/2);
    ctx.font = 'bold 7px "Roboto Mono",monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = ink;
    ctx.fillText('DISTRIBUTION REACH', 0, 0);
    ctx.restore();

    /* ════════════════════════════════════════════
       11. SPECIFICATIONS BOX
       ════════════════════════════════════════════ */
    var bxX = SIZE-190, bxY = SIZE-62, bxW = 178, bxH = 52;
    ctx.fillStyle = '#f0f5fa'; ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
    ctx.fillRect(bxX, bxY, bxW, bxH); ctx.strokeRect(bxX, bxY, bxW, bxH);
    ctx.beginPath(); ctx.moveTo(bxX+bxW-12, bxY); ctx.lineTo(bxX+bxW, bxY+12); ctx.lineTo(bxX+bxW-12, bxY+12); ctx.closePath();
    ctx.fillStyle = '#c8d8e8'; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.stroke();

    ctx.fillStyle = ink; ctx.font = 'bold 8px "Roboto Mono",monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('SPECIFICATIONS:', bxX+6, bxY+11);
    ctx.font = 'bold 7px "Roboto Mono",monospace';
    ctx.fillText('SYSTEM SPECS: | Gen. Voltage: 13.8 kV | Trans. Voltage:', bxX+6, bxY+22);
    ctx.font = '7px "Roboto Mono",monospace';
    ctx.fillText('500 kV | Sub. Voltage: 132 kV | City Feed: 13.8 kV/415 V', bxX+6, bxY+33);
    ctx.fillText('Line Span: ~1200 m | Max Load: 250 MW', bxX+6, bxY+44);

    titleBar(ctx, '\u26A1 POWER TRANSMISSION SYSTEM \u2014 EEE DEPT', ink);
    return c;
  }

  /* ══════════════════════════════════════════════════════════════
     8. ECE — Oscilloscope Display (real instrument look)
     ══════════════════════════════════════════════════════════════ */
  function drawECE() {
    var c = makeCanvas(), ctx = c.getContext('2d');

    /* ── Instrument body ──────────────────────────────────────── */
    // Outer body (light grey, rounded)
    ctx.fillStyle = '#d8dce4';
    ctx.strokeStyle = '#a8adb8';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(4, 4, SIZE-8, SIZE-8, 18); ctx.fill(); ctx.stroke();

    // Golden/tan border stripe around screen
    ctx.fillStyle = '#c8a030';
    ctx.beginPath(); ctx.roundRect(16, 14, SIZE-32, 330, 10); ctx.fill();

    // Screen bezel (inner light frame)
    ctx.fillStyle = '#e8eaf0';
    ctx.strokeStyle = '#9098a8';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(22, 20, SIZE-44, 318, 7); ctx.fill(); ctx.stroke();

    /* ── Screen interior ─────────────────────────────────────── */
    var scrX = 28, scrY = 26, scrW = SIZE-56, scrH = 306;
    // White/very light blue screen background
    ctx.fillStyle = '#f5f7fb';
    ctx.fillRect(scrX, scrY, scrW, scrH);

    // Fine graticule grid (10 cols × 8 rows)
    var cols = 10, rows = 8;
    var cellW = scrW / cols, cellH = scrH / rows;

    // Minor grid (light blue)
    ctx.strokeStyle = 'rgba(130,160,210,0.3)'; ctx.lineWidth = 0.5;
    for (var gxi = 0; gxi <= cols*5; gxi++) {
      var gxp = scrX + gxi * (scrW/(cols*5));
      ctx.beginPath(); ctx.moveTo(gxp, scrY); ctx.lineTo(gxp, scrY+scrH); ctx.stroke();
    }
    for (var gyi = 0; gyi <= rows*5; gyi++) {
      var gyp = scrY + gyi * (scrH/(rows*5));
      ctx.beginPath(); ctx.moveTo(scrX, gyp); ctx.lineTo(scrX+scrW, gyp); ctx.stroke();
    }
    // Major grid (darker blue)
    ctx.strokeStyle = 'rgba(100,130,190,0.55)'; ctx.lineWidth = 0.8;
    for (var mc = 0; mc <= cols; mc++) {
      var mxp = scrX + mc * cellW;
      ctx.beginPath(); ctx.moveTo(mxp, scrY); ctx.lineTo(mxp, scrY+scrH); ctx.stroke();
    }
    for (var mr = 0; mr <= rows; mr++) {
      var myp = scrY + mr * cellH;
      ctx.beginPath(); ctx.moveTo(scrX, myp); ctx.lineTo(scrX+scrW, myp); ctx.stroke();
    }

    /* ── Waveform parameters ─────────────────────────────────── */
    var midY   = scrY + scrH / 2;       // 0V line  ≈ y=179
    var vScale = scrH / 8;              // pixels per division (1div = 0.25V when 1V/div, 8 rows = 4V range)
    var amp1   = 2.2 * vScale;          // sine wave  ±1.0V → ±2.2 divs  (≈ ±84px for 8-row screen)

    // Recalc to match exactly
    amp1 = scrH * 0.36;                 // ~110px half-amplitude for ±1V look
    var amp2 = scrH * 0.43;             // gold square wave larger amplitude

    /* ── CH1: Green sine wave ────────────────────────────────── */
    ctx.strokeStyle = '#3dba5c'; ctx.lineWidth = 2.2;
    ctx.beginPath();
    var sinPeriod = scrW / 2.3;         // ~2 full cycles across screen
    for (var sx = 0; sx <= scrW; sx++) {
      var sy = midY - amp1 * Math.sin(2 * Math.PI * sx / sinPeriod);
      if (sx === 0) ctx.moveTo(scrX + sx, sy); else ctx.lineTo(scrX + sx, sy);
    }
    ctx.stroke();

    /* ── CH2: Gold/orange square wave (wide period) ─────────── */
    ctx.strokeStyle = '#c8a030'; ctx.lineWidth = 2;
    ctx.beginPath();
    var sqPeriodGold = scrW / 1.9;      // ~2 wide cycles
    var sqHigh2 = midY - amp2 * 0.48;
    var sqLow2  = midY + amp2 * 0.48;
    var sq2Prev = sqHigh2;
    ctx.moveTo(scrX, sqHigh2);
    for (var sx2 = 1; sx2 <= scrW; sx2++) {
      var ph2 = (sx2 % sqPeriodGold) / sqPeriodGold;
      var sq2Y = ph2 < 0.5 ? sqHigh2 : sqLow2;
      if (sq2Y !== sq2Prev) { ctx.lineTo(scrX+sx2-1, sq2Prev); ctx.lineTo(scrX+sx2, sq2Y); }
      else { ctx.lineTo(scrX+sx2, sq2Y); }
      sq2Prev = sq2Y;
    }
    ctx.stroke();

    /* ── CH3: Dark navy digital square wave (high freq) ─────── */
    ctx.strokeStyle = '#2a3f7a'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    var sqPeriodNav = scrW / 14;        // many narrow pulses
    var sqHighNav   = midY - scrH * 0.2;
    var sqLowNav    = midY + scrH * 0.2;
    var sqNavPrev   = sqHighNav;
    ctx.moveTo(scrX, sqHighNav);
    for (var sx3 = 1; sx3 <= scrW; sx3++) {
      var ph3 = (sx3 % sqPeriodNav) / sqPeriodNav;
      var sqNavY = ph3 < 0.5 ? sqHighNav : sqLowNav;
      if (sqNavY !== sqNavPrev) { ctx.lineTo(scrX+sx3-1, sqNavPrev); ctx.lineTo(scrX+sx3, sqNavY); }
      else { ctx.lineTo(scrX+sx3, sqNavY); }
      sqNavPrev = sqNavY;
    }
    ctx.stroke();

    /* ── Cursor vertical dashed lines ───────────────────────── */
    var cursorA = scrX + scrW * 0.22;
    var cursorX = scrX + scrW * 0.50;
    var cursorY = scrX + scrW * 0.74;

    ctx.strokeStyle = 'rgba(40,60,120,0.6)'; ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    [cursorA, cursorX, cursorY].forEach(function(cx2) {
      ctx.beginPath(); ctx.moveTo(cx2, scrY+8); ctx.lineTo(cx2, scrY+scrH-8); ctx.stroke();
    });
    ctx.setLineDash([]);

    /* ── Cursor arrows (top) ─────────────────────────────────── */
    function cursorArrow(cx2, label) {
      var aty = scrY + 6;
      ctx.fillStyle = '#1a3a6e';
      ctx.beginPath(); ctx.moveTo(cx2, aty+10); ctx.lineTo(cx2-5, aty); ctx.lineTo(cx2+5, aty); ctx.closePath(); ctx.fill();
      // Label
      ctx.font = 'bold 7.5px "Roboto Mono",monospace';
      ctx.fillStyle = '#1a3a6e'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      var tw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(245,247,251,0.92)';
      ctx.fillRect(cx2+4, aty-5, tw+4, 12);
      ctx.fillStyle = '#1a3a6e';
      ctx.fillText(label, cx2+6, aty+1);
    }
    // Bottom arrows
    function cursorArrowBot(cx2) {
      var aby = scrY + scrH - 4;
      ctx.fillStyle = '#1a3a6e';
      ctx.beginPath(); ctx.moveTo(cx2, aby-10); ctx.lineTo(cx2-5, aby); ctx.lineTo(cx2+5, aby); ctx.closePath(); ctx.fill();
    }
    cursorArrow(cursorA, 'CURSOR A');
    cursorArrow(cursorX, 'CURSOR X');
    cursorArrow(cursorY, 'CURSOR Y');
    cursorArrowBot(cursorA); cursorArrowBot(cursorX); cursorArrowBot(cursorY);

    /* ── Horizontal cursor lines (voltage markers) ───────────── */
    var vPos   = midY - amp1 * 0.96;   // +1.0V line
    var vNeg   = midY + amp1 * 0.96;   // −1.0V line

    // Left arrow for +1.0V
    ctx.fillStyle = '#2a3f7a';
    ctx.beginPath(); ctx.moveTo(scrX+12, vPos); ctx.lineTo(scrX+4, vPos-4); ctx.lineTo(scrX+4, vPos+4); ctx.closePath(); ctx.fill();
    // Right arrow for ~1.0V (right side)
    ctx.beginPath(); ctx.moveTo(scrX+scrW-12, vPos); ctx.lineTo(scrX+scrW-4, vPos-4); ctx.lineTo(scrX+scrW-4, vPos+4); ctx.closePath(); ctx.fill();

    /* ── Voltage axis labels ─────────────────────────────────── */
    ctx.font = 'bold 8px "Roboto Mono",monospace';
    ctx.fillStyle = '#1a3a6e'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('1.0V', scrX - 2, vPos);
    ctx.fillText('-1.0V', scrX - 2, vNeg);

    // VOLTAGE (V) rotated label
    ctx.save();
    ctx.translate(10, scrY + scrH/2);
    ctx.rotate(-Math.PI/2);
    ctx.font = 'bold 7.5px "Roboto Mono",monospace';
    ctx.fillStyle = '#1a3a6e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('VOLTAGE (V)', 0, 0);
    ctx.restore();

    /* ── Time axis labels ────────────────────────────────────── */
    ctx.font = 'bold 7.5px "Roboto Mono",monospace';
    ctx.fillStyle = '#1a3a6e'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('5.0ms / DIV', scrX + scrW * 0.18, scrY + scrH + 3);
    ctx.fillText('5.0ms / DIV', scrX + scrW * 0.58, scrY + scrH + 3);
    ctx.fillText('TIME (s)', scrX + scrW / 2, scrY + scrH + 14);

    /* ── Measurement readout box ─────────────────────────────── */
    var mxX = scrX + scrW - 96, mxY = midY + 10, mxW = 90, mxH = 44;
    ctx.fillStyle = 'rgba(245,247,251,0.93)';
    ctx.strokeStyle = '#6878a8'; ctx.lineWidth = 1;
    ctx.fillRect(mxX, mxY, mxW, mxH); ctx.strokeRect(mxX, mxY, mxW, mxH);
    ctx.font = '7px "Roboto Mono",monospace';
    ctx.fillStyle = '#1a3a6e'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('\u0394V: 1.50V', mxX+4, mxY+9);
    ctx.fillText('\u0394V: 2.20V -1.50V', mxX+4, mxY+22);
    ctx.fillText('\u0394T: 8.5ms', mxX+4, mxY+35);

    /* ── Control panel (bottom) ──────────────────────────────── */
    var panY = scrY + scrH + 26;
    var panH = SIZE - panY - 8;

    // Panel background
    ctx.fillStyle = '#d0d4de'; ctx.strokeStyle = '#a8adb8'; ctx.lineWidth = 1.5;
    ctx.fillRect(4, panY-2, SIZE-8, panH+4);
    ctx.strokeRect(4, panY-2, SIZE-8, panH+4);

    // Divider line
    ctx.strokeStyle = '#a8adb8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(260, panY); ctx.lineTo(260, panY+panH); ctx.stroke();

    var knobY = panY + 20;

    /* Draw a realistic knob */
    function knob(kx, ky, r, bodyCol, markCol) {
      // Outer ring
      ctx.beginPath(); ctx.arc(kx, ky, r+3, 0, Math.PI*2);
      ctx.fillStyle = '#b0b6c4'; ctx.fill();
      ctx.strokeStyle = '#8890a0'; ctx.lineWidth = 1; ctx.stroke();
      // Body
      ctx.beginPath(); ctx.arc(kx, ky, r, 0, Math.PI*2);
      ctx.fillStyle = bodyCol || '#3a3f50'; ctx.fill();
      ctx.strokeStyle = '#555a6e'; ctx.lineWidth = 0.8; ctx.stroke();
      // Center dot
      ctx.beginPath(); ctx.arc(kx, ky, r*0.25, 0, Math.PI*2);
      ctx.fillStyle = markCol || '#c8a030'; ctx.fill();
      // Indicator line
      ctx.strokeStyle = markCol || '#c8a030'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(kx, ky-r+2); ctx.stroke();
    }

    /* Draw a button */
    function btn(bx, by, bw, bh, col, label) {
      ctx.fillStyle = col; ctx.strokeStyle = '#6878a0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 3); ctx.fill(); ctx.stroke();
      if (label) {
        ctx.font = 'bold 6px "Roboto Mono",monospace';
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, bx+bw/2, by+bh/2);
      }
    }

    /* Draw label below element */
    function lbl(lx, ly, lines, align) {
      ctx.font = 'bold 6.5px "Roboto Mono",monospace';
      ctx.fillStyle = '#1a3a6e'; ctx.textAlign = align || 'center'; ctx.textBaseline = 'top';
      lines.forEach(function(l, i) { ctx.fillText(l, lx, ly + i*8); });
    }

    // ── LEFT PANEL ──────────────────────────────────────────────
    // RUN/STOP green circle
    ctx.beginPath(); ctx.arc(38, knobY-6, 8, 0, Math.PI*2);
    ctx.fillStyle = '#38b860'; ctx.fill();
    ctx.strokeStyle = '#1a7a40'; ctx.lineWidth = 1; ctx.stroke();
    lbl(38, knobY+5, ['RUN/STOP']);

    // VOLTS/DIV knob pair
    knob(88, knobY-4, 12, '#3a3f50', '#c8a030');
    knob(118, knobY-4, 10, '#4a5060', '#c8a030');
    lbl(103, knobY+11, ['VOLTS/DIV', '1.0V / DIV']);

    // Cursor ON/OFF button + MENU button
    btn(56, knobY+28, 30, 11, '#c0c8d8', '');
    ctx.font = '5.5px "Roboto Mono",monospace'; ctx.fillStyle = '#1a3a6e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('\u25B6 OFF', 71, knobY+33);
    btn(90, knobY+28, 30, 11, '#2a3f8a');
    ctx.font = '5.5px "Roboto Mono",monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText('MENU', 105, knobY+33);
    lbl(71, knobY+41, ['CURSOR', 'ON/OFF']);
    lbl(105, knobY+41, ['MENU']);

    // ── CENTRE PANEL ────────────────────────────────────────────
    // TIME/DIV large knob
    knob(185, knobY-4, 18, '#2a3040', '#3070d0');
    lbl(185, knobY+17, ['TIME/DIV']);
    ctx.font = '5.5px "Roboto Mono",monospace'; ctx.fillStyle = '#555'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Off         tims', 185, knobY+7);

    // Second knob below
    knob(185, knobY+35, 11, '#3a3f50', '#c8a030');

    // MENU button
    btn(165, knobY+53, 22, 11, '#2a3f8a');
    ctx.font = '5.5px "Roboto Mono",monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText('MENU', 176, knobY+58);

    // Waveform select button (gold)
    btn(198, knobY+53, 28, 11, '#c8a030');
    ctx.font = '5.5px "Roboto Mono",monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText('~~', 212, knobY+58);
    lbl(198, knobY+66, ['WAVEFORM', 'SELECT'], 'left');

    // ── RIGHT PANEL ─────────────────────────────────────────────
    // TRIGGER LEVEL knob
    knob(308, knobY-4, 12, '#3a3f50', '#c8a030');
    lbl(308, knobY+11, ['TRIGGER', 'LEVEL']);

    // TRIGGER MODE button (gold rect)
    btn(332, knobY-14, 26, 12, '#c8a030');
    ctx.font = '5.5px "Roboto Mono",monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText('ttNOE', 345, knobY-8);
    lbl(345, knobY+11, ['TRIGGER', 'ttNOE']);

    // INPUT CH1 (BNC connector symbol)
    ctx.beginPath(); ctx.arc(400, knobY-4, 13, 0, Math.PI*2);
    ctx.fillStyle = '#e8eaf0'; ctx.fill();
    ctx.strokeStyle = '#6878a8'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(400, knobY-4, 6, 0, Math.PI*2);
    ctx.fillStyle = '#b0b8c8'; ctx.fill();
    ctx.strokeStyle = '#808898'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(400, knobY-4, 2, 0, Math.PI*2);
    ctx.fillStyle = '#506080'; ctx.fill();
    // Arrow line to BNC
    ctx.strokeStyle = '#1a3a6e'; ctx.lineWidth = 1; ctx.fillStyle = '#1a3a6e';
    ctx.beginPath(); ctx.moveTo(370, knobY-4); ctx.lineTo(385, knobY-4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(385,knobY-4); ctx.lineTo(381,knobY-6); ctx.lineTo(381,knobY-2); ctx.closePath(); ctx.fill();
    lbl(400, knobY+12, ['INPUT CH1']);

    /* ── SYSTEM SPECS box ────────────────────────────────────── */
    var specX = 232, specY = panY + 30, specW = 134, specH = 42;
    ctx.fillStyle = '#f0f4fa'; ctx.strokeStyle = '#6878a8'; ctx.lineWidth = 1.2;
    ctx.fillRect(specX, specY, specW, specH); ctx.strokeRect(specX, specY, specW, specH);
    // Dog-ear
    ctx.beginPath(); ctx.moveTo(specX+specW-10, specY); ctx.lineTo(specX+specW, specY+10);
    ctx.lineTo(specX+specW-10, specY+10); ctx.closePath();
    ctx.fillStyle = '#c8d8e8'; ctx.fill();
    ctx.strokeStyle = '#6878a8'; ctx.lineWidth = 0.8; ctx.stroke();

    ctx.fillStyle = '#1a3a6e'; ctx.font = 'bold 7px "Roboto Mono",monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('SYSTEM SPECS:', specX+4, specY+8);
    ctx.font = '6px "Roboto Mono",monospace';
    ctx.fillText('Bandwidth: 100MHz | Sample Rate: 1GS/s', specX+4, specY+19);
    ctx.fillText('Screen Res: 800x600 | Graticule: 8x10 DIV', specX+4, specY+29);
    ctx.fillText('Waveforms: 3 simultaneous', specX+4, specY+39);

    titleBar(ctx, '\uD83D\uDCE1 OSCILLOSCOPE DISPLAY \u2014 ECE DEPT', '#1a3a6e');
    return c;
  }

  /* ══════════════════════════════════════════════════════════════
     9. ECX — IoT Wireless Sensor Network
     ══════════════════════════════════════════════════════════════ */
  function drawECX() {
    var c = makeCanvas(), ctx = c.getContext('2d');

    /* ── Blueprint background ─────────────────────────────────── */
    ctx.fillStyle = '#dce8f5';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.strokeStyle = 'rgba(100,140,200,0.22)'; ctx.lineWidth = 0.5;
    for (var gx = 0; gx < SIZE; gx += 10) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,SIZE); ctx.stroke(); }
    for (var gy = 0; gy < SIZE; gy += 10) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(SIZE,gy); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(100,140,200,0.40)'; ctx.lineWidth = 0.7;
    for (var mgx = 0; mgx < SIZE; mgx += 50) { ctx.beginPath(); ctx.moveTo(mgx,0); ctx.lineTo(mgx,SIZE); ctx.stroke(); }
    for (var mgy = 0; mgy < SIZE; mgy += 50) { ctx.beginPath(); ctx.moveTo(0,mgy); ctx.lineTo(SIZE,mgy); ctx.stroke(); }
    ctx.strokeStyle = '#2255aa'; ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, SIZE-12, SIZE-12);

    var ink  = '#1a3a6e';
    var gold = '#c8a030';

    /* ── Helpers ──────────────────────────────────────────────── */
    function pill(label, px, py, align) {
      ctx.font = 'bold 7px "Roboto Mono",monospace';
      ctx.textBaseline = 'middle'; ctx.textAlign = align || 'left';
      var tw = ctx.measureText(label).width;
      var bx = align === 'right' ? px-tw-3 : align === 'center' ? px-tw/2-2 : px-2;
      ctx.fillStyle = 'rgba(220,232,245,0.9)'; ctx.fillRect(bx, py-6, tw+4, 12);
      ctx.fillStyle = ink; ctx.fillText(label, px, py);
    }
    function dot(dx, dy) {
      ctx.fillStyle = gold;
      ctx.beginPath(); ctx.arc(dx, dy, 4.5, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(dx, dy, 4.5, 0, Math.PI*2); ctx.stroke();
    }
    function arrowHead(ax, ay, dir) {
      /* dir: 'right','left','up','down' */
      ctx.fillStyle = 'rgba(80,100,150,0.8)';
      ctx.beginPath();
      if (dir === 'right')      { ctx.moveTo(ax,ay); ctx.lineTo(ax-8,ay-4); ctx.lineTo(ax-8,ay+4); }
      else if (dir === 'left')  { ctx.moveTo(ax,ay); ctx.lineTo(ax+8,ay-4); ctx.lineTo(ax+8,ay+4); }
      else if (dir === 'down')  { ctx.moveTo(ax,ay); ctx.lineTo(ax-4,ay-8); ctx.lineTo(ax+4,ay-8); }
      else                      { ctx.moveTo(ax,ay); ctx.lineTo(ax-4,ay+8); ctx.lineTo(ax+4,ay+8); }
      ctx.closePath(); ctx.fill();
    }
    function wireLine(x1,y1,x2,y2) {
      ctx.strokeStyle = ink; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    }

    /* ── Wireless signal arcs (dashed) ───────────────────────── */
    function wifiArcs(cx, cy, maxR, count) {
      ctx.strokeStyle = 'rgba(80,100,160,0.45)'; ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      for (var wi = 1; wi <= count; wi++) {
        var wr = (maxR / count) * wi;
        ctx.beginPath(); ctx.arc(cx, cy, wr, 0, Math.PI*2); ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    /* ════════════════════════════════════════════════════════════
       Layout: MCU at centre, 4 nodes at corners, dashboard BR
       ════════════════════════════════════════════════════════════ */
    var mcuX = 200, mcuY = 200;   // MCU board centre

    // Wireless arcs around MCU
    wifiArcs(mcuX, mcuY, 110, 4);

    /* ── NODE BOX helper ──────────────────────────────────────── */
    function nodeBox(nx, ny, w, h) {
      ctx.fillStyle = '#f0f4fa'; ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(nx-w/2, ny-h/2, w, h, 8); ctx.fill(); ctx.stroke();
    }

    /* ═══════════════════════════════════════════
       1. TEMPERATURE NODE  (top-left ~80,80)
       ═══════════════════════════════════════════ */
    var tnX = 78, tnY = 78, tnW = 72, tnH = 60;
    nodeBox(tnX, tnY, tnW, tnH);
    // Thermistor body (disc)
    ctx.fillStyle = '#4a6080'; ctx.strokeStyle = ink; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(tnX-14, tnY+4, 12, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    // Zigzag resistor symbol inside
    ctx.strokeStyle = '#c8d8e8'; ctx.lineWidth = 1;
    for (var zi = 0; zi < 4; zi++) {
      ctx.beginPath(); ctx.moveTo(tnX-18+zi*2, tnY+4); ctx.lineTo(tnX-16+zi*2, tnY); ctx.stroke();
    }
    // Thermistor leads
    ctx.strokeStyle = ink; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tnX-20, tnY+16); ctx.lineTo(tnX-20, tnY+28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tnX-8, tnY+16); ctx.lineTo(tnX-8, tnY+28); ctx.stroke();
    // Thermometer icon (right side)
    ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.fillStyle = '#c8d8e8';
    ctx.beginPath(); ctx.roundRect(tnX+4, tnY-10, 8, 22, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e84040';
    ctx.fillRect(tnX+6, tnY+2, 4, 8);
    ctx.beginPath(); ctx.arc(tnX+8, tnY+12, 5, 0, Math.PI*2); ctx.fill();
    // Tick marks on thermometer
    ctx.strokeStyle = ink; ctx.lineWidth = 0.7;
    [tnY-4, tnY+2].forEach(function(ty2) {
      ctx.beginPath(); ctx.moveTo(tnX+12, ty2); ctx.lineTo(tnX+15, ty2); ctx.stroke();
    });
    pill('TEMPERATURE', tnX-tnW/2+4, tnY-tnH/2-10);
    pill('NODE', tnX-tnW/2+4, tnY-tnH/2-1);

    /* ═══════════════════════════════════════════
       2. MOTION NODE  (top-right ~390,78)
       ═══════════════════════════════════════════ */
    var mnX = 392, mnY = 78, mnW = 72, mnH = 60;
    nodeBox(mnX, mnY, mnW, mnH);
    // PIR dome
    ctx.fillStyle = '#c8d8e8'; ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(mnX+4, mnY+6, 18, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9ab0c8';
    ctx.beginPath(); ctx.arc(mnX+4, mnY+6, 12, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    // Motion signal lines (left of dome)
    ctx.strokeStyle = ink; ctx.lineWidth = 1;
    ctx.setLineDash([3,3]);
    [[24,3],[18,7],[13,11]].forEach(function(arc) {
      ctx.beginPath(); ctx.arc(mnX-24, mnY+6, arc[0], -0.5, 0.5); ctx.stroke();
    });
    ctx.setLineDash([]);
    // Walking person icon (top-right of dome)
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.arc(mnX+20, mnY-8, 4, 0, Math.PI*2); ctx.fill(); // head
    ctx.beginPath(); ctx.moveTo(mnX+20,mnY-4); ctx.lineTo(mnX+20,mnY+6);
    ctx.lineTo(mnX+16,mnY+14); ctx.moveTo(mnX+20,mnY+6); ctx.lineTo(mnX+24,mnY+14);
    ctx.moveTo(mnX+17,mnY-1); ctx.lineTo(mnX+23,mnY+2); ctx.stroke();
    pill('MOTION', mnX-mnW/2+4, mnY-mnH/2-10);
    pill('NODE', mnX-mnW/2+4, mnY-mnH/2-1);

    /* ═══════════════════════════════════════════
       3. CAMERA NODE  (bottom-left ~78,360)
       ═══════════════════════════════════════════ */
    var cnX = 78, cnY = 358, cnW = 80, cnH = 64;
    nodeBox(cnX, cnY, cnW, cnH);
    // Camera body
    ctx.fillStyle = '#3a4860'; ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(cnX-26, cnY-14, 52, 32, 5); ctx.fill(); ctx.stroke();
    // Viewfinder bump
    ctx.fillStyle = '#4a5870'; ctx.strokeStyle = ink; ctx.lineWidth = 1;
    ctx.fillRect(cnX-8, cnY-20, 16, 8); ctx.strokeRect(cnX-8, cnY-20, 16, 8);
    // Lens
    ctx.fillStyle = '#1a2a40'; ctx.strokeStyle = '#6888b8'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cnX-2, cnY, 13, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a4060';
    ctx.beginPath(); ctx.arc(cnX-2, cnY, 8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(150,180,220,0.4)';
    ctx.beginPath(); ctx.arc(cnX-5, cnY-3, 4, 0, Math.PI*2); ctx.fill();
    // Aperture ring icon
    ctx.strokeStyle = '#a0b8d0'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(cnX+22, cnY-10, 7, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cnX+22, cnY-17); ctx.lineTo(cnX+22, cnY-3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cnX+15, cnY-10); ctx.lineTo(cnX+29, cnY-10); ctx.stroke();
    pill('CAMERA NODE', cnX-cnW/2+2, cnY+cnH/2+8);

    /* ═══════════════════════════════════════════
       4. HUMIDITY NODE  (bottom-right ~380,335)
       ═══════════════════════════════════════════ */
    var hnX = 370, hnY = 335, hnW = 72, hnH = 64;
    nodeBox(hnX, hnY, hnW, hnH);
    // DHT sensor body (rectangle)
    ctx.fillStyle = '#4a6080'; ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
    ctx.fillRect(hnX-14, hnY-14, 28, 26); ctx.strokeRect(hnX-14, hnY-14, 28, 26);
    // Grid on sensor
    ctx.strokeStyle = '#c8d8e8'; ctx.lineWidth = 0.5;
    for (var si = 1; si < 4; si++) {
      ctx.beginPath(); ctx.moveTo(hnX-14+si*7, hnY-14); ctx.lineTo(hnX-14+si*7, hnY+12); ctx.stroke();
    }
    for (var sj = 1; sj < 3; sj++) {
      ctx.beginPath(); ctx.moveTo(hnX-14, hnY-14+sj*9); ctx.lineTo(hnX+14, hnY-14+sj*9); ctx.stroke();
    }
    // Sensor legs
    ctx.strokeStyle = ink; ctx.lineWidth = 1.2;
    [-8, 0, 8].forEach(function(lx) {
      ctx.beginPath(); ctx.moveTo(hnX+lx, hnY+12); ctx.lineTo(hnX+lx, hnY+22); ctx.stroke();
    });
    // Water drop icons
    ctx.fillStyle = '#5090d0';
    [[hnX+22, hnY-8],[hnX+28, hnY-2]].forEach(function(dp) {
      ctx.beginPath();
      ctx.moveTo(dp[0], dp[1]-8); ctx.quadraticCurveTo(dp[0]+6,dp[1],dp[0],dp[1]+4);
      ctx.quadraticCurveTo(dp[0]-6,dp[1],dp[0],dp[1]-8); ctx.fill();
    });
    pill('HUMIDITY', hnX-hnW/2+4, hnY-hnH/2-10);
    pill('NODE', hnX-hnW/2+4, hnY-hnH/2-1);

    /* ═══════════════════════════════════════════
       5. NETWORK HUB / MCU (Arduino board)
       ═══════════════════════════════════════════ */
    var bx = mcuX-58, by = mcuY-50, bw = 116, bh = 100;
    // PCB board
    ctx.fillStyle = '#d8e8d0'; ctx.strokeStyle = '#4a7a5a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.fill(); ctx.stroke();

    // Pin header rows (top)
    ctx.fillStyle = '#3a4860'; ctx.strokeStyle = ink; ctx.lineWidth = 0.8;
    for (var ph = 0; ph < 14; ph++) {
      ctx.fillRect(bx+6+ph*7, by+2, 5, 8); ctx.strokeRect(bx+6+ph*7, by+2, 5, 8);
    }
    // Pin header (bottom)
    for (var ph2 = 0; ph2 < 14; ph2++) {
      ctx.fillRect(bx+6+ph2*7, by+bh-10, 5, 8); ctx.strokeRect(bx+6+ph2*7, by+bh-10, 5, 8);
    }
    // USB-B port (left)
    ctx.fillStyle = '#6878a8'; ctx.strokeStyle = ink; ctx.lineWidth = 1;
    ctx.fillRect(bx-8, by+30, 10, 18); ctx.strokeRect(bx-8, by+30, 10, 18);
    // Power jack
    ctx.beginPath(); ctx.arc(bx+14, by+bh-22, 7, 0, Math.PI*2);
    ctx.fillStyle = '#2a3040'; ctx.fill(); ctx.strokeStyle = ink; ctx.stroke();
    ctx.beginPath(); ctx.arc(bx+14, by+bh-22, 3, 0, Math.PI*2);
    ctx.fillStyle = '#505870'; ctx.fill();
    // ATmega chip
    ctx.fillStyle = '#2a3040'; ctx.strokeStyle = '#8090b0'; ctx.lineWidth = 1.2;
    ctx.fillRect(bx+45, by+35, 40, 30); ctx.strokeRect(bx+45, by+35, 40, 30);
    // Chip legs (left)
    for (var cl = 0; cl < 4; cl++) {
      ctx.strokeStyle = '#8090b0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx+45, by+38+cl*7); ctx.lineTo(bx+40, by+38+cl*7); ctx.stroke();
    }
    // Chip legs (right)
    for (var cr = 0; cr < 4; cr++) {
      ctx.strokeStyle = '#8090b0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx+85, by+38+cr*7); ctx.lineTo(bx+90, by+38+cr*7); ctx.stroke();
    }
    ctx.font = 'bold 6px "Roboto Mono",monospace'; ctx.fillStyle = '#c8d8e8';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('MCU', bx+65, by+50);
    // Crystal
    ctx.fillStyle = '#d0c080'; ctx.strokeStyle = '#8a7a00'; ctx.lineWidth = 1;
    ctx.fillRect(bx+30, by+36, 10, 18); ctx.strokeRect(bx+30, by+36, 10, 18);
    // Various small SMD components
    ctx.strokeStyle = '#8090b0'; ctx.lineWidth = 0.8;
    [[bx+10, by+18],[bx+22, by+18],[bx+34, by+18]].forEach(function(sp) {
      ctx.fillStyle = '#4a5870'; ctx.fillRect(sp[0], sp[1], 8, 5); ctx.strokeRect(sp[0], sp[1], 8, 5);
    });
    // Orange power LED
    ctx.fillStyle = '#c8a030'; ctx.strokeStyle = ink; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(bx+100, by+18, 4, 0, Math.PI*2); ctx.fill(); ctx.stroke();

    pill('NETWORK HUB / MCU', mcuX, by+bh+10, 'center');

    /* ═══════════════════════════════════════════
       6. WIRES + DOTS connecting nodes → MCU
       ═══════════════════════════════════════════ */
    ctx.strokeStyle = ink; ctx.lineWidth = 1.3;

    // Temperature node → MCU (top-left path)
    // Horizontal segment
    wireLine(tnX+tnW/2, tnY, 155, tnY);
    dot(155, tnY);
    wireLine(155, tnY, 155, by+20);
    dot(155, by+20);
    wireLine(155, by+20, bx, by+20);
    arrowHead(bx, by+20, 'right');
    dot(tnX+tnW/2, tnY);

    // Also a second wire below
    wireLine(tnX+tnW/2, tnY+12, 140, tnY+12);
    dot(140, tnY+12);
    wireLine(140, tnY+12, 140, by+35);
    dot(140, by+35);
    wireLine(140, by+35, bx, by+35);
    arrowHead(bx, by+35, 'right');

    // Motion node → MCU (top-right path)
    wireLine(mnX-mnW/2, mnY, 290, mnY);
    dot(290, mnY);
    wireLine(290, mnY, 290, by+20);
    dot(290, by+20);
    wireLine(290, by+20, bx+bw, by+20);
    arrowHead(bx+bw, by+20, 'left');
    dot(mnX-mnW/2, mnY);

    wireLine(mnX-mnW/2, mnY+12, 305, mnY+12);
    dot(305, mnY+12);
    wireLine(305, mnY+12, 305, by+35);
    dot(305, by+35);
    wireLine(305, by+35, bx+bw, by+35);
    arrowHead(bx+bw, by+35, 'left');

    // Camera node → MCU (bottom-left path)
    wireLine(cnX+cnW/2, cnY, 155, cnY);
    dot(155, cnY);
    wireLine(155, cnY, 155, by+bh-20);
    dot(155, by+bh-20);
    wireLine(155, by+bh-20, bx, by+bh-20);
    arrowHead(bx, by+bh-20, 'right');
    dot(cnX+cnW/2, cnY);

    // Humidity node → MCU (bottom-right path)
    wireLine(hnX-hnW/2, hnY, 290, hnY);
    dot(290, hnY);
    wireLine(290, hnY, 290, by+bh-20);
    dot(290, by+bh-20);
    wireLine(290, by+bh-20, bx+bw, by+bh-20);
    arrowHead(bx+bw, by+bh-20, 'left');
    dot(hnX-hnW/2, hnY);

    /* ═══════════════════════════════════════════
       7. DASHBOARD PANEL  (bottom-right)
       ═══════════════════════════════════════════ */
    var dashX = 302, dashY = 370, dashW = 158, dashH = 90;
    ctx.fillStyle = '#2a3a58'; ctx.strokeStyle = '#4a6090'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(dashX, dashY, dashW, dashH, 8); ctx.fill(); ctx.stroke();

    // 4 dashboard cells (2×2 grid)
    var cells = [
      {x: dashX+4,   y: dashY+4,  label: 'TEMP 24.5C',     icon: 'bar'},
      {x: dashX+83,  y: dashY+4,  label: 'MOTION\nDETECTED', icon: 'motion'},
      {x: dashX+4,   y: dashY+48, label: 'CAM ACTIVE',      icon: 'img'},
      {x: dashX+83,  y: dashY+48, label: 'HUM 65%',         icon: 'gauge'},
    ];
    cells.forEach(function(cell) {
      var cw = 75, ch = 38;
      ctx.fillStyle = '#3a4a68'; ctx.strokeStyle = '#5a7098'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(cell.x, cell.y, cw, ch, 5); ctx.fill(); ctx.stroke();

      // Icon area
      if (cell.icon === 'bar') {
        // Bar chart
        ctx.fillStyle = '#c8a030';
        [8,14,10,18,14].forEach(function(h, i) { ctx.fillRect(cell.x+8+i*9, cell.y+ch-6-h, 6, h); });
      } else if (cell.icon === 'motion') {
        // Motion detection icon (person + waves)
        ctx.fillStyle = '#a0b8d8';
        ctx.beginPath(); ctx.arc(cell.x+22, cell.y+10, 5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#a0b8d8'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(cell.x+22,cell.y+15); ctx.lineTo(cell.x+22,cell.y+28);
        ctx.lineTo(cell.x+17,cell.y+36); ctx.moveTo(cell.x+22,cell.y+28); ctx.lineTo(cell.x+27,cell.y+36); ctx.stroke();
        // Wave
        ctx.setLineDash([2,2]);
        [10,14].forEach(function(r) { ctx.beginPath(); ctx.arc(cell.x+44, cell.y+18, r, -0.6, 0.6); ctx.stroke(); });
        ctx.setLineDash([]);
      } else if (cell.icon === 'img') {
        // Camera image preview
        ctx.fillStyle = '#5090c0'; ctx.fillRect(cell.x+6, cell.y+6, 40, 26);
        ctx.fillStyle = '#3070a0'; ctx.fillRect(cell.x+6, cell.y+20, 40, 12);
        // Mountain shape
        ctx.fillStyle = '#6ab0e0';
        ctx.beginPath(); ctx.moveTo(cell.x+10, cell.y+28); ctx.lineTo(cell.x+22, cell.y+12);
        ctx.lineTo(cell.x+34, cell.y+28); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#80c0f0';
        ctx.beginPath(); ctx.arc(cell.x+34, cell.y+14, 5, 0, Math.PI*2); ctx.fill();
      } else if (cell.icon === 'gauge') {
        // Gauge / dial
        ctx.strokeStyle = '#5090c0'; ctx.lineWidth = 4; ctx.fillStyle = 'transparent';
        ctx.beginPath(); ctx.arc(cell.x+26, cell.y+24, 15, Math.PI, 0); ctx.stroke();
        ctx.strokeStyle = '#c8a030'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(cell.x+26, cell.y+24, 15, Math.PI, Math.PI*0.35, true); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cell.x+26, cell.y+24);
        ctx.lineTo(cell.x+26+12*Math.cos(-0.4), cell.y+24+12*Math.sin(-0.4)); ctx.stroke();
      }

      // Cell label
      ctx.font = 'bold 6px "Roboto Mono",monospace';
      ctx.fillStyle = '#c8d8f0'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      cell.label.split('\n').forEach(function(ln, i) {
        ctx.fillText(ln, cell.x+cw-3, cell.y+ch-2-i*7);
      });
    });

    // Wire from camera node to dashboard
    wireLine(cnX+cnW/2+50, cnY, dashX+dashW/3, cnY);
    dot(cnX+cnW/2+50, cnY);
    wireLine(dashX+dashW/3, cnY, dashX+dashW/3, dashY+dashH/4);
    arrowHead(dashX+dashW/3, dashY+dashH/4, 'down');

    // Wire from humidity node bottom to dashboard
    wireLine(hnX, hnY+hnH/2, hnX, dashY);
    dot(hnX, hnY+hnH/2);
    wireLine(hnX, dashY, dashX+dashW*0.7, dashY);
    arrowHead(dashX+dashW*0.7, dashY, 'down');
    dot(dashX+dashW*0.7, dashY);

    /* ═══════════════════════════════════════════
       8. SYSTEM SPECS BOX  (bottom-left)
       ═══════════════════════════════════════════ */
    var spX = 10, spY = 388, spW = 165, spH = 58;
    ctx.fillStyle = '#f0f4fa'; ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
    ctx.fillRect(spX, spY, spW, spH); ctx.strokeRect(spX, spY, spW, spH);
    // Dog-ear
    ctx.beginPath(); ctx.moveTo(spX+spW-10, spY); ctx.lineTo(spX+spW, spY+10);
    ctx.lineTo(spX+spW-10, spY+10); ctx.closePath();
    ctx.fillStyle = '#c8d8e8'; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 0.8; ctx.stroke();

    ctx.fillStyle = ink; ctx.font = 'bold 7.5px "Roboto Mono",monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('SYSTEM SPECS:', spX+4, spY+9);
    ctx.font = '6.5px "Roboto Mono",monospace';
    ctx.fillText('Wireless Protocol: IEEE 802.15.4 | Range: ~100m', spX+4, spY+21);
    ctx.fillText('Nodes: 4 | Power: USB / Battery', spX+4, spY+32);
    ctx.fillText('Data Feed: Serial / I2C', spX+4, spY+43);

    titleBar(ctx, '\uD83D\uDD2C IoT SENSOR NETWORK \u2014 ECX DEPT', ink);
    return c;
  }

  /* ══════════════════════════════════════════════════════════════
     Category Registry  (one per department + camera)
     ══════════════════════════════════════════════════════════════ */

  var CATEGORIES = [
    {
      id: 'camera', label: 'Your Photo', icon: '📷',
      dept: 'ANY', deptLabel: 'Camera', deptColor: '#1a73e8',
      description: 'Capture a region with your hand gesture',
      funFact: null, generate: null,
    },
    {
      id: 'cse', label: 'City Pathfinding', icon: '💻',
      dept: 'CSE', deptLabel: 'CSE', deptColor: '#63b3ed',
      description: 'A* pathfinding on a 20×20 city grid with obstacles',
      funFact: '💻 Dijkstra\'s algorithm (1956) and A* (1968) are the backbone of Google Maps & GPS navigation — every time you get directions, your device solves a shortest-path problem across a graph with millions of nodes!',
      generate: drawCSE,
    },
    {
      id: 'it', label: 'Live Cloud Architecture', icon: '🌐',
      dept: 'IT', deptLabel: 'IT', deptColor: '#38bdf8',
      description: 'Live Cloud Architecture with CDN, Load Balancer, App Servers & DB Cluster',
      funFact: '🌐 Over 80% of all global web traffic is accelerated through CDNs and load balancers — caching content at edge nodes reduces latency by up to 70% for users worldwide!',
      generate: drawIT,
    },
    {
      id: 'aids', label: 'CNN Architecture', icon: '🤖',
      dept: 'AI&DS', deptLabel: 'AI&DS', deptColor: '#a78bfa',
      description: 'Convolutional Neural Network with Conv, Pool, Flatten & Dense layers',
      funFact: '🤖 Convolutional Neural Networks (CNNs) were inspired by the human visual cortex — Yann LeCun\'s LeNet-5 (1998) first proved their power, and today they power facial recognition, medical imaging, and autonomous driving!',
      generate: drawAIDS,
    },
    {
      id: 'csbs', label: 'Star Schema', icon: '📊',
      dept: 'CSBS', deptLabel: 'CSBS', deptColor: '#4ade80',
      description: 'Data warehouse star schema: Fact Table + 4 dimension tables & KPI cards',
      funFact: '📊 The Star Schema was introduced by Ralph Kimball in the 1990s and remains the dominant data warehouse design — used by Amazon, Netflix, and every major analytics platform for lightning-fast BI queries!',
      generate: drawCSBS,
    },
    {
      id: 'mech', label: 'Engine Cross-Section', icon: '🔩',
      dept: 'Mech', deptLabel: 'Mech', deptColor: '#f59e0b',
      description: 'Engine cylinder cross-section blueprint: piston, crankshaft, valves & spark plug',
      funFact: '🔩 A modern car engine fires spark plugs up to 3,000 times per minute per cylinder — the piston travels the full stroke length (86mm in this diagram) in less than 20 milliseconds at highway speed!',
      generate: drawMech,
    },
    {
      id: 'civil', label: 'Suspension Bridge', icon: '🏗️',
      dept: 'Civil', deptLabel: 'Civil', deptColor: '#4ade80',
      description: 'Suspension bridge blueprint: towers, catenary cables, deck & riverbed foundation',
      funFact: '🏗️ The Golden Gate Bridge\'s main cables contain 80,000 miles of wire — enough to wrap around the Earth three times! Suspension bridges distribute load through cable tension, allowing spans of over 2 km.',
      generate: drawCivil,
    },
    {
      id: 'eee', label: 'Power Transmission', icon: '⚡',
      dept: 'EEE', deptLabel: 'EEE', deptColor: '#00d4ff',
      description: 'Power grid: hydro generator, step-up/down transformers, HV towers & city distribution',
      funFact: '⚡ The world\'s longest AC transmission line stretches over 2,000 km in Brazil! High-voltage transmission (500 kV+) reduces energy losses to under 5% — making modern cities possible.',
      generate: drawEEE,
    },
    {
      id: 'ece', label: 'Oscilloscope', icon: '📡',
      dept: 'ECE', deptLabel: 'ECE', deptColor: '#00ff64',
      description: 'Real oscilloscope UI: sine, digital & PWM waveforms with cursors & control panel',
      funFact: '📡 The oscilloscope was invented in 1897 by Karl Ferdinand Braun. Modern DSOs sample at 1GS/s — capturing signals a billion times per second — and can display 3+ simultaneous channels in real time!',
      generate: drawECE,
    },
    {
      id: 'ecx', label: 'IoT Network', icon: '🔬',
      dept: 'ECX', deptLabel: 'ECX', deptColor: '#ec407a',
      description: 'Wireless sensor network: MCU hub, temp/motion/camera/humidity nodes & live dashboard',
      funFact: '🔬 The IEEE 802.15.4 standard (used in Zigbee & IoT) can support up to 65,000 nodes in a single network! Modern sensor nodes run for years on a single AA battery thanks to duty-cycling and sleep modes.',
      generate: drawECX,
    },
  ];

  /* ── Public API ──────────────────────────────────────────────────── */
  global.PuzzleCategories = {
    getAll:         function () { return CATEGORIES; },
    getById:        function (id) {
      for (var i = 0; i < CATEGORIES.length; i++) {
        if (CATEGORIES[i].id === id) return CATEGORIES[i];
      }
      return null;
    },
    generateCanvas: function (id) {
      var cat = this.getById(id);
      if (!cat || !cat.generate) return null;
      return cat.generate();
    },
  };

})(window);
