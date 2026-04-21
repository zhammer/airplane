# Beach Shell Game Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a chill browser-based 2D beach game where a creature walks around picking up shells and releasing them at the shoreline.

**Architecture:** Phaser 3 game scene built with Vite, wrapped in a Chrome Extension Manifest V3 popup. The map is composed of static tiled grass/sand layers plus an animated wave element at the bottom. A virtual joystick (nipplejs) drives 360° player movement. Shell pickup/drop is purely positional — no inventory UI.

**Tech Stack:** Phaser 3, Vite, nipplejs, Chrome Extension MV3

---

## Prerequisites

Before starting, place your assets in `src/assets/`:
- `wave.gif` — the ocean/wave animation
- `beach-tile.png` — rectangular brown sand tile
- `grass-tile.png` — rectangular green grass tile
- `character.png` — creature sprite (single frame or spritesheet)
- `shell-*.png` — one or more shell sprites (e.g. `shell-pink.png`, `shell-purple.png`)
- `tree.png` — tree sprite

You'll also need to know: approximate pixel height of the wave GIF, and the natural tile dimensions for beach/grass tiles.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `manifest.json`
- Create: `popup.html`
- Create: `src/main.js`

**Step 1: Initialize the project**

```bash
cd /Users/zhammer/code/me/airplane
npm init -y
npm install phaser nipplejs
npm install --save-dev vite
mkdir -p src/assets src/scenes
```

**Step 2: Create `vite.config.js`**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: { popup: 'popup.html' },
    },
  },
});
```

**Step 3: Create `popup.html`**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      * { margin: 0; padding: 0; }
      body { width: 480px; height: 360px; overflow: hidden; background: #000; }
      #game { position: relative; width: 480px; height: 360px; }
      #wave-bg {
        position: absolute;
        bottom: 0; left: 0;
        width: 480px;
        pointer-events: none;
        z-index: 0;
      }
    </style>
  </head>
  <body>
    <div id="game">
      <img id="wave-bg" src="src/assets/wave.gif" />
    </div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

> **Note:** The wave GIF is a plain `<img>` behind the Phaser canvas. This lets the browser handle GIF animation natively without needing a Phaser plugin.

**Step 4: Create `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Beach Game",
  "version": "1.0",
  "action": {
    "default_popup": "popup.html",
    "default_title": "Beach Game"
  }
}
```

**Step 5: Create `src/main.js`**

```js
import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  width: 480,
  height: 360,
  backgroundColor: 'transparent',
  transparent: true,
  parent: 'game',
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [MainScene],
});
```

**Step 6: Create `src/scenes/MainScene.js` (skeleton)**

```js
import Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
  constructor() { super('MainScene'); }
  preload() {}
  create() {}
  update() {}
}
```

**Step 7: Run dev server and verify game boots**

```bash
npm run dev
```

Open `http://localhost:5173/popup.html` in Chrome. Should see a black/transparent canvas with the wave GIF at the bottom.

**Step 8: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Phaser 3 + Vite + Chrome extension structure"
```

---

### Task 2: Map Layout

**Files:**
- Modify: `src/scenes/MainScene.js`

The map is 480×360. Decide on the wave GIF height (e.g. 80px). The layout:
- `y: 0` to `y: (360 - waveHeight - sandHeight)` → grass
- `y: (grass bottom)` to `y: (360 - waveHeight)` → sand
- `y: (360 - waveHeight)` to `y: 360` → wave zone (collision boundary)

Pick concrete numbers based on your assets. Example assumes: wave=80px, sand=100px, grass=180px.

**Step 1: Add map constants to `src/scenes/MainScene.js`**

```js
const MAP_W = 480;
const MAP_H = 360;
const WAVE_H = 80;   // adjust to match your wave.gif height
const SAND_H = 100;  // adjust to taste
const GRASS_TOP = 0;
const SAND_TOP = MAP_H - WAVE_H - SAND_H;
const WAVE_TOP = MAP_H - WAVE_H;
```

**Step 2: Tile the grass and sand in `create()`**

```js
create() {
  // Grass tiles
  this.add.tileSprite(0, GRASS_TOP, MAP_W, SAND_TOP - GRASS_TOP, 'grass')
    .setOrigin(0, 0);

  // Sand tiles
  this.add.tileSprite(0, SAND_TOP, MAP_W, SAND_H, 'beach')
    .setOrigin(0, 0);
}
```

**Step 3: Load textures in `preload()`**

```js
preload() {
  this.load.image('grass', 'assets/grass-tile.png');
  this.load.image('beach', 'assets/beach-tile.png');
}
```

**Step 4: Verify in browser**

Run `npm run dev`. You should see tiled grass on top, tiled sand in the middle, and the wave GIF visible at the bottom.

**Step 5: Commit**

```bash
git add src/scenes/MainScene.js
git commit -m "feat: tile grass and sand map layers"
```

---

### Task 3: Shore Boundary

**Files:**
- Create: `src/shore.js`
- Modify: `src/scenes/MainScene.js`

The shore boundary is a static curve at `y = WAVE_TOP`. Because the wave GIF's upper edge has a natural irregular shape, we'll sample it once at startup by drawing the GIF's first frame to an offscreen canvas and scanning pixel columns.

**Step 1: Create `src/shore.js`**

```js
/**
 * Builds a per-x height map of the wave GIF's top edge.
 * Returns an array where shoreY[x] = the y-coordinate of the first
 * non-dark pixel in column x, relative to the wave element's top.
 * Falls back to a flat line if sampling fails.
 */
