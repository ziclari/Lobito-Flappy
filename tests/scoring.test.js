/**
 * scoring.test.js
 *
 * Property-based tests for idempotent scoring (Property 10 from design.md).
 * Runs in Node.js with no external dependencies:
 *   node tests/scoring.test.js
 *
 * Validates: Requirements 6.2
 */

'use strict';

const assert = require('assert');

// ---------------------------------------------------------------------------
// Constants — mirrored from game.js
// ---------------------------------------------------------------------------
const TOWER_WIDTH = 60;

// ---------------------------------------------------------------------------
// Pure scoring logic — replicated inline (no browser required)
// ---------------------------------------------------------------------------

/**
 * Run one frame of the scoring update against a set of towers.
 * Mutates each tower's `scored` flag in-place, exactly as game.js does.
 *
 * @param {{ x: number, scored: boolean }[]} towers
 * @param {{ x: number }} wolf
 * @param {{ value: number }} scoreBox  Mutable wrapper so we can observe changes
 */
function updateScore(towers, wolf, scoreBox) {
  for (const tower of towers) {
    if (!tower.scored && wolf.x > tower.x + TOWER_WIDTH) {
      scoreBox.value++;
      tower.scored = true;
    }
  }
}

/**
 * Run N frames of the scoring update and return the final score.
 *
 * @param {{ x: number, scored: boolean }[]} towers  Starting state (mutated)
 * @param {{ x: number }} wolf
 * @param {number} frames
 * @returns {number}
 */
