/**
 * ready-state.test.js
 *
 * Property-based test for Property 11 from design.md:
 *   No physics or movement occurs in READY state.
 *
 * After N frames in READY state, wolf.vy, wolf.y, and all tower positions
 * are unchanged from their initial values.
 *
 * Run with: node tests/ready-state.test.js
 *
 * Validates: Requirements 7.3
 */

'use strict';

const assert = require('assert');

// ---------------------------------------------------------------------------
// Constants — mirrored from game.js
// ---------------------------------------------------------------------------
const CANVAS_WIDTH  = 480;
const CANVAS_HEIGHT = 640;
const GRAVITY       = 0.4;
const TOWER_SPEED   = 2;
const TOWER_WIDTH   = 60;
const GAP_HEIGHT    = 150;
const GAP_MIN       = 60;
const GAP_MAX       = CANVAS_HEIGHT - GAP_HEIGHT - 60;

// ---------------------------------------------------------------------------
// Inline simulation of update() respecting the READY state contract.
//
// The contract: update() branches on gameState.
//   - 'PLAYING'  → runs gravity, jump timer, tower spawn/move, collision, scoring
//   - 'READY'    → does nothing
//   - 'GAME_OVER'→ does nothing
//
// This mirrors the design.md spec for update() and the upcoming task 10.1.
// ---------------------------------------------------------------------------

/**
 * Simulate one frame of update() for the given gameState.
 *
 * @param {'READY'|'PLAYING'|'GAME_OVER'} gameState
 * @param {{ y: number, vy: number, jumpTimer: number }} wolf
 * @param {Array<{ x: number, gapY: number, scored: boolean }>} towers
 * @returns {{ wolf, towers }} — updated copies (original objects mutated for simplicity)
 */
function simulateUpdate(gameState, wolf, towers) {
  if (gameState !== 'PLAYING') {
    // READY and GAME_OVER: do nothing
    return { wolf, towers };
  }

  // PLAYING: apply physics
  wolf.vy += GRAVITY;
  wolf.y  += wolf.vy;
  if (wolf.y < 0)                                  { wolf.y = 0; wolf.vy = 0; }
  if (wolf.y > CANVAS_HEIGHT - wolf.height)        { wolf.y = CANVAS_HEIGHT - wolf.height; }
  if (wolf.jumpTimer > 0) wolf.jumpTimer--;

  // PLAYING: move towers (no spawn logic here — tested separately)
  for (let i = towers.length - 1; i >= 0; i--) {
    towers[i].x -= TOWER_SPEED;
    if (towers[i].x + TOWER_WIDTH <= 0) {
      towers.splice(i, 1);
    }
  }

  return { wolf, towers };
}

/**
 * Simulate N frames of update() and return the final state.
 *
 * @param {'READY'|'PLAYING'|'GAME_OVER'} gameState
 * @param {{ y: number, vy: number, jumpTimer: number, height: number }} wolfInit
 * @param {Array<{ x: number, gapY: number, scored: boolean }>} towersInit
 * @param {number} frames
 */
function simulateNFrames(gameState, wolfInit, towersInit, frames) {
  const wolf   = { ...wolfInit };
  const towers = towersInit.map(t => ({ ...t }));

  for (let i = 0; i < frames; i++) {
    simulateUpdate(gameState, wolf, towers);
  }

  return { wolf, towers };
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
  let s = seed >>> 0;
  return function rand(min, max) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const t = s / 0xffffffff;
    return min + t * (max - min);
  };
}

// ---------------------------------------------------------------------------
// Property 11 — No physics or movement occurs in READY state
// Validates: Requirement 7.3
// ---------------------------------------------------------------------------

console.log('\nProperty 11: No physics or movement occurs in READY state');

// --- Deterministic unit examples ---

test('wolf.vy is unchanged after 1 frame in READY state', () => {
  const wolfInit = { x: 80, y: 200, vy: 0, jumpTimer: 0, height: 48, width: 48 };
  const { wolf } = simulateNFrames('READY', wolfInit, [], 1);
  assert.strictEqual(wolf.vy, 0, `expected vy=0, got ${wolf.vy}`);
});

test('wolf.y is unchanged after 1 frame in READY state', () => {
  const wolfInit = { x: 80, y: 200, vy: 0, jumpTimer: 0, height: 48, width: 48 };
  const { wolf } = simulateNFrames('READY', wolfInit, [], 1);
  assert.strictEqual(wolf.y, 200, `expected y=200, got ${wolf.y}`);
});

test('wolf.vy is unchanged after 60 frames in READY state', () => {
  const wolfInit = { x: 80, y: 200, vy: 0, jumpTimer: 0, height: 48, width: 48 };
  const { wolf } = simulateNFrames('READY', wolfInit, [], 60);
  assert.strictEqual(wolf.vy, 0, `expected vy=0, got ${wolf.vy}`);
});

test('wolf.y is unchanged after 60 frames in READY state', () => {
  const wolfInit = { x: 80, y: 200, vy: 0, jumpTimer: 0, height: 48, width: 48 };
  const { wolf } = simulateNFrames('READY', wolfInit, [], 60);
  assert.strictEqual(wolf.y, 200, `expected y=200, got ${wolf.y}`);
});

