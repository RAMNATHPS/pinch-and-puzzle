# 🤏 Pinch & Puzzle

A gesture-powered photo puzzle game that runs entirely in your browser. Use your webcam and hand gestures to capture a square region of the video feed, then solve a 3×3 sliding puzzle as fast as you can!

## Features

- **Hand Gesture Detection** — Uses MediaPipe Hands for real-time hand tracking (zero server calls)
- **Pinch-to-Select** — Pinch your thumb and index finger together, drag to draw a *square* selection box, release to capture
- **Square Crop Enforcement** — The selection is always forced to a perfect square for a uniform puzzle grid
- **Dwell-Based Puzzle Control** — Point your index finger at a tile for ~0.7 s → a progress ring fills → tile is picked up; point at a cell to drop it
- **3×3 Puzzle** — Tiles are sliced from a square crop and shuffled; drag/dwell them back into position
- **Mouse / Touch Fallback** — Full drag-and-drop and tap-to-select for accessibility or when hand tracking struggles
- **Timer** — High-precision timing starts when the puzzle appears, stops when you solve it
- **Leaderboard** — Tracks best times in localStorage with rankings (fastest-first, your row highlighted)
- **New-Record Celebration** — Confetti + trophy badge when you beat the top time
- **Instant Retry** — "Try Again" never re-requests camera permission; the MediaStream stays alive the whole session
- **Fully Client-Side** — No server required; your camera feed never leaves your device

## Quick Start

### Option 1: npx serve (recommended)
```bash
npx -y serve .
```
Then open [http://localhost:3000](http://localhost:3000) in Chrome or Edge.

### Option 2: Python HTTP server
```bash
python -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000).

### Option 3: VS Code Live Server
Install the "Live Server" extension and click **Go Live** from the status bar.

> **Note:** A local HTTP server is required because MediaPipe loads WebAssembly modules that need proper CORS headers. Opening `index.html` directly via `file://` will **not** work.

## Requirements

- **Browser:** Chrome 90+ or Edge 90+ (WebRTC + WebAssembly)
- **Camera:** A working webcam
- **Internet:** Required on first load to download the MediaPipe model (~5 MB, cached afterward)

## How to Play

### Step 1 — Name Entry
Enter your name and department (both optional — defaults to "Anonymous" / "N/A").
Click **Start Camera**.

### Step 2 — Camera & Selection
Allow camera access when prompted. Your live video feed will appear.
- **Pinch** your thumb and index finger together to start drawing a box.
- **Drag** while pinching to define the area — the box is locked to a square aspect ratio.
- **Release** the pinch to finalize the selection.

### Step 3 — Confirm
A preview of your captured square will appear. Click **Make Puzzle** to continue, or **Retry** to go back.

### Step 4 — Solve the Puzzle!
Tiles are shuffled into the tray. Arrange them into the correct 3×3 grid.

**Gesture control (index finger dwell):**
- Point your index finger at a tile and hold for ~0.7 s → a cyan progress ring fills → tile is picked up (glows amber)
- Point at a grid cell or another tile and hold again → tile is dropped / swapped

**Mouse / touch:**
- Drag tiles from the tray into the grid
- Tap a tile to select it (cyan glow), then tap a destination to place it

### Step 5 — Results
The timer stops the moment all tiles are correct. Your time is saved to the leaderboard.
If it's a new record, confetti falls and a 🏆 badge appears!

## Lighting Tips

- Ensure your hand is well-lit (natural light or a desk lamp works best)
- A plain background helps MediaPipe detect your hand more reliably
- If the "Can't see your hand" warning appears, try moving your hand closer to the camera

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Hand Tracking | MediaPipe Hands (CDN, runs fully client-side) |
| Capture / Slicing | HTML5 Canvas |
| Gesture Control | Custom pinch-select + dwell-selection engine |
| UI & Animations | Vanilla CSS (glassmorphism, keyframe animations) |
| Pointer Interaction | Pointer Events API |
| Persistence | localStorage |
| Server | None (static file serving only) |

## Project Structure

```
├── index.html           — Main entry point & view HTML
├── css/
│   └── style.css        — Dark glassmorphism theme, dwell cursor, animations
├── js/
│   ├── app.js           — State machine: NAME → CAMERA → CONFIRM → PUZZLE → RESULTS
│   ├── gesture.js       — MediaPipe Hands; pinch-mode (camera) & dwell-mode (puzzle)
│   ├── puzzle.js        — Image slicing, shuffle, drag-drop, dwell-based swap
│   ├── timer.js         — performance.now() + rAF timer
│   ├── leaderboard.js   — localStorage CRUD, ranking, render
│   └── confetti.js      — Canvas particle celebration effect
└── README.md
```

## Key Architecture Decisions

### Camera Never Tears Down (Bug Fix §9)
`gesture.js` calls `mpCamera.start()` once and keeps the MediaStream alive for the entire session. When switching views, only `pauseTracking()` / `resumeTracking()` are called, which toggle a `paused` flag inside the `onFrame` callback. The user never sees a permission prompt again after the first one.

### Square Selection
`gesture.js` uses `squareRectFromPoints()` instead of a free-form rectangle, ensuring the captured image is always square. The crop code in `app.js` also has a safety-net `Math.min(srcW, srcH)` clamp.

### Dwell Architecture
```
gesture.js (dwell mode)
  └── indexTip position → onFingerMove({ norm: { x, y } })

app.js
  └── relays to puzzleController.updateGesture(norm.x, norm.y)

puzzle.js
  ├── maps (1-normX) × viewW → clientX  (mirror for natural UX)
  ├── hit-tests with elementFromPoint
  ├── tracks dwell time per target
  ├── draws cursor dot + SVG-style progress ring on #puzzle-gesture-canvas
  └── on dwell complete → pick up / swap / drop
```

## Privacy

All video processing happens locally in your browser using WebAssembly. Your camera feed is never uploaded or transmitted anywhere. Leaderboard entries (name, department, time, date) are stored exclusively in your browser's `localStorage`.