function runScoring(towers, wolf, frames) {
  const scoreBox = { value: 0 };
  for (let i = 0; i < frames; i++) {
    updateScore(towers, wolf, scoreBox);
  }
  return scoreBox.value;
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
// Property 10: Each tower pair awards exactly one point (idempotent scoring)
//
// Passing a tower pair increments score by exactly 1.
// No further increment occurs for that pair on subsequent frames.
//
// Validates: Requirements 6.2
// ---------------------------------------------------------------------------
console.log('\nProperty 10: Each tower pair awards exactly one point (idempotent scoring)');

// ---------------------------------------------------------------------------
// Unit tests — specific deterministic examples
// ---------------------------------------------------------------------------

test('score increments by 1 the first time wolf passes a tower', () => {
  // Wolf is clearly past the tower's trailing edge
  const towers = [{ x: 100, scored: false }];
  const wolf   = { x: 161 }; // 161 > 100 + 60 = 160
  const scoreBox = { value: 0 };
  updateScore(towers, wolf, scoreBox);
  assert.strictEqual(scoreBox.value, 1, `expected score=1, got ${scoreBox.value}`);
  assert.strictEqual(towers[0].scored, true, 'tower should be marked scored');
});

test('score does NOT increment again on subsequent frames for the same tower', () => {
  const towers = [{ x: 100, scored: false }];
  const wolf   = { x: 161 };
  // Run 10 frames — score must remain 1 after the first frame awards the point
  const total  = runScoring(towers, wolf, 10);
  assert.strictEqual(total, 1, `expected score=1 after 10 frames, got ${total}`);
});

test('score does NOT increment when wolf has not yet passed the tower', () => {
  // Wolf trailing edge is at 80 + wolf.width; here wolf.x is 100, tower trailing edge is 160
  const towers = [{ x: 110, scored: false }];
  const wolf   = { x: 160 }; // 160 > 110 + 60 = 170? No: 160 is NOT > 170
  const scoreBox = { value: 0 };
  updateScore(towers, wolf, scoreBox);
  assert.strictEqual(scoreBox.value, 0, `expected score=0 (wolf hasn't passed), got ${scoreBox.value}`);
});

test('wolf exactly at trailing edge (wolf.x === tower.x + TOWER_WIDTH) does NOT score', () => {
  // Condition is strictly greater-than: wolf.x > tower.x + TOWER_WIDTH
  const towers = [{ x: 100, scored: false }];
  const wolf   = { x: 160 }; // 160 == 100 + 60 — NOT strictly greater
  const scoreBox = { value: 0 };
  updateScore(towers, wolf, scoreBox);
  assert.strictEqual(scoreBox.value, 0, `expected score=0 at exact edge, got ${scoreBox.value}`);
});

test('two separate tower pairs each award exactly one point', () => {
  const towers = [
    { x: 50,  scored: false },
    { x: 200, scored: false },
  ];
  const wolf   = { x: 270 }; // past both towers (270 > 50+60=110 AND 270 > 200+60=260)
  const total  = runScoring(towers, wolf, 5);
  assert.strictEqual(total, 2, `expected score=2 for two towers, got ${total}`);
  assert.strictEqual(towers[0].scored, true,  'first tower should be scored');
  assert.strictEqual(towers[1].scored, true,  'second tower should be scored');
});

test('already-scored tower does not award another point when wolf passes it again', () => {
  const towers = [{ x: 100, scored: true }]; // pre-marked as already scored
  const wolf   = { x: 200 };
  const total  = runScoring(towers, wolf, 5);
  assert.strictEqual(total, 0, `expected score=0 for pre-scored tower, got ${total}`);
});

// ---------------------------------------------------------------------------
// Property tests — hold across many randomised inputs
// ---------------------------------------------------------------------------

propertyTest(
  'passing a tower exactly once awards exactly 1 point regardless of frames run',
  500,
  (n) => {
    const rand = makePRNG(31);
    for (let i = 0; i < n; i++) {
      const towerX  = Math.floor(rand(0, 400));
      const wolfX   = towerX + TOWER_WIDTH + Math.floor(rand(1, 100)); // wolf clearly past
      const frames  = Math.floor(rand(1, 60));
      const towers  = [{ x: towerX, scored: false }];
      const total   = runScoring(towers, { x: wolfX }, frames);
      assert.strictEqual(
        total, 1,
        `towerX=${towerX}, wolfX=${wolfX}, frames=${frames}: expected score=1, got ${total}`
      );
    }
  }
);

propertyTest(
  'score equals number of distinct towers wolf has passed (no duplicates)',
  500,
  (n) => {
    const rand = makePRNG(53);
    for (let i = 0; i < n; i++) {
      const towerCount = Math.floor(rand(1, 8));
      const wolfX = 600; // far right — past all towers whose x + TOWER_WIDTH < 600

      // Build towers at varied positions; some passed, some not
      const towers = [];
      let expectedScore = 0;
      for (let t = 0; t < towerCount; t++) {
        const x = Math.floor(rand(0, 700));
        const passed = wolfX > x + TOWER_WIDTH;
        towers.push({ x, scored: false });
        if (passed) expectedScore++;
      }

      const frames = Math.floor(rand(1, 30));
      const total  = runScoring(towers, { x: wolfX }, frames);
      assert.strictEqual(
        total, expectedScore,
        `towerCount=${towerCount}, wolfX=${wolfX}, frames=${frames}: expected score=${expectedScore}, got ${total}`
      );
    }
  }
);

propertyTest(
  'scored flag is set to true after award and never causes double-counting',
  500,
  (n) => {
    const rand = makePRNG(77);
    for (let i = 0; i < n; i++) {
      const towerX  = Math.floor(rand(0, 400));
      const wolfX   = towerX + TOWER_WIDTH + 1; // one pixel past trailing edge
      const tower   = { x: towerX, scored: false };
      const scoreBox = { value: 0 };

      // First frame: should score
      updateScore([tower], { x: wolfX }, scoreBox);
      assert.strictEqual(scoreBox.value, 1,    `first frame: expected 1, got ${scoreBox.value}`);
      assert.strictEqual(tower.scored, true,   'scored flag must be true after first award');

      // Subsequent 20 frames: score must not increase
      for (let f = 0; f < 20; f++) {
        updateScore([tower], { x: wolfX }, scoreBox);
      }
      assert.strictEqual(
        scoreBox.value, 1,
        `after 21 frames: expected score still 1, got ${scoreBox.value}`
      );
    }
  }
);

propertyTest(
  'towers not yet passed never contribute to score',
  500,
  (n) => {
    const rand = makePRNG(89);
    for (let i = 0; i < n; i++) {
      // Wolf is to the left of (or exactly at) the trailing edge
      const towerX = Math.floor(rand(100, 500));
      // wolfX <= towerX + TOWER_WIDTH  (not strictly past)
      const wolfX  = Math.floor(rand(0, towerX + TOWER_WIDTH + 1));
      const tower  = { x: towerX, scored: false };
      const scoreBox = { value: 0 };
      for (let f = 0; f < 30; f++) {
        updateScore([tower], { x: wolfX }, scoreBox);
      }
      const passed = wolfX > towerX + TOWER_WIDTH;
      if (!passed) {
        assert.strictEqual(
          scoreBox.value, 0,
          `wolfX=${wolfX}, towerX=${towerX}: expected score=0 (not passed), got ${scoreBox.value}`
        );
      }
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
