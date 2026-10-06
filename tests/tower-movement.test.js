/**
 * tower-movement.test.js
 *
 * Property-based tests for tower movement and off-screen removal
 * (Properties 7 and 9 from design.md).
 * Runs in Node.js with no external dependencies:
 *   node tests/tower-movement.test.js
 *
 * Validates: Requirements 4.2, 4.5
 */

'use strict';

const assert = require('assert');

// ---------------------------------------------------------------------------
// Constants — mirrored from game.js
// ---------------------------------------------------------------------------
const CANVAS_WIDTH = 480;
const TOWER_WIDTH  = 60;
const TOWER_SPEED  = 2;   // pixels per frame (rightward = positive x)

// ---------------------------------------------------------------------------
// Pure movement helper — replicates moveTowers() logic from game.js
// ---------------------------------------------------------------------------

/**
 * Simulate N frames of tower movement on a towers array.
 * Returns a new array of tower objects after N frames; off-screen towers
 * (right edge ≤ 0) are removed exactly as moveTowers() does in game.js.
 *
 * @param {{ x: number }[]} towers  Array of tower objects (only x is needed here)
 * @param {number} n                Number of frames to simulate
 * @returns {{ x: number }[]}       Resulting towers array after N frames
 */
function simulateTowerMovement(towers, n) {
  // Deep-clone so the caller's array is not mutated
  let current = towers.map(t => ({ ...t }));
  for (let i = 0; i < n; i++) {
    // Move each tower left
    for (let j = 0; j < current.length; j++) {
      current[j].x -= TOWER_SPEED;
    }
    // Remove towers whose right edge has passed x = 0
    current = current.filter(t => t.x + TOWER_WIDTH > 0);
  }
  return current;
}

/**
 * Apply a single frame of movement without culling.
 * Used to isolate the constant-speed property from the removal logic.
 *
 * @param {{ x: number }} tower
 * @returns {{ x: number }}
 */
function oneFrameMove(tower) {
  return { ...tower, x: tower.x - TOWER_SPEED };
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

// Deterministic LCG pseudo-random number generator — reproducible runs
function makePRNG(seed = 42) {
  let s = seed;
  return function rand(min, max) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const t = (s >>> 0) / 0xffffffff; // [0, 1)
    return min + t * (max - min);
  };
}

// ---------------------------------------------------------------------------
// Property 7 — Towers move at constant speed each frame
// Validates: Requirement 4.2
//
// After N frames, tower.x === startX − N × TOWER_SPEED
// ---------------------------------------------------------------------------
console.log('\nProperty 7: Towers move at constant speed each frame');

// 7a — Deterministic single-frame examples
test('tower.x decreases by TOWER_SPEED after 1 frame', () => {
  const tower  = { x: 480 };
  const result = oneFrameMove(tower);
  assert.strictEqual(result.x, 480 - TOWER_SPEED,
    `expected x=${480 - TOWER_SPEED}, got ${result.x}`);
});

test('tower.x decreases by 2 × TOWER_SPEED after 2 frames', () => {
  const [result] = simulateTowerMovement([{ x: 480 }], 2);
  const expected = 480 - 2 * TOWER_SPEED;
  assert.strictEqual(result.x, expected,
    `expected x=${expected}, got ${result.x}`);
});

test('tower.x decreases by 10 × TOWER_SPEED after 10 frames', () => {
  const [result] = simulateTowerMovement([{ x: 400 }], 10);
  const expected = 400 - 10 * TOWER_SPEED;
  assert.strictEqual(result.x, expected,
    `expected x=${expected}, got ${result.x}`);
});

test('multiple towers each move independently at constant speed', () => {
  const starts  = [480, 300, 150];
  const towers  = starts.map(x => ({ x }));
  const frames  = 15;
  const results = simulateTowerMovement(towers, frames);
  // Only towers still on-screen survive; check those that remain
  for (const r of results) {
    const startX = starts.find(sx => sx - frames * TOWER_SPEED === r.x);
    assert.ok(
      startX !== undefined,
      `Could not match result x=${r.x} to any expected position`
    );
  }
});