export function buildShoreHeightMap(waveImgEl, mapWidth, waveTop) {
  const canvas = document.createElement('canvas');
  canvas.width = mapWidth;
  canvas.height = waveImgEl.naturalHeight || 80;
  const ctx = canvas.getContext('2d');

  try {
    ctx.drawImage(waveImgEl, 0, 0, mapWidth, canvas.height);
    const { data } = ctx.getImageData(0, 0, mapWidth, canvas.height);
    const heightMap = new Array(mapWidth);

    for (let x = 0; x < mapWidth; x++) {
      let edgeY = 0;
      for (let y = 0; y < canvas.height; y++) {
        const idx = (y * mapWidth + x) * 4;
        const alpha = data[idx + 3];
        // First pixel with meaningful opacity = wave edge
        if (alpha > 30) { edgeY = y; break; }
      }
      heightMap[x] = waveTop + edgeY;
    }
    return heightMap;
  } catch {
    // Cross-origin or taint: fall back to flat line
    return new Array(mapWidth).fill(waveTop);
  }
}

/** Returns true if the given world point is in the wave zone */
export function isInWaveZone(x, y, heightMap) {
  const xi = Math.max(0, Math.min(Math.floor(x), heightMap.length - 1));
  return y >= heightMap[xi];
}
```

**Step 2: Wire into `MainScene.create()`**

```js
import { buildShoreHeightMap, isInWaveZone } from '../shore.js';

// In create(), after tiles:
const waveEl = document.getElementById('wave-bg');
this.shoreHeightMap = buildShoreHeightMap(waveEl, MAP_W, WAVE_TOP);
```

**Step 3: (Optional) Debug-draw the boundary**

```js
// Temporary — delete after verifying
const g = this.add.graphics();
g.lineStyle(1, 0xff0000, 0.8);
g.beginPath();
for (let x = 0; x < MAP_W; x++) {
  if (x === 0) g.moveTo(x, this.shoreHeightMap[x]);
  else g.lineTo(x, this.shoreHeightMap[x]);
}
g.strokePath();
```

**Step 4: Verify in browser**

Should see a red line tracing the top of the wave GIF. If the line is flat, the fallback fired — check CORS/local file access.

**Step 5: Remove debug graphics, commit**

```bash
git add src/shore.js src/scenes/MainScene.js
git commit -m "feat: shore boundary height map from wave GIF edge"
```

---

### Task 4: Player Movement

**Files:**
- Create: `src/player.js`
- Modify: `src/scenes/MainScene.js`

**Step 1: Create `src/player.js`**

```js
import Phaser from 'phaser';

const SPEED = 120; // px/sec max
const MAP_W = 480;
const MAP_H = 360;

export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, 'character');
    this.sprite.setCollideWorldBounds(true);
    this.joystickInput = { angle: 0, magnitude: 0 }; // set externally
  }

  setInput(angle, magnitude) {
    this.joystickInput = { angle, magnitude };
  }

  update() {
    const { angle, magnitude } = this.joystickInput;
    const speed = magnitude * SPEED;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    this.sprite.setVelocity(vx, vy);
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
  get feet() { return this.sprite.y + this.sprite.height / 2; }
}
```

**Step 2: Load character sprite and create player in `MainScene`**

```js
// preload():
this.load.image('character', 'assets/character.png');

// create():
this.player = new Player(this, MAP_W / 2, SAND_TOP + 50);
```

**Step 3: Call player.update() in scene update()**

```js
update() {
  this.player.update();
}
```

**Step 4: Temporarily wire keyboard to player for testing**

```js
// In create():
this.cursors = this.input.keyboard.createCursorKeys();

