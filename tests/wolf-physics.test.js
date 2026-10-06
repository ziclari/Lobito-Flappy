/**
 * wolf-physics.test.js
 *
 * Property-based tests for wolf physics (Properties 2, 3, 4 from design.md).
 * Runs in Node.js with no external dependencies:
 *   node tests/wolf-physics.test.js
 *
 * Validates: Requirements 2.1, 2.3, 2.5
 */

'use strict';

const assert = require('assert');

// ---------------------------------------------------------------------------
// Constants — mirrored from game.js
// ---------------------------------------------------------------------------
const GRAVITY       = 0.4;   // pixels/frame² downward
const IMPULSE       = -7;    // pixels/frame upward (negative = up)
const JUMP_DURATION = 12;    // frames to display jump.png after flap
const CANVAS_HEIGHT = 640;
const WOLF_HEIGHT   = 48;

// ---------------------------------------------------------------------------
// Pure physics helpers — extracted inline (no browser required)
// ---------------------------------------------------------------------------

/**
 * Simulate N frames of gravity with no impulse applied.
 * Returns the wolf state after N frames.
 *
 * @param {{ y: number, vy: number }} wolf
 * @param {number} n  Number of frames to simulate
 * @returns {{ y: number, vy: number }}
 */
function simulateGravity(wolf, n) {
  let { y, vy } = wolf;
  for (let i = 0; i < n; i++) {
    vy += GRAVITY;
    y  += vy;
    // Top clamp
    if (y < 0) { y = 0; vy = 0; }
    // Bottom clamp
    if (y > CANVAS_HEIGHT - WOLF_HEIGHT) { y = CANVAS_HEIGHT - WOLF_HEIGHT; }
  }
  return { y, vy };
}

/**
 * Apply exactly one frame of physics (no clamping) and return the raw result.
 * Used to verify the integration formula before clamping kicks in.
 *
 * @param {{ y: number, vy: number }} wolf
 * @returns {{ y: number, vy: number }}
 */
function oneFrameRaw(wolf) {
  const vy = wolf.vy + GRAVITY;
  const y  = wolf.y + vy;
  return { y, vy };
}

/**
 * Apply an impulse then simulate N frames.
 * Returns the wolf state after all frames.
 *
 * @param {{ y: number, vy: number }} wolf
 * @param {number} n
 * @returns {{ y: number, vy: number }}
 */
function applyImpulseThenSimulate(wolf, n) {
  let { y, vy } = wolf;
  vy = IMPULSE; // flap
  for (let i = 0; i < n; i++) {
    vy += GRAVITY;
    y  += vy;
    if (y < 0) { y = 0; vy = 0; }
    if (y > CANVAS_HEIGHT - WOLF_HEIGHT) { y = CANVAS_HEIGHT - WOLF_HEIGHT; }
  }
  return { y, vy };
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

// Deterministic pseudo-random number generator (LCG) — avoids Math.random()
// so test runs are reproducible.
function makePRNG(seed = 42) {
  let s = seed;
  return function rand(min, max) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const t = (s >>> 0) / 0xffffffff; // [0, 1)
    return min + t * (max - min);
  };
}

// ---------------------------------------------------------------------------
// Property 2 — Gravity accumulates velocity every frame
// Validates: Requirement 2.1
//
// After N frames without impulse, wolf.vy === startVy + N × GRAVITY
// (tested only while the wolf is not clamped at the top boundary)
// ---------------------------------------------------------------------------
console.log('\nProperty 2: Gravity accumulates velocity every frame');

// 2a — Specific deterministic examples
test('vy increases by GRAVITY after 1 frame (start vy=0)', () => {
  const result = simulateGravity({ y: 300, vy: 0 }, 1);
  assert.strictEqual(result.vy, GRAVITY, `expected vy=${GRAVITY}, got ${result.vy}`);
});

