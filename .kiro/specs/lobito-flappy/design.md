# Design Document

## Overview

Lobito Flappy is a self-contained browser game implemented in three flat files: `index.html`, `style.css`, and `game.js`. All rendering happens on a single HTML `<canvas>` element. There is no build step, no module bundler, and no external dependencies. Game logic, physics, rendering, and input handling all live in `game.js` as a single script that runs when the page loads.

---

## Architecture

### File Structure

```
LobitoFlappy/
├── index.html        # Shell: canvas element, links style.css and game.js
├── style.css         # Centers canvas, sets background, minimal chrome
├── game.js           # All game logic, physics, rendering, and input
└── assets/
    └── wolf/
        ├── fly.png
        ├── jump.png
        ├── hit.png
        └── dead.png
```

### Execution Model

`game.js` is loaded as a plain `<script>` tag at the bottom of `<body>`. On load it:
1. Grabs the `<canvas>` and its 2D context.
2. Pre-loads all four wolf sprites into `Image` objects.
3. Wires up `keydown` (Space) and `click` (canvas) event listeners.
4. Enters the READY state.
5. Starts a `requestAnimationFrame` loop that runs every frame.

---

## Components

### State Machine

A single string variable `gameState` holds the current state. Valid values are `'READY'`, `'PLAYING'`, and `'GAME_OVER'`. All other logic branches on this value.

```js
let gameState = 'READY'; // 'READY' | 'PLAYING' | 'GAME_OVER'
```

State transitions:
- `READY → PLAYING`: player presses Space or clicks canvas
- `PLAYING → GAME_OVER`: wolf collides with tower or ground
- `GAME_OVER → READY`: player presses Space or clicks canvas (resets all data)

### Wolf Object

```js
const wolf = {
  x: 80,              // fixed horizontal position
  y: 200,             // vertical position (changes each frame)
  vy: 0,              // vertical velocity (positive = downward)
  width: 48,
  height: 48,
  jumpTimer: 0,       // frames remaining to show jump.png
};
```

### Tower Object

Each tower pair is a plain object:

```js
{
  x: number,          // left edge of the tower pair
  gapY: number,       // top of the gap opening
  scored: boolean,    // true once this pair has awarded a point
}
```

Constants defined at the top of `game.js`:

```js
const TOWER_WIDTH  = 60;
const TOWER_SPEED  = 2;       // pixels per frame
const GAP_HEIGHT   = 150;     // vertical opening size
const SPAWN_INTERVAL = 90;    // frames between tower spawns
const GAP_MIN      = 60;      // minimum gapY (pixels from top)
const GAP_MAX      = CANVAS_HEIGHT - GAP_HEIGHT - 60; // maximum gapY
```

### Sprites

```js
const sprites = {
  fly:  new Image(),
  jump: new Image(),
  hit:  new Image(),
  dead: new Image(),
};
sprites.fly.src  = 'assets/wolf/fly.png';
sprites.jump.src = 'assets/wolf/jump.png';
sprites.hit.src  = 'assets/wolf/hit.png';
sprites.dead.src = 'assets/wolf/dead.png';
```

---

## Game Loop

The main loop uses `requestAnimationFrame`:

```js
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}
```

### `update()`

Runs only meaningful logic for the current state:

- **READY**: nothing (wolf is frozen at start position)
- **PLAYING**:
  1. Apply gravity: `wolf.vy += GRAVITY`
  2. Update position: `wolf.y += wolf.vy`
  3. Clamp top: `if (wolf.y < 0) { wolf.y = 0; wolf.vy = 0; }`
  4. Decrement `wolf.jumpTimer` if > 0
  5. Move towers: `tower.x -= TOWER_SPEED` for each active tower
  6. Spawn tower if frame counter mod SPAWN_INTERVAL == 0
  7. Remove towers where `tower.x + TOWER_WIDTH < 0`
  8. Collision detection (see below)
  9. Scoring check (see below)
- **GAME_OVER**: nothing (scene is frozen)

### `draw()`

Clears the canvas, then delegates to a per-state render function:

- `drawReady()` — wolf at start position + "Press Space or click" prompt
- `drawPlaying()` — background, towers, wolf, score
- `drawGameOver()` — last frame of scene + game over panel overlay

---

## Physics

### Constants

```js
const GRAVITY  = 0.4;   // pixels/frame² downward
const IMPULSE  = -7;    // pixels/frame upward (negative = up)
const JUMP_DURATION = 12; // frames to display jump.png after flap
```

### Per-frame velocity update

```
wolf.vy += GRAVITY        // accumulate gravity each frame
wolf.y  += wolf.vy        // integrate position
wolf.y   = max(0, wolf.y) // clamp to canvas top
```

### Impulse (flap)

```
wolf.vy = IMPULSE
wolf.jumpTimer = JUMP_DURATION
```

---

## Sprite Selection Logic

```
if (gameState == 'GAME_OVER'):
    sprite = sprites.dead
else if (wolf is colliding / just hit):
    sprite = sprites.hit
else if (wolf.jumpTimer > 0):
    sprite = sprites.jump
else:
    sprite = sprites.fly
```

A separate boolean `wolfHit` is set to `true` on collision and cleared on restart. `hit.png` is shown for the single frame the transition happens; `dead.png` takes over once `gameState` becomes `'GAME_OVER'`.

---

## Collision Detection

### Wolf Bounding Rectangle

```
wolfRect = { x: wolf.x, y: wolf.y, w: wolf.width, h: wolf.height }
```