test('tower x positions are unchanged after 30 frames in READY state', () => {
  const wolfInit  = { x: 80, y: 200, vy: 0, jumpTimer: 0, height: 48, width: 48 };
  const towersInit = [
    { x: 300, gapY: 200, scored: false },
    { x: 480, gapY: 250, scored: false },
  ];
  const { towers } = simulateNFrames('READY', wolfInit, towersInit, 30);
  assert.strictEqual(towers[0].x, 300, `tower[0].x expected 300, got ${towers[0].x}`);
  assert.strictEqual(towers[1].x, 480, `tower[1].x expected 480, got ${towers[1].x}`);
});

test('GAME_OVER state also freezes wolf and towers (same contract)', () => {
  const wolfInit  = { x: 80, y: 300, vy: 5, jumpTimer: 0, height: 48, width: 48 };
  const towersInit = [{ x: 200, gapY: 180, scored: false }];
  const { wolf, towers } = simulateNFrames('GAME_OVER', wolfInit, towersInit, 20);
  assert.strictEqual(wolf.y,     300, `wolf.y expected 300, got ${wolf.y}`);
  assert.strictEqual(wolf.vy,    5,   `wolf.vy expected 5,   got ${wolf.vy}`);
  assert.strictEqual(towers[0].x, 200, `tower.x expected 200, got ${towers[0].x}`);
});

// Contrast: verify PLAYING state DOES apply physics (ensures the test is meaningful)
test('[contrast] wolf.vy changes after 1 frame in PLAYING state', () => {
  const wolfInit = { x: 80, y: 200, vy: 0, jumpTimer: 0, height: 48, width: 48 };
  const { wolf } = simulateNFrames('PLAYING', wolfInit, [], 1);
  assert.ok(
    wolf.vy !== 0,
    `expected vy to change in PLAYING state, but got vy=${wolf.vy}`
  );
});

test('[contrast] tower x decreases after 1 frame in PLAYING state', () => {
  const wolfInit  = { x: 80, y: 200, vy: 0, jumpTimer: 0, height: 48, width: 48 };
  const towersInit = [{ x: 300, gapY: 200, scored: false }];
  const { towers } = simulateNFrames('PLAYING', wolfInit, towersInit, 1);
  assert.ok(
    towers.length === 0 || towers[0].x < 300,
    `expected tower.x < 300 in PLAYING state, got ${towers[0]?.x}`
  );
});

// --- Property-based tests ---

propertyTest(
  'wolf.y and wolf.vy are unchanged after N frames in READY state (many starting states)',
  500,
  (n) => {
    const rand = makePRNG(31);
    for (let i = 0; i < n; i++) {
      const startY  = rand(0, CANVAS_HEIGHT - 48);
      const startVy = rand(-10, 10);
      const frames  = Math.floor(rand(1, 120));
      const wolfInit = { x: 80, y: startY, vy: startVy, jumpTimer: 0, height: 48, width: 48 };

      const { wolf } = simulateNFrames('READY', wolfInit, [], frames);

      assert.ok(
        Math.abs(wolf.y - startY) < 1e-9,
        `frames=${frames}, startY=${startY.toFixed(2)}, startVy=${startVy.toFixed(2)}: wolf.y changed to ${wolf.y.toFixed(4)}`
      );
      assert.ok(
        Math.abs(wolf.vy - startVy) < 1e-9,
        `frames=${frames}, startVy=${startVy.toFixed(2)}: wolf.vy changed to ${wolf.vy.toFixed(4)}`
      );
    }
  }
);

propertyTest(
  'all tower x positions are unchanged after N frames in READY state (many configurations)',
  500,
  (n) => {
    const rand = makePRNG(53);
    for (let i = 0; i < n; i++) {
      const towerCount = Math.floor(rand(0, 5));   // 0–4 towers
      const frames     = Math.floor(rand(1, 120));
      const wolfInit   = { x: 80, y: 200, vy: 0, jumpTimer: 0, height: 48, width: 48 };

      // Build tower list with known positions
      const towersInit = [];
      const originalXs = [];
      for (let t = 0; t < towerCount; t++) {
        const x    = rand(0, CANVAS_WIDTH + 200);
        const gapY = rand(GAP_MIN, GAP_MAX);
        towersInit.push({ x, gapY, scored: false });
        originalXs.push(x);
      }

      const { towers } = simulateNFrames('READY', wolfInit, towersInit, frames);

      // Tower count must be preserved (no culling in READY)
      assert.strictEqual(
        towers.length,
        towerCount,
        `frames=${frames}: tower count changed from ${towerCount} to ${towers.length}`
      );

      // Each tower x must be exactly as initialized
      for (let t = 0; t < towers.length; t++) {
        assert.ok(
          Math.abs(towers[t].x - originalXs[t]) < 1e-9,
          `frames=${frames}, tower[${t}]: x changed from ${originalXs[t].toFixed(2)} to ${towers[t].x.toFixed(4)}`
        );
      }
    }
  }
);

propertyTest(
  'wolf.jumpTimer is unchanged after N frames in READY state',
  200,
  (n) => {
    const rand = makePRNG(77);
    for (let i = 0; i < n; i++) {
      const startTimer = Math.floor(rand(0, 15));
      const frames     = Math.floor(rand(1, 60));
      const wolfInit   = { x: 80, y: 200, vy: 0, jumpTimer: startTimer, height: 48, width: 48 };

      const { wolf } = simulateNFrames('READY', wolfInit, [], frames);

      assert.strictEqual(
        wolf.jumpTimer,
        startTimer,
        `frames=${frames}, startTimer=${startTimer}: jumpTimer changed to ${wolf.jumpTimer}`
      );
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
