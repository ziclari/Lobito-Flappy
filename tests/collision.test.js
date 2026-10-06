/**
 * collision.test.js
 *
 * Property-based tests for collision detection (Property 1 from design.md).
 * Runs in Node.js with no external dependencies:
 *   node tests/collision.test.js
 *
 * Validates: Requirements 1.4, 5.2, 5.3
 */

'use strict';

const assert = require('assert');

// ---------------------------------------------------------------------------
// Constants — mirrored from game.js
// ---------------------------------------------------------------------------
const CANVAS_WIDTH  = 480;
const CANVAS_HEIGHT = 640;
const TOWER_WIDTH   = 60;
const GAP_HEIGHT    = 150;
const WOLF_WIDTH    = 48;
const WOLF_HEIGHT   = 48;
const GAP_MIN       = 60;
const GAP_MAX       = CANVAS_HEIGHT - GAP_HEIGHT - 60; // 430

// ---------------------------------------------------------------------------
// Pure collision helpers — extracted inline (no browser required)
// ---------------------------------------------------------------------------

/**
 * AABB overlap test, mirroring rectsOverlap() in game.js.
 */
function rectsOverlap(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

/**
 * Simulate checkCollisions() from game.js.
 *
 * @param {{ x:number, y:number, width:number, height:number }} wolf
 * @param {{ x:number, gapY:number }[]} towers
 * @returns {{ wolfHit: boolean, gameState: string }}
 */
function checkCollisions(wolf, towers) {
  let wolfHit   = false;
  let gameState = 'PLAYING';

  const wolfRect = { x: wolf.x, y: wolf.y, w: wolf.width, h: wolf.height };

  // Ground collision
  if (wolf.y + wolf.height >= CANVAS_HEIGHT) {
    wolfHit   = true;
    gameState = 'GAME_OVER';
    return { wolfHit, gameState };
  }

  // Tower collisions
  for (const tower of towers) {
    const topRect = {
      x: tower.x, y: 0,
      w: TOWER_WIDTH, h: tower.gapY,
    };
    const bottomRect = {
      x: tower.x, y: tower.gapY + GAP_HEIGHT,
      w: TOWER_WIDTH, h: CANVAS_HEIGHT - (tower.gapY + GAP_HEIGHT),
    };

    if (rectsOverlap(wolfRect, topRect) || rectsOverlap(wolfRect, bottomRect)) {
      wolfHit   = true;
      gameState = 'GAME_OVER';
      return { wolfHit, gameState };
    }
  }

  return { wolfHit, gameState };
}

// ---------------------------------------------------------------------------
// Minimal test runner
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
    failed++;
  }
}

function propertyTest(name, iterations, fn) {
  try {
    fn(iterations);
    console.log(`  PASS  ${name} (${iterations} iterations)`);
    passed++;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
    failed++;
  }
}

// Deterministic pseudo-random number generator (LCG) — reproducible runs.
function makePRNG(seed = 42) {
  let s = seed;
  return function rand(min, max) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const t = (s >>> 0) / 0xffffffff; // [0, 1)
    return min + t * (max - min);
  };
}

// ---------------------------------------------------------------------------
// Property 1 — Collision always transitions to GAME_OVER
// Validates: Requirements 1.4, 5.2, 5.3
// ---------------------------------------------------------------------------

