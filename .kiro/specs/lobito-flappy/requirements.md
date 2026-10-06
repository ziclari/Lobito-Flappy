# Requirements Document

## Introduction

Lobito Flappy is a single-page, browser-based game in the Flappy Bird style. The player controls a wolf character that must navigate through pairs of pink rectangular tower obstacles. The game is implemented with plain HTML, CSS, and vanilla JavaScript using an HTML Canvas element — no external libraries, frameworks, build tools, or backend services are used. All wolf artwork already exists inside `/assets/wolf/` and must not be modified.

## Glossary

- **Game**: The browser application running inside `index.html`.
- **Canvas**: The HTML `<canvas>` element on which all gameplay is rendered.
- **Wolf**: The player-controlled character rendered using PNG sprites from `/assets/wolf/`.
- **Sprite**: A single PNG image from `/assets/wolf/` used to represent the wolf's current animation state.
- **Tower Pair**: A pair of pink rectangles — one extending down from the top of the Canvas and one extending up from the bottom — with a randomized vertical gap between them.
- **Gap**: The vertical opening between the top tower and the bottom tower of a Tower Pair, through which the Wolf must pass.
- **Impulse**: An instantaneous upward velocity applied to the Wolf when the player presses Space or clicks the mouse.
- **Gravity**: A constant downward acceleration applied to the Wolf every frame while the Game is in the PLAYING state.
- **Score**: An integer counter that increments by one each time the Wolf fully passes a Tower Pair.
- **READY State**: The initial game state shown on page load and after a restart, before gameplay begins.
- **PLAYING State**: The active gameplay state during which physics, obstacle movement, and collision detection run.
- **GAME_OVER State**: The state entered when the Wolf collides with a Tower Pair or the ground.

---

## Requirements

### Requirement 1 — Game States

**User Story:** As a player, I want clearly defined game states, so that I always know whether the game is waiting to start, actively running, or showing my final score.

#### Acceptance Criteria

1. THE Game SHALL maintain exactly three states: READY, PLAYING, and GAME_OVER.
2. WHEN the Game first loads in a browser, THE Game SHALL display the READY state.
3. WHEN the player presses Space or clicks the Canvas while in the READY state, THE Game SHALL transition to the PLAYING state.
4. WHEN the Wolf collides with a Tower Pair or the ground while in the PLAYING state, THE Game SHALL transition to the GAME_OVER state.
5. WHEN the player presses Space or clicks the Canvas while in the GAME_OVER state, THE Game SHALL reset all game data and transition to the READY state.

---

### Requirement 2 — Wolf Physics

**User Story:** As a player, I want gravity and responsive controls, so that the game feels satisfying and skill-based.

#### Acceptance Criteria

1. WHILE the Game is in the PLAYING state, THE Game SHALL apply a constant downward acceleration to the Wolf every frame.
2. WHEN the player presses Space or clicks the Canvas while in the PLAYING state, THE Game SHALL apply a fixed upward Impulse to the Wolf's vertical velocity.
3. WHILE the Game is in the PLAYING state, THE Game SHALL update the Wolf's vertical position each frame based on the Wolf's current velocity.
4. IF the Wolf's vertical position reaches or exceeds the bottom boundary of the Canvas, THEN THE Game SHALL treat the event as a ground collision and transition to the GAME_OVER state.
5. THE Game SHALL clamp the Wolf's vertical position so that the Wolf cannot move above the top boundary of the Canvas.

---

### Requirement 3 — Wolf Sprite Animation

**User Story:** As a player, I want the wolf character to visually reflect its current state, so that the game feels expressive and readable.

#### Acceptance Criteria

