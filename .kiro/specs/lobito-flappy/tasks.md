# Implementation Plan: Lobito Flappy

## Overview

Implement the game as three flat files (`index.html`, `style.css`, `game.js`) with no build step. The implementation follows the design document directly: canvas setup → wolf physics → tower obstacles → collision + scoring → UI overlays → wiring everything together.

---

## Tasks

- [x] 1. Set up the HTML shell and CSS layout
  - [x] 1.1 Create `index.html` with a `<canvas id="gameCanvas">` element, link `style.css` in `<head>`, and add `<script src="game.js">` at the bottom of `<body>`
    - Canvas dimensions: 480 × 640
    - _Requirements: 8.1, 8.2_
  - [x] 1.2 Create `style.css` to center the canvas in the viewport with a neutral background and no page margins or scrollbars
    - _Requirements: 8.1_

- [x] 2. Bootstrap `game.js`: canvas context, constants, and sprite loading
  - [x] 2.1 Grab the canvas and 2D context; define all top-level constants (`CANVAS_WIDTH`, `CANVAS_HEIGHT`, `GRAVITY`, `IMPULSE`, `JUMP_DURATION`, `TOWER_WIDTH`, `TOWER_SPEED`, `GAP_HEIGHT`, `SPAWN_INTERVAL`, `GAP_MIN`, `GAP_MAX`)
    - _Requirements: 8.1, 2.1, 4.1_
  - [x] 2.2 Pre-load all four wolf sprites into `Image` objects (`sprites.fly`, `sprites.jump`, `sprites.hit`, `sprites.dead`) pointing to `assets/wolf/*.png`
    - _Requirements: 3.5_

- [x] 3. Implement wolf object, physics, and sprite selection
  - [x] 3.1 Define the `wolf` object (`x`, `y`, `vy`, `width`, `height`, `jumpTimer`) and the `wolfHit` flag; implement `applyGravity()` that adds `GRAVITY` to `wolf.vy` and integrates `wolf.y += wolf.vy`, clamping `wolf.y` to `[0, CANVAS_HEIGHT - wolf.height]`
    - _Requirements: 2.1, 2.3, 2.5_
  - [x]* 3.2 Write property test for gravity accumulation and position integration
    - **Property 2: Gravity accumulates velocity every frame** — after N frames without impulse, `wolf.vy` equals start velocity + N × GRAVITY
    - **Property 3: Position integrates velocity each frame** — after one frame, `wolf.y` equals previous y + previous vy (before clamping)
    - **Property 4: Wolf vertical position is always clamped** — `wolf.y` is never negative after any impulse
    - **Validates: Requirements 2.1, 2.3, 2.5**
  - [x] 3.3 Implement `flap()` that sets `wolf.vy = IMPULSE` and `wolf.jumpTimer = JUMP_DURATION`, and decrements `wolf.jumpTimer` in the per-frame update
    - _Requirements: 2.2_
  - [x] 3.4 Implement `getCurrentSprite()` returning the correct image based on `gameState`, `wolfHit`, and `wolf.jumpTimer` (dead → hit → jump → fly precedence)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x]* 3.5 Write property test for jump sprite duration
    - **Property 5: Jump sprite is shown immediately after impulse for its full duration** — `getCurrentSprite()` returns `sprites.jump` for each of the next JUMP_DURATION frames after a flap
    - **Validates: Requirements 3.2**

- [x] 4. Implement tower spawning, movement, and removal
  - [x] 4.1 Define the `towers` array; implement `spawnTower()` that pushes a new tower object with `x = CANVAS_WIDTH`, a random `gapY` in `[GAP_MIN, GAP_MAX]`, and `scored = false`; call it via a `spawnTimer` that triggers every `SPAWN_INTERVAL` frames
    - _Requirements: 4.1, 4.3_
  - [x]* 4.2 Write property test for tower spawning interval and gap bounds
    - **Property 6: Tower spawning respects the fixed interval** — after F frames, tower count equals floor(F / SPAWN_INTERVAL)
    - **Property 8: Gap is always within safe vertical bounds** — for every spawned tower, GAP_MIN ≤ gapY ≤ GAP_MAX
    - **Validates: Requirements 4.1, 4.3**
  - [x] 4.3 Implement per-frame tower movement (`tower.x -= TOWER_SPEED`) and removal of towers whose right edge has moved past x = 0
    - _Requirements: 4.2, 4.5_
  - [x]* 4.4 Write property test for tower constant-speed movement and off-screen removal
    - **Property 7: Towers move at constant speed each frame** — after N frames, tower.x equals start x − N × TOWER_SPEED
    - **Property 9: Off-screen towers are removed** — no tower with x + TOWER_WIDTH ≤ 0 remains in `towers` after the update
    - **Validates: Requirements 4.2, 4.5**