test('vy increases by GRAVITY after 1 frame (start vy=-3)', () => {
  const result = simulateGravity({ y: 300, vy: -3 }, 1);
  const expected = -3 + GRAVITY;
  assert.strictEqual(result.vy, expected, `expected vy=${expected}, got ${result.vy}`);
});

test('vy equals startVy + 5 × GRAVITY after 5 frames (no clamp)', () => {
  const startVy = 0;
  const result = simulateGravity({ y: 300, vy: startVy }, 5);
  // After 5 frames: vy = 0.4+0.8+1.2+1.6+2.0 = ... but accumulation is additive per frame
  // Actual formula: vy_n = startVy + n * GRAVITY
  const expected = startVy + 5 * GRAVITY;
  assert.strictEqual(
    Math.round(result.vy * 1e9) / 1e9,
    Math.round(expected * 1e9) / 1e9,
    `expected vy=${expected}, got ${result.vy}`
  );
});

propertyTest('vy = startVy + N × GRAVITY for many (N, startVy) combinations', 500, (n) => {
  const rand = makePRNG(7);
  for (let i = 0; i < n; i++) {
    const frames  = Math.floor(rand(1, 20));     // 1–19 frames
    const startVy = rand(-10, 5);                // initial velocity range
    // Place wolf far enough from top that it won't clamp (y stays positive)
    // and far from bottom so it won't clamp there either.
    // Choose starting y so y + sum(vy after each step) stays in [1, CANVAS_HEIGHT - WOLF_HEIGHT - 1]
    const startY  = 300;

    // Manual simulation — check vy without clamping interference
    // To isolate the vy accumulation we need the wolf to stay unclamped.
    // Manually simulate and record vy only while unclamped.
    let y  = startY;
    let vy = startVy;
    let clamped = false;
    for (let f = 0; f < frames; f++) {
      vy += GRAVITY;
      y  += vy;
      if (y < 0 || y > CANVAS_HEIGHT - WOLF_HEIGHT) {
        clamped = true;
        break;
      }
    }

    if (!clamped) {
      const expected = startVy + frames * GRAVITY;
      assert.ok(
        Math.abs(vy - expected) < 1e-9,
        `frame=${frames}, startVy=${startVy.toFixed(4)}: expected vy=${expected.toFixed(6)}, got ${vy.toFixed(6)}`
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Property 3 — Position integrates velocity each frame
// Validates: Requirement 2.3
//
// After one frame (ignoring clamping), wolf.y === prevY + (prevVy + GRAVITY)
// i.e. y_new = y_old + vy_new   (velocity is updated first, then position)
// ---------------------------------------------------------------------------
console.log('\nProperty 3: Position integrates velocity each frame');

test('y += (vy + GRAVITY) after one frame — concrete example', () => {
  const wolf = { y: 200, vy: 0 };
  const result = oneFrameRaw(wolf);
  const expected = wolf.y + (wolf.vy + GRAVITY);
  assert.strictEqual(result.y, expected, `expected y=${expected}, got ${result.y}`);
});

test('y integration with negative velocity (moving upward)', () => {
  const wolf = { y: 300, vy: -5 };
  const result = oneFrameRaw(wolf);
  const expected = wolf.y + (wolf.vy + GRAVITY);
  assert.strictEqual(result.y, expected, `expected y=${expected}, got ${result.y}`);
});

test('y integration after impulse (IMPULSE + GRAVITY = first vy after flap)', () => {
  const wolf = { y: 300, vy: IMPULSE };
  const result = oneFrameRaw(wolf);
  const expectedVy = IMPULSE + GRAVITY;
  const expectedY  = wolf.y + expectedVy;
  assert.strictEqual(result.vy, expectedVy, `expected vy=${expectedVy}, got ${result.vy}`);
  assert.strictEqual(result.y, expectedY,   `expected y=${expectedY},  got ${result.y}`);
});

propertyTest('y = prevY + (prevVy + GRAVITY) for many starting states', 1000, (n) => {
  const rand = makePRNG(13);
  for (let i = 0; i < n; i++) {
    const y  = rand(10, CANVAS_HEIGHT - WOLF_HEIGHT - 10);
    const vy = rand(-8, 4);
    const result = oneFrameRaw({ y, vy });
    const expectedVy = vy + GRAVITY;
    const expectedY  = y + expectedVy;
    assert.ok(
      Math.abs(result.vy - expectedVy) < 1e-9,
      `vy: expected ${expectedVy.toFixed(6)}, got ${result.vy.toFixed(6)}`
    );
    assert.ok(
      Math.abs(result.y - expectedY) < 1e-9,
      `y: expected ${expectedY.toFixed(6)}, got ${result.y.toFixed(6)}`
    );
  }
});

// ---------------------------------------------------------------------------
// Property 4 — Wolf vertical position is always clamped to canvas bounds
// Validates: Requirement 2.5
//
// wolf.y is never negative after any impulse, regardless of starting position.
// ---------------------------------------------------------------------------
console.log('\nProperty 4: Wolf vertical position is always clamped to canvas bounds');

test('wolf.y never goes below 0 — wolf at top with impulse applied', () => {
  // Start near the top; an upward impulse should be absorbed by the clamp
  const result = applyImpulseThenSimulate({ y: 2, vy: 0 }, 1);
  assert.ok(result.y >= 0, `expected y >= 0, got ${result.y}`);
});

test('wolf.y never goes below 0 — wolf exactly at y=0', () => {
  const result = applyImpulseThenSimulate({ y: 0, vy: 0 }, 1);
  assert.ok(result.y >= 0, `expected y >= 0, got ${result.y}`);
});

test('wolf.y never exceeds CANVAS_HEIGHT - WOLF_HEIGHT', () => {
  // Start at the bottom; gravity should not push past canvas floor
  const result = simulateGravity({ y: CANVAS_HEIGHT - WOLF_HEIGHT - 1, vy: 10 }, 5);
  assert.ok(
    result.y <= CANVAS_HEIGHT - WOLF_HEIGHT,
    `expected y <= ${CANVAS_HEIGHT - WOLF_HEIGHT}, got ${result.y}`
  );
});

propertyTest('y >= 0 after impulse from any vertical starting position', 1000, (n) => {
  const rand = makePRNG(99);
  for (let i = 0; i < n; i++) {
    // Random starting y spread across entire canvas height
    const startY  = rand(0, CANVAS_HEIGHT - WOLF_HEIGHT);
    const startVy = rand(-3, 10);     // downward or slightly upward before impulse
    const frames  = Math.floor(rand(1, 30));
    const result  = applyImpulseThenSimulate({ y: startY, vy: startVy }, frames);
    assert.ok(
      result.y >= 0,
      `startY=${startY.toFixed(1)}, startVy=${startVy.toFixed(1)}, frames=${frames}: y=${result.y.toFixed(3)} went negative`
    );
    assert.ok(
      result.y <= CANVAS_HEIGHT - WOLF_HEIGHT,
      `startY=${startY.toFixed(1)}, frames=${frames}: y=${result.y.toFixed(3)} exceeded floor`
    );
  }
});

propertyTest('y >= 0 after many consecutive impulses (rapid flapping)', 200, (n) => {
  const rand = makePRNG(17);
  for (let i = 0; i < n; i++) {
    let y  = rand(0, CANVAS_HEIGHT - WOLF_HEIGHT);
    let vy = rand(-5, 5);
    const impulseEvery = Math.floor(rand(1, 5));
    for (let f = 0; f < 60; f++) {
      if (f % impulseEvery === 0) vy = IMPULSE; // flap every few frames
      vy += GRAVITY;
      y  += vy;
      if (y < 0)                            { y = 0;                            vy = 0; }
      if (y > CANVAS_HEIGHT - WOLF_HEIGHT)  { y = CANVAS_HEIGHT - WOLF_HEIGHT; }
      assert.ok(y >= 0, `frame=${f}: y=${y.toFixed(3)} went negative`);
    }
  }
});

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