1. WHILE the Game is in the PLAYING state and no Impulse has been applied in the current frame, THE Game SHALL render the Wolf using `assets/wolf/fly.png`.
2. WHEN an Impulse is applied to the Wolf, THE Game SHALL render the Wolf using `assets/wolf/jump.png` for a brief fixed duration after the Impulse.
3. WHEN the Wolf collides with a Tower Pair or the ground, THE Game SHALL render the Wolf using `assets/wolf/hit.png`.
4. WHILE the Game is in the GAME_OVER state, THE Game SHALL render the Wolf using `assets/wolf/dead.png`.
5. THE Game SHALL load all four Sprites (`fly.png`, `jump.png`, `hit.png`, `dead.png`) from `assets/wolf/` at startup without modifying the source files.

---

### Requirement 4 — Tower Obstacles

**User Story:** As a player, I want pairs of moving tower obstacles with randomized gaps, so that each run presents a different challenge.

#### Acceptance Criteria

1. WHILE the Game is in the PLAYING state, THE Game SHALL spawn Tower Pairs at a fixed horizontal interval off the right edge of the Canvas.
2. WHILE the Game is in the PLAYING state, THE Game SHALL move all active Tower Pairs from right to left at a constant speed each frame.
3. WHEN a Tower Pair is spawned, THE Game SHALL assign the Gap a randomized vertical position within safe bounds so the Gap is always fully passable.
4. THE Game SHALL render each Tower Pair as two pink filled rectangles — one descending from the top edge and one ascending from the bottom edge of the Canvas.
5. WHEN a Tower Pair moves entirely past the left edge of the Canvas, THE Game SHALL remove it from the active obstacle list.

---

### Requirement 5 — Collision Detection

**User Story:** As a player, I want accurate collision detection, so that near-misses are rewarded and actual hits are penalized.

#### Acceptance Criteria

1. WHILE the Game is in the PLAYING state, THE Game SHALL check for overlap between the Wolf's bounding rectangle and each active Tower Pair's top and bottom rectangles every frame.
2. WHEN the Wolf's bounding rectangle overlaps a Tower rectangle, THE Game SHALL transition to the GAME_OVER state.
3. IF the Wolf's vertical position reaches or exceeds the ground boundary of the Canvas, THEN THE Game SHALL transition to the GAME_OVER state.

---

### Requirement 6 — Scoring

**User Story:** As a player, I want to see my current score while playing and my final score after losing, so that I can track and try to improve my performance.

#### Acceptance Criteria

1. THE Game SHALL initialize the Score to zero at the start of each PLAYING session.
2. WHEN the Wolf's horizontal position passes the trailing edge of a Tower Pair's horizontal boundary for the first time, THE Game SHALL increment the Score by one.
3. WHILE the Game is in the PLAYING state, THE Game SHALL render the current Score as a numeral at the top-center of the Canvas.
4. WHILE the Game is in the GAME_OVER state, THE Game SHALL display the final Score on a Game Over panel rendered on the Canvas.
5. THE Game SHALL display a restart prompt ("Press Space or click to restart") on the Game Over panel.

---

### Requirement 7 — READY Screen

**User Story:** As a player, I want a clear start screen, so that I know the game is loaded and waiting for my input.

#### Acceptance Criteria

1. WHILE the Game is in the READY state, THE Game SHALL render a prompt on the Canvas instructing the player to press Space or click to begin.
2. WHILE the Game is in the READY state, THE Game SHALL render the Wolf in the initial starting position.
3. WHILE the Game is in the READY state, THE Game SHALL NOT move Tower Pairs or apply Gravity to the Wolf.

---

### Requirement 8 — File Architecture

**User Story:** As a developer, I want a flat, minimal file structure, so that the project is easy to understand and maintain without a build step.

#### Acceptance Criteria

1. THE Game SHALL be fully contained in exactly three files: `index.html`, `style.css`, and `game.js` at the root of the project.
2. THE Game SHALL run correctly by opening `index.html` directly in a modern browser without a build step or local server.
3. THE Game SHALL NOT import or depend on any external JavaScript libraries, CSS frameworks, or backend services.
4. THE Game SHALL NOT modify, replace, or generate any file inside `/assets/`.