// In update(), before player.update():
let angle = 0, magnitude = 0;
const { left, right, up, down } = this.cursors;
if (left.isDown || right.isDown || up.isDown || down.isDown) {
  magnitude = 1;
  if (left.isDown) angle = Math.PI;
  if (right.isDown) angle = 0;
  if (up.isDown) angle = -Math.PI / 2;
  if (down.isDown) angle = Math.PI / 2;
}
this.player.setInput(angle, magnitude);
```

**Step 5: Verify in browser**

Character should move with arrow keys, stop at map edges.

**Step 6: Commit**

```bash
git add src/player.js src/scenes/MainScene.js
git commit -m "feat: player sprite with 360 degree physics movement"
```

---

### Task 5: Virtual Joystick

**Files:**
- Create: `src/joystick.js`
- Modify: `src/scenes/MainScene.js`

**Step 1: Create `src/joystick.js`**

```js
import nipplejs from 'nipplejs';

export function createJoystick(onMove) {
  const zone = document.createElement('div');
  zone.style.cssText = [
    'position:absolute',
    'bottom:10px',
    'left:10px',
    'width:100px',
    'height:100px',
    'z-index:10',
  ].join(';');
  document.getElementById('game').appendChild(zone);

  const joystick = nipplejs.create({
    zone,
    mode: 'static',
    position: { left: '50px', bottom: '50px' },
    color: 'white',
    size: 80,
  });

  joystick.on('move', (_, data) => {
    const angle = data.angle.radian;         // 0=right, CCW
    const magnitude = Math.min(data.distance / 40, 1); // normalize 0-1
    onMove(angle, magnitude);
  });

  joystick.on('end', () => onMove(0, 0));

  return joystick;
}
```

**Step 2: Wire joystick in `MainScene.create()`**

```js
import { createJoystick } from '../joystick.js';

// Remove temporary keyboard code from Task 4, replace with:
createJoystick((angle, magnitude) => {
  this.player.setInput(angle, magnitude);
});
```

**Step 3: Verify in browser**

Drag the joystick — character should move in the corresponding direction. Releasing joystick stops the character.

**Step 4: Commit**

```bash
git add src/joystick.js src/scenes/MainScene.js
git commit -m "feat: nipplejs virtual joystick wired to player"
```

---

### Task 6: Trees (Obstacles)

**Files:**
- Create: `src/trees.js`
- Modify: `src/scenes/MainScene.js`

**Step 1: Create `src/trees.js`**

```js
export function placeTrees(scene, grassBottomY, count = 5) {
  const group = scene.physics.add.staticGroup();
  const margin = 40;
  const mapW = 480;

  for (let i = 0; i < count; i++) {
    const x = margin + Math.random() * (mapW - margin * 2);
    const y = margin + Math.random() * (grassBottomY - margin * 2);
    group.create(x, y, 'tree');
  }

  return group;
}
```

**Step 2: Load tree, create group, add collider in `MainScene`**

```js
// preload():
this.load.image('tree', 'assets/tree.png');

// create():
import { placeTrees } from '../trees.js';
const trees = placeTrees(this, SAND_TOP);
this.physics.add.collider(this.player.sprite, trees);
```

**Step 3: Verify in browser**

Trees should appear in the grass zone. Player should stop when walking into one.

**Step 4: Commit**

```bash
git add src/trees.js src/scenes/MainScene.js
git commit -m "feat: trees placed on grass with solid collision"
```

---

### Task 7: Shell Spawning and Pickup

**Files:**
- Create: `src/shells.js`
- Modify: `src/scenes/MainScene.js`
- Modify: `src/player.js`

**Step 1: Create `src/shells.js`**

```js
const SHELL_TYPES = ['shell-pink', 'shell-purple']; // match your asset names
const PICKUP_DIST = 20; // px

export class ShellManager {
  constructor(scene, sandTopY, waveTopY, count = 8) {
    this.scene = scene;
    this.shells = [];
    this.spawnShells(sandTopY, waveTopY, count);
  }

  spawnShells(sandTopY, waveTopY, count) {
    const mapW = 480;
    const margin = 20;
    for (let i = 0; i < count; i++) {
      const x = margin + Math.random() * (mapW - margin * 2);
      const y = sandTopY + margin + Math.random() * (waveTopY - sandTopY - margin * 2);
      const type = SHELL_TYPES[Math.floor(Math.random() * SHELL_TYPES.length)];
      const sprite = this.scene.add.image(x, y, type);
      this.shells.push({ sprite, type, active: true });
    }
  }