// --- Helper: default wolf at a safe mid-canvas position ---
function makeWolf(overrides = {}) {
  return {
    x:      80,
    y:      200,
    width:  WOLF_WIDTH,
    height: WOLF_HEIGHT,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Section A: Ground collision (Requirement 5.3, 2.4)
// ---------------------------------------------------------------------------
console.log('\nProperty 1a: Ground collision → GAME_OVER');

test('wolf exactly at ground (y + height == CANVAS_HEIGHT) → GAME_OVER', () => {
  const wolf = makeWolf({ y: CANVAS_HEIGHT - WOLF_HEIGHT }); // touching floor
  const { gameState } = checkCollisions(wolf, []);
  assert.strictEqual(gameState, 'GAME_OVER',
    `expected GAME_OVER, got ${gameState}`);
});

test('wolf one pixel below ground (y + height > CANVAS_HEIGHT) → GAME_OVER', () => {
  const wolf = makeWolf({ y: CANVAS_HEIGHT - WOLF_HEIGHT + 1 });
  const { gameState } = checkCollisions(wolf, []);
  assert.strictEqual(gameState, 'GAME_OVER',
    `expected GAME_OVER, got ${gameState}`);
});

test('wolf one pixel above ground (y + height < CANVAS_HEIGHT) → PLAYING', () => {
  const wolf = makeWolf({ y: CANVAS_HEIGHT - WOLF_HEIGHT - 1 });
  const { gameState } = checkCollisions(wolf, []);
  assert.strictEqual(gameState, 'PLAYING',
    `expected PLAYING, got ${gameState}`);
});

propertyTest('any y where wolf.y + height >= CANVAS_HEIGHT → GAME_OVER', 500, (n) => {
  const rand = makePRNG(11);
  for (let i = 0; i < n; i++) {
    // y at or beyond floor
    const y = rand(CANVAS_HEIGHT - WOLF_HEIGHT, CANVAS_HEIGHT + 50);
    const wolf = makeWolf({ y });
    const { gameState } = checkCollisions(wolf, []);
    assert.strictEqual(gameState, 'GAME_OVER',
      `y=${y.toFixed(2)}: expected GAME_OVER, got ${gameState}`);
  }
});

// ---------------------------------------------------------------------------
// Section B: Top-tower collision (Requirement 5.2)
// ---------------------------------------------------------------------------
console.log('\nProperty 1b: Top-tower collision → GAME_OVER');

test('wolf fully inside top tower rect → GAME_OVER', () => {
  // Tower at x=200, gapY=200 → top tower fills y=0..200
  // Place wolf so it overlaps: x in [200,260), y in [0,200)
  const wolf = makeWolf({ x: 210, y: 50 });
  const tower = { x: 200, gapY: 200 };
  const { gameState } = checkCollisions(wolf, [tower]);
  assert.strictEqual(gameState, 'GAME_OVER',
    `expected GAME_OVER, got ${gameState}`);
});

test('wolf clipping the left edge of a top tower → GAME_OVER', () => {
  // Tower at x=200; wolf right edge (80+48=128) should NOT overlap (wolf at x=80 → right=128 < 200)
  // Place wolf so right edge just overlaps: wolf.x = 200 - 1 = 199 → right=247 > 200 ✓
  const wolf = makeWolf({ x: 199, y: 50 });
  const tower = { x: 200, gapY: 200 };
  const { gameState } = checkCollisions(wolf, [tower]);
  assert.strictEqual(gameState, 'GAME_OVER',
    `expected GAME_OVER, got ${gameState}`);
});

test('wolf just to the left of top tower (no overlap) → PLAYING', () => {
  // wolf right edge = wolf.x + WOLF_WIDTH; tower left = tower.x
  // No overlap when wolf.x + WOLF_WIDTH <= tower.x
  const wolf = makeWolf({ x: 200 - WOLF_WIDTH, y: 50 }); // right=200, tower.x=200 → not strictly less
  const tower = { x: 200, gapY: 200 };
  // rectsOverlap requires a.x + a.w > b.x, i.e. 200 > 200 → false → no overlap
  const { gameState } = checkCollisions(wolf, [tower]);
  assert.strictEqual(gameState, 'PLAYING',
    `expected PLAYING, got ${gameState}`);
});

test('wolf just to the right of top tower (no overlap) → PLAYING', () => {
  // wolf.x >= tower.x + TOWER_WIDTH → no horizontal overlap
  const wolf = makeWolf({ x: 200 + TOWER_WIDTH, y: 50 });
  const tower = { x: 200, gapY: 200 };
  const { gameState } = checkCollisions(wolf, [tower]);
  assert.strictEqual(gameState, 'PLAYING',
    `expected PLAYING, got ${gameState}`);
});

test('wolf in the gap (between top and bottom tower) → PLAYING', () => {
  // Tower at x=200, gapY=200, GAP_HEIGHT=150 → gap is y=200..350
  // Wolf centered vertically in the gap: y=220, height=48 → bottom=268 < 350 ✓
  const wolf = makeWolf({ x: 210, y: 220 });
  const tower = { x: 200, gapY: 200 };
  const { gameState } = checkCollisions(wolf, [tower]);
  assert.strictEqual(gameState, 'PLAYING',
    `expected PLAYING, got ${gameState}`);
});

// ---------------------------------------------------------------------------
// Section C: Bottom-tower collision (Requirement 5.2)
// ---------------------------------------------------------------------------
console.log('\nProperty 1c: Bottom-tower collision → GAME_OVER');

test('wolf fully inside bottom tower rect → GAME_OVER', () => {
  // Tower at x=200, gapY=200 → bottom tower fills y=350..640
  // Place wolf inside: y=400 (400+48=448 < 640, but y >= 350 ✓)
  const wolf = makeWolf({ x: 210, y: 400 });
  const tower = { x: 200, gapY: 200 };
  const { gameState } = checkCollisions(wolf, [tower]);
  assert.strictEqual(gameState, 'GAME_OVER',
    `expected GAME_OVER, got ${gameState}`);
});

test('wolf clipping the top edge of a bottom tower → GAME_OVER', () => {
  // bottom tower starts at gapY + GAP_HEIGHT = 200 + 150 = 350
  // wolf bottom edge must be > 350: wolf.y + height > 350 → wolf.y > 302
  // wolf.y = 303 → bottom = 351 > 350 ✓; and wolf.y < 350 so wolf is straddling the boundary
  const wolf = makeWolf({ x: 210, y: 303 });
  const tower = { x: 200, gapY: 200 };
  const { gameState } = checkCollisions(wolf, [tower]);
  assert.strictEqual(gameState, 'GAME_OVER',
    `expected GAME_OVER, got ${gameState}`);
});

test('wolf just above bottom tower (no vertical overlap) → PLAYING', () => {
  // bottom tower starts at y=350; wolf bottom = wolf.y + WOLF_HEIGHT <= 350
  // wolf.y = 302 → bottom = 350; rectsOverlap needs a.y < b.y + b.h (302 < 640 ✓)
  // and a.y + a.h > b.y → 350 > 350 → false → no overlap
  const wolf = makeWolf({ x: 210, y: 302 });
  const tower = { x: 200, gapY: 200 };
  const { gameState } = checkCollisions(wolf, [tower]);
  assert.strictEqual(gameState, 'PLAYING',
    `expected PLAYING, got ${gameState}`);
});

// ---------------------------------------------------------------------------
// Section D: wolfHit flag is set on collision
// ---------------------------------------------------------------------------
console.log('\nProperty 1d: wolfHit flag is set on any collision');

test('wolfHit is true after ground collision', () => {
  const wolf = makeWolf({ y: CANVAS_HEIGHT - WOLF_HEIGHT });
  const { wolfHit } = checkCollisions(wolf, []);
  assert.strictEqual(wolfHit, true, 'expected wolfHit=true on ground collision');
});

test('wolfHit is true after top-tower collision', () => {
  const wolf = makeWolf({ x: 210, y: 50 });
  const tower = { x: 200, gapY: 200 };
  const { wolfHit } = checkCollisions(wolf, [tower]);
  assert.strictEqual(wolfHit, true, 'expected wolfHit=true on top-tower collision');
});

test('wolfHit is true after bottom-tower collision', () => {
  const wolf = makeWolf({ x: 210, y: 400 });
  const tower = { x: 200, gapY: 200 };
  const { wolfHit } = checkCollisions(wolf, [tower]);
  assert.strictEqual(wolfHit, true, 'expected wolfHit=true on bottom-tower collision');
});

test('wolfHit is false when wolf is in the gap', () => {
  const wolf = makeWolf({ x: 210, y: 220 });
  const tower = { x: 200, gapY: 200 };
  const { wolfHit } = checkCollisions(wolf, [tower]);
  assert.strictEqual(wolfHit, false, 'expected wolfHit=false when no collision');
});

// ---------------------------------------------------------------------------
// Section E: Property-based — exhaustive random tower positions
// (Requirement 5.2)
// ---------------------------------------------------------------------------
console.log('\nProperty 1e: Randomly placed overlapping wolf → always GAME_OVER');

propertyTest(
  'wolf inside top tower → GAME_OVER for any valid tower position',
  800,
  (n) => {
    const rand = makePRNG(31);
    for (let i = 0; i < n; i++) {
      // Random valid gapY
      const gapY   = rand(GAP_MIN, GAP_MAX);
      // Tower at a random x within canvas
      const towerX = rand(0, CANVAS_WIDTH - TOWER_WIDTH);
      // Place wolf fully inside the top tower rectangle:
      //   horizontally: wolf.x in [towerX, towerX + TOWER_WIDTH - WOLF_WIDTH]
      //   vertically:   wolf.y in [0, gapY - WOLF_HEIGHT]  (top tower is y=0..gapY)
      const maxWolfX = towerX + TOWER_WIDTH - WOLF_WIDTH;
      const maxWolfY = gapY - WOLF_HEIGHT;
      if (maxWolfX < towerX || maxWolfY < 0) continue; // tower too narrow/small — skip

      const wolfX = rand(towerX, maxWolfX);
      const wolfY = rand(0, maxWolfY);
      const wolf  = makeWolf({ x: wolfX, y: wolfY });
      const tower = { x: towerX, gapY };
      const { gameState } = checkCollisions(wolf, [tower]);
      assert.strictEqual(gameState, 'GAME_OVER',
        `towerX=${towerX.toFixed(0)}, gapY=${gapY.toFixed(0)}, wolfX=${wolfX.toFixed(0)}, wolfY=${wolfY.toFixed(0)}: expected GAME_OVER, got ${gameState}`);
    }
  }
);

propertyTest(
  'wolf inside bottom tower → GAME_OVER for any valid tower position',
  800,
  (n) => {
    const rand = makePRNG(53);
    for (let i = 0; i < n; i++) {
      const gapY   = rand(GAP_MIN, GAP_MAX);
      const towerX = rand(0, CANVAS_WIDTH - TOWER_WIDTH);
      // Bottom tower: y = gapY + GAP_HEIGHT to CANVAS_HEIGHT
      const bottomTop = gapY + GAP_HEIGHT;
      const maxWolfX  = towerX + TOWER_WIDTH - WOLF_WIDTH;
      const maxWolfY  = CANVAS_HEIGHT - WOLF_HEIGHT - 1; // keep above ground clamp
      const minWolfY  = bottomTop; // wolf top must be at or below bottom tower start

      if (maxWolfX < towerX || minWolfY > maxWolfY) continue;

      const wolfX = rand(towerX, maxWolfX);
      const wolfY = rand(minWolfY, maxWolfY);
      const wolf  = makeWolf({ x: wolfX, y: wolfY });
      const tower = { x: towerX, gapY };
      const { gameState } = checkCollisions(wolf, [tower]);
      assert.strictEqual(gameState, 'GAME_OVER',
        `towerX=${towerX.toFixed(0)}, gapY=${gapY.toFixed(0)}, wolfX=${wolfX.toFixed(0)}, wolfY=${wolfY.toFixed(0)}: expected GAME_OVER, got ${gameState}`);
    }
  }
);

propertyTest(
  'wolf in the gap → always PLAYING for any valid tower position',
  800,
  (n) => {
    const rand = makePRNG(79);
    for (let i = 0; i < n; i++) {
      const gapY   = rand(GAP_MIN, GAP_MAX);
      const towerX = rand(0, CANVAS_WIDTH - TOWER_WIDTH);
      // Wolf must be horizontally overlapping the tower and vertically inside the gap
      // gap spans y = gapY to gapY + GAP_HEIGHT
      // wolf must fit entirely within the gap:
      //   wolf.y >= gapY  AND  wolf.y + WOLF_HEIGHT <= gapY + GAP_HEIGHT
      const minWolfY = gapY;
      const maxWolfY = gapY + GAP_HEIGHT - WOLF_HEIGHT;
      if (maxWolfY < minWolfY) continue; // gap too narrow for wolf — skip

      // Place wolf horizontally overlapping the tower
      const wolfX = rand(towerX, towerX + TOWER_WIDTH - 1);
      const wolfY = rand(minWolfY, maxWolfY);
      const wolf  = makeWolf({ x: wolfX, y: wolfY });
      const tower = { x: towerX, gapY };

      // Must not be on the ground either
      if (wolf.y + wolf.height >= CANVAS_HEIGHT) continue;

      const { gameState } = checkCollisions(wolf, [tower]);
      assert.strictEqual(gameState, 'PLAYING',
        `towerX=${towerX.toFixed(0)}, gapY=${gapY.toFixed(0)}, wolfX=${wolfX.toFixed(0)}, wolfY=${wolfY.toFixed(0)}: expected PLAYING, got ${gameState}`);
    }
  }
);

// ---------------------------------------------------------------------------
// Section F: Multiple towers — any single collision → GAME_OVER
// ---------------------------------------------------------------------------
console.log('\nProperty 1f: Multiple towers — single collision triggers GAME_OVER');

test('wolf passes first tower safely but hits second tower top → GAME_OVER', () => {
  // Tower 1 at x=100, gapY=200 — wolf flies through the gap
  // Tower 2 at x=300, gapY=300 — wolf hits the top tower (wolf.y=50 is inside y=0..300)
  const wolf   = makeWolf({ x: 310, y: 50 });
  const towers = [
    { x: 100, gapY: 200 },
    { x: 300, gapY: 300 },
  ];
  const { gameState } = checkCollisions(wolf, towers);
  assert.strictEqual(gameState, 'GAME_OVER',
    `expected GAME_OVER when wolf hits second tower, got ${gameState}`);
});

test('wolf clear of all towers and above ground → PLAYING', () => {
  // Wolf is to the left of all towers, well within canvas
  const wolf   = makeWolf({ x: 80, y: 200 });
  const towers = [
    { x: 250, gapY: 180 },
    { x: 400, gapY: 250 },
  ];
  const { gameState } = checkCollisions(wolf, towers);
  assert.strictEqual(gameState, 'PLAYING',
    `expected PLAYING when wolf is clear of all towers, got ${gameState}`);
});

propertyTest(
  'at least one overlapping tower always produces GAME_OVER',
  600,
  (n) => {
    const rand = makePRNG(61);
    for (let i = 0; i < n; i++) {
      // Random wolf position well above the ground
      const wolfX = rand(0, CANVAS_WIDTH - WOLF_WIDTH);
      const wolfY = rand(0, CANVAS_HEIGHT - WOLF_HEIGHT - 50); // keep clear of ground clamp

      // Build a tower that the wolf DEFINITELY overlaps on the top rect:
      //   horizontal overlap: tower.x < wolfX + WOLF_WIDTH AND tower.x + TOWER_WIDTH > wolfX
      //   vertical overlap for top rect: tower.gapY > wolfY (so top rect height > wolfY, i.e. gapY > wolfY+1)
      const towerX = wolfX - rand(0, TOWER_WIDTH - 1); // left edge of tower ≤ wolfX
      const gapY   = wolfY + WOLF_HEIGHT + rand(1, 20); // top tower reaches below wolf bottom

      // Clamp to valid range
      if (gapY < 0 || gapY > CANVAS_HEIGHT || towerX + TOWER_WIDTH <= wolfX) continue;

      const wolf  = makeWolf({ x: wolfX, y: wolfY });
      // Insert an extra safe tower before and one after to test multi-tower paths
      const towers = [
        { x: wolfX - 200, gapY: 200 }, // safe tower behind wolf
        { x: towerX, gapY },            // colliding tower
        { x: wolfX + 300, gapY: 200 }, // safe tower ahead
      ];

      const { gameState } = checkCollisions(wolf, towers);
      assert.strictEqual(gameState, 'GAME_OVER',
        `wolfX=${wolfX.toFixed(0)}, wolfY=${wolfY.toFixed(0)}, towerX=${towerX.toFixed(0)}, gapY=${gapY.toFixed(0)}: expected GAME_OVER, got ${gameState}`);
    }
  }
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('Status: FAIL');
  process.exit(1);
} else {
  console.log('Status: PASS');
}