### Tower Rectangles (per pair)

```
topRect    = { x: tower.x, y: 0,                    w: TOWER_WIDTH, h: tower.gapY }
bottomRect = { x: tower.x, y: tower.gapY + GAP_HEIGHT, w: TOWER_WIDTH, h: CANVAS_HEIGHT - (tower.gapY + GAP_HEIGHT) }
```

### AABB Test

```js
function rectsOverlap(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}
```

### Ground Collision

```
if (wolf.y + wolf.height >= CANVAS_HEIGHT) → GAME_OVER
```

---

## Scoring

```js
let score = 0;

// Inside update(), for each tower:
if (!tower.scored && wolf.x > tower.x + TOWER_WIDTH) {
  score++;
  tower.scored = true;
}
```

The `scored` flag ensures each tower pair awards exactly one point and never awards again on subsequent frames (idempotent increment).

---

## Input Handling

```js
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') handleInput();
});
canvas.addEventListener('click', handleInput);

function handleInput() {
  if (gameState === 'READY')     { startGame(); }
  else if (gameState === 'PLAYING')   { flap(); }
  else if (gameState === 'GAME_OVER') { resetGame(); }
}
```

---

## Reset / Restart

```js
function resetGame() {
  wolf.y  = CANVAS_HEIGHT / 2;
  wolf.vy = 0;
  wolf.jumpTimer = 0;
  towers.length = 0;
  score = 0;
  spawnTimer = 0;
  wolfHit = false;
  gameState = 'READY';
}
```

---

## Rendering Details

### Canvas Dimensions

```js
const CANVAS_WIDTH  = 480;
const CANVAS_HEIGHT = 640;
```

### Background

Plain sky-blue fill (`#87CEEB`) drawn as a full-canvas rectangle each frame.

### Towers

Pink (`#FF69B4`) filled rectangles — top tower from y=0 to y=`tower.gapY`, bottom tower from y=`tower.gapY + GAP_HEIGHT` to y=`CANVAS_HEIGHT`.

### Score (PLAYING)

`ctx.fillText(score, CANVAS_WIDTH / 2, 48)` — white text, large font, centered, with a dark stroke for legibility.

### Game Over Panel

Semi-transparent dark overlay rectangle centred on the canvas, containing:
- "GAME OVER" heading
- "Score: N" 
- "Press Space or click to restart"

### Wolf Sprite

`ctx.drawImage(currentSprite, wolf.x, wolf.y, wolf.width, wolf.height)`

---

## Error Handling

- Sprites that fail to load will silently produce a missing-image render. The game logic is unaffected since collision and physics use numeric coordinates, not sprite state.
- No networking or storage is used, so no async error handling is needed.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Collision always transitions to GAME_OVER

*For any* wolf position and any active tower configuration where the wolf's bounding rectangle overlaps a tower rectangle, or where the wolf's vertical position reaches the canvas bottom boundary, the game state SHALL become GAME_OVER.

**Validates: Requirements 1.4, 5.2, 5.3**

---

### Property 2: Gravity accumulates velocity every frame

*For any* number of consecutive frames N spent in the PLAYING state without an impulse applied, the wolf's vertical velocity SHALL equal its starting velocity plus N × GRAVITY.

**Validates: Requirements 2.1**

---

### Property 3: Position integrates velocity each frame

*For any* wolf velocity V and vertical position P, after exactly one physics update frame the wolf's vertical position SHALL equal P + V (before clamping).

**Validates: Requirements 2.3**

---

### Property 4: Wolf vertical position is always clamped to canvas bounds

*For any* upward impulse value applied to the wolf, after the physics update the wolf's y coordinate SHALL be greater than or equal to zero (the top canvas boundary).

**Validates: Requirements 2.5**

---

### Property 5: Jump sprite is shown immediately after impulse for its full duration

*For any* frame on which an impulse is applied, the wolf's active sprite SHALL be `jump.png` for the next JUMP_DURATION frames, and revert to `fly.png` once that timer expires.

**Validates: Requirements 3.2**

---

### Property 6: Tower spawning respects the fixed interval

*For any* number of frames F elapsed in the PLAYING state, the count of tower pairs spawned SHALL equal floor(F / SPAWN_INTERVAL).

**Validates: Requirements 4.1**

---

### Property 7: Towers move at constant speed each frame

*For any* tower pair at horizontal position X, after N frames of the PLAYING state the tower's x coordinate SHALL equal X − N × TOWER_SPEED.

**Validates: Requirements 4.2**

---

### Property 8: Gap is always within safe vertical bounds

*For any* spawned tower pair, the gap's vertical start position `gapY` SHALL satisfy GAP_MIN ≤ gapY ≤ GAP_MAX, ensuring the gap is fully visible and passable.

**Validates: Requirements 4.3**

---

### Property 9: Off-screen towers are removed

*For any* tower pair whose right edge (x + TOWER_WIDTH) is less than or equal to zero, that tower pair SHALL NOT appear in the active tower list on the subsequent frame.

**Validates: Requirements 4.5**

---

### Property 10: Each tower pair awards exactly one point (idempotent scoring)

*For any* tower pair that the wolf passes, the score SHALL increment by exactly one, and no further increments SHALL occur for that same pair on any subsequent frame.

**Validates: Requirements 6.2**

---

### Property 11: No physics or movement occurs in READY state

*For any* number of frames N spent in the READY state, the wolf's vertical velocity and position SHALL remain unchanged, and all tower positions SHALL remain unchanged.

**Validates: Requirements 7.3**