  /**
   * Returns the shell type string if the player is close enough to pick up,
   * and removes it from the world. Returns null otherwise.
   */
  tryPickup(playerX, playerY) {
    for (const shell of this.shells) {
      if (!shell.active) continue;
      const dx = shell.sprite.x - playerX;
      const dy = shell.sprite.y - playerY;
      if (Math.sqrt(dx * dx + dy * dy) < PICKUP_DIST) {
        shell.active = false;
        shell.sprite.destroy();
        return shell.type;
      }
    }
    return null;
  }
}
```

**Step 2: Load shell assets in `preload()`**

```js
this.load.image('shell-pink', 'assets/shell-pink.png');
this.load.image('shell-purple', 'assets/shell-purple.png');
```

**Step 3: Create ShellManager and pickup logic in `MainScene`**

```js
import { ShellManager } from '../shells.js';

// create():
this.shellManager = new ShellManager(this, SAND_TOP, WAVE_TOP);
this.heldShell = null; // null or shell type string
this.heldShellSprite = null;

// update(), after player.update():
if (!this.heldShell) {
  const picked = this.shellManager.tryPickup(this.player.x, this.player.y);
  if (picked) {
    this.heldShell = picked;
    // Render shell overlaid on player
    this.heldShellSprite = this.add.image(0, 0, picked).setDepth(10);
  }
}

// Update held shell position to follow player
if (this.heldShellSprite) {
  this.heldShellSprite.setPosition(
    this.player.x,
    this.player.y + this.player.sprite.height * 0.4
  );
}
```

**Step 4: Verify in browser**

Walking over a shell should make it disappear and appear overlaid on the character.

**Step 5: Commit**

```bash
git add src/shells.js src/scenes/MainScene.js
git commit -m "feat: shell spawning, pickup, and carry overlay"
```

---

### Task 8: Shell Release and Float Animation

**Files:**
- Modify: `src/scenes/MainScene.js`

**Step 1: Add shore check and release in `update()`**

```js
import { isInWaveZone } from '../shore.js';

// update(), after held shell position update:
if (this.heldShell && isInWaveZone(this.player.x, this.player.feet, this.shoreHeightMap)) {
  this.releaseShell();
}
```

**Step 2: Add `releaseShell()` method to MainScene**

```js
releaseShell() {
  const type = this.heldShell;
  const startX = this.player.x;
  const startY = this.player.feet;

  // Remove carry overlay
  this.heldShellSprite.destroy();
  this.heldShell = null;
  this.heldShellSprite = null;

  // Spawn floating shell
  const floater = this.add.image(startX, startY, type).setDepth(5);

  // Animate: bob + drift downward off screen
  this.tweens.add({
    targets: floater,
    y: 400,          // off screen
    duration: 2000,
    ease: 'Sine.easeIn',
    onComplete: () => floater.destroy(),
  });

  // Add a gentle horizontal bob
  this.tweens.add({
    targets: floater,
    x: startX + Phaser.Math.Between(-15, 15),
    duration: 600,
    yoyo: true,
    repeat: 3,
    ease: 'Sine.easeInOut',
  });
}
```

**Step 3: Verify in browser**

Walk to the wave edge while holding a shell — it should release and float off into the waves.

**Step 4: Commit**

```bash
git add src/scenes/MainScene.js
git commit -m "feat: shell releases at shore and floats off into waves"
```

---

### Task 9: Chrome Extension Build

**Files:**
- Modify: `manifest.json`
- Modify: `vite.config.js`

**Step 1: Update `manifest.json` to point at built output**

```json
{
  "manifest_version": 3,
  "name": "Beach Game",
  "version": "1.0",
  "action": {
    "default_popup": "popup.html",
    "default_title": "Beach Game"
  }
}
```

**Step 2: Update `vite.config.js` to copy manifest and assets**

```js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: { popup: resolve(__dirname, 'popup.html') },
    },
  },
  publicDir: 'public', // put manifest.json and assets/ here for Vite to copy
});
```

Move assets to `public/assets/` and `manifest.json` to `public/`.

**Step 3: Build**

```bash
npm run build
```

**Step 4: Load extension in Chrome**

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` folder

**Step 5: Verify popup opens and game works**

Click the extension icon — popup should open and game should be fully playable.

**Step 6: Commit**

```bash
git add .
git commit -m "feat: chrome extension build and asset pipeline"
```

---

## Future: Cross-Tab Joystick Input

When ready to replace the virtual joystick, expose this interface in `MainScene`:

```js
// Call this from the extension background script or content script bridge
window.__beachGameInput = (angle, magnitude) => {
  this.player.setInput(angle, magnitude);
};
```

The content script on the other tab captures its input, sends via `chrome.runtime.sendMessage`, and the background service worker calls `chrome.tabs.sendMessage` to the game tab. No game logic changes required.