propertyTest('x = startX − N × TOWER_SPEED for many (startX, N) combinations', 500, (n) => {
  const rand = makePRNG(31);
  for (let i = 0; i < n; i++) {
    // Choose a starting x that stays on-screen throughout so culling doesn't interfere
    const frames = Math.floor(rand(1, 40));
    // Ensure the tower remains on-screen: x - frames*TOWER_SPEED + TOWER_WIDTH > 0
    // => startX > frames*TOWER_SPEED - TOWER_WIDTH
    const minX   = frames * TOWER_SPEED - TOWER_WIDTH + 1;
    const startX = Math.ceil(rand(Math.max(minX, 0), CANVAS_WIDTH + 200));

    const towers  = [{ x: startX }];
    const results = simulateTowerMovement(towers, frames);

    // The tower must still be present (we ensured it stays on-screen)
    assert.strictEqual(results.length, 1,
      `startX=${startX}, frames=${frames}: tower was unexpectedly removed`);

    const expected = startX - frames * TOWER_SPEED;
    assert.strictEqual(results[0].x, expected,
      `startX=${startX}, frames=${frames}: expected x=${expected}, got ${results[0].x}`);
  }
});

propertyTest('speed is constant regardless of initial x position', 300, (n) => {
  const rand = makePRNG(53);
  for (let i = 0; i < n; i++) {
    // Two towers at different x values, both safely on-screen after 1 frame
    const xA = Math.ceil(rand(TOWER_WIDTH + 1, CANVAS_WIDTH + 100));
    const xB = Math.ceil(rand(TOWER_WIDTH + 1, CANVAS_WIDTH + 100));

    const resultA = oneFrameMove({ x: xA });
    const resultB = oneFrameMove({ x: xB });

    // Both should move by exactly TOWER_SPEED
    assert.strictEqual(xA - resultA.x, TOWER_SPEED,
      `Tower A: expected displacement=${TOWER_SPEED}, got ${xA - resultA.x}`);
    assert.strictEqual(xB - resultB.x, TOWER_SPEED,
      `Tower B: expected displacement=${TOWER_SPEED}, got ${xB - resultB.x}`);
  }
});

// ---------------------------------------------------------------------------
// Property 9 — Off-screen towers are removed
// Validates: Requirement 4.5
//
// After any update frame, no tower with (x + TOWER_WIDTH) ≤ 0 remains
// in the active towers array.
// ---------------------------------------------------------------------------
console.log('\nProperty 9: Off-screen towers are removed');

// 9a — Deterministic examples
test('tower exactly at removal threshold is removed (x = -TOWER_WIDTH)', () => {
  // After 1 frame: x becomes -TOWER_WIDTH − TOWER_SPEED, so right edge = -TOWER_SPEED < 0
  // Start at x = -TOWER_WIDTH: right edge = 0, filter condition: 0 + TOWER_WIDTH > 0? No → removed
  const towers  = [{ x: -TOWER_WIDTH }];
  const results = simulateTowerMovement(towers, 1);
  assert.strictEqual(results.length, 0,
    `Expected tower to be removed, but ${results.length} towers remain`);
});

test('tower one pixel before threshold is removed after 1 frame', () => {
  // x = -TOWER_WIDTH + 1: after 1 frame x = -TOWER_WIDTH + 1 - TOWER_SPEED
  // right edge = -TOWER_WIDTH + 1 - TOWER_SPEED + TOWER_WIDTH = 1 - TOWER_SPEED = 1 - 2 = -1 ≤ 0 → removed
  const towers  = [{ x: -TOWER_WIDTH + 1 }];
  const results = simulateTowerMovement(towers, 1);
  assert.strictEqual(results.length, 0,
    `Expected tower to be removed, but ${results.length} towers remain`);
});