- [x] 5. Checkpoint — wire physics and towers into the game loop
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement collision detection and scoring
  - [x] 6.1 Implement `rectsOverlap(a, b)` AABB helper and `checkCollisions()` that tests the wolf rectangle against each tower's top and bottom rectangles; set `wolfHit = true` and transition to `GAME_OVER` on any hit; also check ground collision (`wolf.y + wolf.height >= CANVAS_HEIGHT`)
    - _Requirements: 5.1, 5.2, 5.3, 2.4_
  - [x]* 6.2 Write property test for collision → GAME_OVER transition
    - **Property 1: Collision always transitions to GAME_OVER** — whenever wolf rect overlaps a tower rect or reaches ground, gameState becomes 'GAME_OVER'
    - **Validates: Requirements 1.4, 5.2, 5.3**
  - [x] 6.3 Implement scoring inside the per-frame update: for each tower where `!tower.scored && wolf.x > tower.x + TOWER_WIDTH`, increment `score` and set `tower.scored = true`
    - _Requirements: 6.1, 6.2_
  - [x]* 6.4 Write property test for idempotent scoring
    - **Property 10: Each tower pair awards exactly one point** — passing a tower pair increments score by exactly 1 and no further increment occurs for that pair on subsequent frames
    - **Validates: Requirements 6.2**

- [x] 7. Implement rendering: background, towers, wolf, HUD
  - [x] 7.1 Implement `drawBackground()` filling the canvas with sky-blue (`#87CEEB`)
    - _Requirements: 8.1_
  - [x] 7.2 Implement `drawTowers()` rendering each tower pair as two pink (`#FF69B4`) filled rectangles (top: y=0 to gapY; bottom: gapY+GAP_HEIGHT to CANVAS_HEIGHT)
    - _Requirements: 4.4_
  - [x] 7.3 Implement `drawWolf()` using `ctx.drawImage(getCurrentSprite(), wolf.x, wolf.y, wolf.width, wolf.height)`
    - _Requirements: 3.1–3.4_
  - [x] 7.4 Implement `drawScore()` rendering the current score as white text with a dark stroke at top-center of the canvas, visible only during PLAYING state
    - _Requirements: 6.3_

- [x] 8. Implement state-specific UI overlays
  - [x] 8.1 Implement `drawReady()` rendering a centered prompt ("Press Space or click to begin") and the wolf at its starting position; no towers or physics active
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 8.2 Implement `drawGameOver()` rendering a semi-transparent dark overlay panel with "GAME OVER", "Score: N", and "Press Space or click to restart"
    - _Requirements: 6.4, 6.5_

- [x] 9. Implement state machine, input handling, and reset
  - [x] 9.1 Implement `handleInput()` that routes Space/click to `startGame()`, `flap()`, or `resetGame()` depending on `gameState`; wire `keydown` and `canvas click` listeners
    - _Requirements: 1.3, 1.5, 2.2_
  - [x] 9.2 Implement `resetGame()` that zeroes wolf position and velocity, clears `towers`, resets `score`, `spawnTimer`, and `wolfHit`, then sets `gameState = 'READY'`
    - _Requirements: 1.5_
  - [x]* 9.3 Write property test for READY state immutability
    - **Property 11: No physics or movement occurs in READY state** — after N frames in READY state, wolf.vy, wolf.y, and all tower positions are unchanged
    - **Validates: Requirements 7.3**

- [x] 10. Wire `update()`, `draw()`, and `requestAnimationFrame` loop
  - [x] 10.1 Implement `update()` branching on `gameState`: PLAYING runs gravity, jump timer, tower spawn/move, collision, and scoring; READY and GAME_OVER do nothing
    - _Requirements: 1.1, 7.3_
  - [x] 10.2 Implement `draw()` branching on `gameState`: calls background + towers + wolf + score for PLAYING, `drawReady()` for READY, background + towers + wolf + `drawGameOver()` for GAME_OVER
    - _Requirements: 1.1_
  - [x] 10.3 Start the `requestAnimationFrame` loop by calling `gameLoop()` once after all setup is complete
    - _Requirements: 8.2_

- [x] 11. Final checkpoint — full integration
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties defined in `design.md`
- Unit tests validate specific examples and edge cases
- The game runs by opening `index.html` directly in a browser — no server needed

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1", "4.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.2", "4.3"] },
    { "id": 4, "tasks": ["3.4", "4.4"] },
    { "id": 5, "tasks": ["3.5", "6.1", "7.1", "7.2", "7.3"] },
    { "id": 6, "tasks": ["6.2", "6.3", "7.4", "8.1", "8.2"] },
    { "id": 7, "tasks": ["6.4", "9.1", "9.2"] },
    { "id": 8, "tasks": ["9.3", "10.1", "10.2"] },
    { "id": 9, "tasks": ["10.3"] }
  ]
}
```