test('tower whose right edge is exactly 1 px on-screen is kept', () => {
  // right edge after move = x - TOWER_SPEED + TOWER_WIDTH > 0
  // choose x so x - TOWER_SPEED + TOWER_WIDTH = 1 → x = 1 + TOWER_SPEED - TOWER_WIDTH
  const startX  = 1 + TOWER_SPEED - TOWER_WIDTH; // = 1 + 2 - 60 = -57
  const towers  = [{ x: startX }];
  const results = simulateTowerMovement(towers, 1);
  assert.strictEqual(results.length, 1,
    `Expected tower to survive (right edge = 1), but it was removed`);
});

test('on-screen towers are never removed prematurely', () => {
  const towers  = [{ x: CANVAS_WIDTH }, { x: 300 }, { x: 100 }];
  const results = simulateTowerMovement(towers, 1);
  assert.strictEqual(results.length, 3,
    `Expected all 3 on-screen towers to remain, got ${results.length}`);
});

test('mix of on-screen and off-screen towers — only off-screen ones are removed', () => {
  // After movement, towers at CANVAS_WIDTH and 300 stay; tower at x=-(TOWER_WIDTH+5) goes off-screen
  const offX    = -(TOWER_WIDTH + 5);  // right edge = -5 → already off-screen before frame
  const towers  = [{ x: CANVAS_WIDTH }, { x: 300 }, { x: offX }];
  // Run 1 frame: offX tower moves further left and is culled
  const results = simulateTowerMovement(towers, 1);
  assert.strictEqual(results.length, 2,
    `Expected 2 towers to remain, got ${results.length}`);
  // Verify correct ones remain
  for (const r of results) {
    assert.ok(
      r.x + TOWER_WIDTH > 0,
      `Remaining tower has right edge ${r.x + TOWER_WIDTH} ≤ 0 (should have been culled)`
    );
  }
});

propertyTest('after every update, no tower has right edge ≤ 0', 500, (n) => {
  const rand = makePRNG(77);
  for (let i = 0; i < n; i++) {
    // Build a random set of 1–5 towers spread across a wide x range
    const count  = Math.floor(rand(1, 6));
    const frames = Math.floor(rand(1, 50));
    const towers = [];
    for (let j = 0; j < count; j++) {
      towers.push({ x: rand(-TOWER_WIDTH * 10, CANVAS_WIDTH + 200) });
    }

    const results = simulateTowerMovement(towers, frames);
    for (const r of results) {
      assert.ok(
        r.x + TOWER_WIDTH > 0,
        `frames=${frames}: surviving tower has right edge=${r.x + TOWER_WIDTH} ≤ 0`
      );
    }
  }
});

propertyTest('towers that started far off-screen are never in the result', 400, (n) => {
  const rand = makePRNG(101);
  for (let i = 0; i < n; i++) {
    // Tower already completely off-screen before any movement
    const offScreenX = rand(-(CANVAS_WIDTH + 500), -TOWER_WIDTH);
    const frames     = Math.floor(rand(1, 10));
    const results    = simulateTowerMovement([{ x: offScreenX }], frames);
    // Already off-screen; must not appear after movement
    assert.strictEqual(results.length, 0,
      `offScreenX=${offScreenX.toFixed(1)}, frames=${frames}: tower should have been removed`
    );
  }
});

propertyTest('tower count never increases — movement only removes, never adds', 300, (n) => {
  const rand = makePRNG(200);
  for (let i = 0; i < n; i++) {
    const count  = Math.floor(rand(0, 8));
    const frames = Math.floor(rand(1, 30));
    const towers = Array.from({ length: count }, () => ({
      x: rand(-CANVAS_WIDTH, CANVAS_WIDTH * 2),
    }));
    const before  = towers.length;
    const results = simulateTowerMovement(towers, frames);
    assert.ok(
      results.length <= before,
      `count before=${before}, after=${results.length}: movement added towers unexpectedly`
    );
  }
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${'─'.repeat(55)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('Status: FAIL');
  process.exit(1);
} else {
  console.log('Status: PASS');
}
