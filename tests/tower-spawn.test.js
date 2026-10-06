/**
 * tower-spawn.test.js
 *
 * Property-based tests for tower spawning (Properties 6 and 8 from design.md).
 * Runs in Node.js with no external dependencies:
 *   node tests/tower-spawn.test.js
 *
 * Validates: Requirements 4.1, 4.3
 */

'use strict';

const assert = require('assert');

// ---------------------------------------------------------------------------
// Constants — mirrored from game.js
// ---------------------------------------------------------------------------
const CANVAS_WIDTH    = 480;
const CANVAS_HEIGHT   = 640;
const TOWER_WIDTH     = 60;
const SPAWN_INTERVAL  = 90;   // frames between tower spawns
const GAP_HEIGHT      = 150;  // vertical opening size
const GAP_MIN         = 60;   // minimum gapY (pixels from top)
const GAP_MAX         = CANVAS_HEIGHT - GAP_HEIGHT - 60; // = 430

// ---------------------------------------------------------------------------
// Pure spawn logic — replicated inline from game.js (browser-free)
// ---------------------------------------------------------------------------

/**
 * Seeded pseudo-random number generator (LCG) — keeps runs reproducible.
 *
 * @param {number} seed
 * @returns {() => number} returns a float in [0, 1)
 */
function makePRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/**
 * Create a fresh simulation context.
 *
 * @param {() => number} randFn  A [0,1) PRNG used to pick gapY values.
 * @returns {{ towers: object[], spawnTimer: number, spawnTower: function, tick: function }}
 */
function createSimulation(randFn) {
  const towers = [];
  let spawnTimer = 0;

  function spawnTower() {
    // Mirrors game.js: Math.floor(Math.random() * (GAP_MAX - GAP_MIN + 1)) + GAP_MIN
    const gapY = Math.floor(randFn() * (GAP_MAX - GAP_MIN + 1)) + GAP_MIN;
    towers.push({ x: CANVAS_WIDTH, gapY, scored: false });
  }

  /**
   * Advance the simulation by one PLAYING frame (spawn logic only — no
   * movement or culling, so tower counts are unaffected by those operations).
   */
  function tick() {
    spawnTimer++;
    if (spawnTimer % SPAWN_INTERVAL === 0) {
      spawnTower();
    }
  }

  return { towers, get spawnTimer() { return spawnTimer; }, spawnTower, tick };
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

// ---------------------------------------------------------------------------
// Property 6 — Tower spawning respects the fixed interval
// Validates: Requirement 4.1
//
// After F frames in PLAYING state, tower count === floor(F / SPAWN_INTERVAL)
// ---------------------------------------------------------------------------
console.log('\nProperty 6: Tower spawning respects the fixed interval');

// 6a — Deterministic spot checks
test('0 towers spawned before first interval elapses (F = SPAWN_INTERVAL - 1)', () => {
  const sim = createSimulation(makePRNG(1));
  for (let f = 0; f < SPAWN_INTERVAL - 1; f++) sim.tick();
  assert.strictEqual(
    sim.towers.length, 0,
    `expected 0 towers after ${SPAWN_INTERVAL - 1} frames, got ${sim.towers.length}`
  );
});

test('exactly 1 tower spawned at F = SPAWN_INTERVAL', () => {
  const sim = createSimulation(makePRNG(2));
  for (let f = 0; f < SPAWN_INTERVAL; f++) sim.tick();
  assert.strictEqual(
    sim.towers.length, 1,
    `expected 1 tower after ${SPAWN_INTERVAL} frames, got ${sim.towers.length}`
  );
});

test('exactly 2 towers spawned at F = 2 × SPAWN_INTERVAL', () => {
  const sim = createSimulation(makePRNG(3));
  for (let f = 0; f < SPAWN_INTERVAL * 2; f++) sim.tick();
  assert.strictEqual(
    sim.towers.length, 2,
    `expected 2 towers after ${SPAWN_INTERVAL * 2} frames, got ${sim.towers.length}`
  );
});

test('exactly 5 towers spawned at F = 5 × SPAWN_INTERVAL', () => {
  const sim = createSimulation(makePRNG(4));
  for (let f = 0; f < SPAWN_INTERVAL * 5; f++) sim.tick();
  assert.strictEqual(
    sim.towers.length, 5,
    `expected 5 towers after ${SPAWN_INTERVAL * 5} frames, got ${sim.towers.length}`
  );
});

test('no extra tower spawned 1 frame after an interval boundary', () => {
  const sim = createSimulation(makePRNG(5));
  for (let f = 0; f < SPAWN_INTERVAL + 1; f++) sim.tick();
  assert.strictEqual(
    sim.towers.length, 1,
    `expected 1 tower at F=${SPAWN_INTERVAL + 1}, got ${sim.towers.length}`
  );
});

// 6b — Property test: count === floor(F / SPAWN_INTERVAL) for many F values
propertyTest(
  'tower count equals floor(F / SPAWN_INTERVAL) for many frame counts',
  300,
  (n) => {
    const rand = makePRNG(42);
    for (let i = 0; i < n; i++) {
      // Sample a random frame count in [1, 10 × SPAWN_INTERVAL]
      const raw = rand() * 10 * SPAWN_INTERVAL;
      const frames = Math.max(1, Math.floor(raw));

      const sim = createSimulation(makePRNG(i));
      for (let f = 0; f < frames; f++) sim.tick();

      const expected = Math.floor(frames / SPAWN_INTERVAL);
      assert.strictEqual(
        sim.towers.length,
        expected,
        `frames=${frames}: expected ${expected} towers, got ${sim.towers.length}`
      );
    }
  }
);

// 6c — Property test: count grows by exactly 1 at each SPAWN_INTERVAL boundary
propertyTest(
  'exactly one tower spawns at each SPAWN_INTERVAL frame boundary',
  10,
  (intervals) => {
    const sim = createSimulation(makePRNG(77));
    for (let k = 1; k <= intervals; k++) {
      // Advance to one frame before the boundary
      for (let f = 0; f < SPAWN_INTERVAL - 1; f++) sim.tick();
      const before = sim.towers.length;
      // Advance the single boundary frame
      sim.tick();
      const after = sim.towers.length;
      assert.strictEqual(
        after - before,
        1,
        `interval ${k}: expected exactly 1 new tower at boundary frame, got ${after - before}`
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Property 8 — Gap is always within safe vertical bounds
// Validates: Requirement 4.3
//
// For every spawned tower: GAP_MIN ≤ gapY ≤ GAP_MAX
// ---------------------------------------------------------------------------
console.log('\nProperty 8: Gap is always within safe vertical bounds');

// 8a — Sanity-check the constant values
test('GAP_MAX computed correctly from canvas constants', () => {
  const expected = CANVAS_HEIGHT - GAP_HEIGHT - 60;
  assert.strictEqual(GAP_MAX, expected, `GAP_MAX should be ${expected}, got ${GAP_MAX}`);
});

test('GAP_MIN < GAP_MAX (bounds are valid)', () => {
  assert.ok(GAP_MIN < GAP_MAX, `GAP_MIN (${GAP_MIN}) must be less than GAP_MAX (${GAP_MAX})`);
});

test('a gap at GAP_MIN fits fully on canvas', () => {
  assert.ok(
    GAP_MIN + GAP_HEIGHT <= CANVAS_HEIGHT,
    `gap at GAP_MIN=${GAP_MIN} with height ${GAP_HEIGHT} extends off canvas`
  );
});

test('a gap at GAP_MAX fits fully on canvas', () => {
  assert.ok(
    GAP_MAX + GAP_HEIGHT <= CANVAS_HEIGHT,
    `gap at GAP_MAX=${GAP_MAX} with height ${GAP_HEIGHT} extends off canvas`
  );
});

// 8b — Deterministic spot checks with known seeds
test('all towers from 500 frames have gapY within [GAP_MIN, GAP_MAX]', () => {
  const sim = createSimulation(makePRNG(123));
  for (let f = 0; f < 500; f++) sim.tick();
  for (const tower of sim.towers) {
    assert.ok(
      tower.gapY >= GAP_MIN,
      `tower.gapY=${tower.gapY} is below GAP_MIN=${GAP_MIN}`
    );
    assert.ok(
      tower.gapY <= GAP_MAX,
      `tower.gapY=${tower.gapY} exceeds GAP_MAX=${GAP_MAX}`
    );
  }
});

// 8c — Property test: gapY bounds hold for many independently seeded simulations
propertyTest(
  'gapY is within [GAP_MIN, GAP_MAX] for every spawned tower across many seeds',
  1000,
  (n) => {
    const outerRand = makePRNG(55);
    for (let i = 0; i < n; i++) {
      // Pick a fresh seed and a random run length (1–10 intervals worth of frames)
      const seed   = Math.floor(outerRand() * 0x100000000);
      const frames = Math.floor(outerRand() * 10 * SPAWN_INTERVAL) + 1;

      const sim = createSimulation(makePRNG(seed));
      for (let f = 0; f < frames; f++) sim.tick();

      for (const tower of sim.towers) {
        assert.ok(
          tower.gapY >= GAP_MIN,
          `seed=${seed}, frames=${frames}: gapY=${tower.gapY} < GAP_MIN=${GAP_MIN}`
        );
        assert.ok(
          tower.gapY <= GAP_MAX,
          `seed=${seed}, frames=${frames}: gapY=${tower.gapY} > GAP_MAX=${GAP_MAX}`
        );
      }
    }
  }
);

// 8d — Property test: the gap is fully visible (bottom edge stays on canvas)
propertyTest(
  'gap bottom edge (gapY + GAP_HEIGHT) never exceeds CANVAS_HEIGHT for any tower',
  500,
  (n) => {
    const outerRand = makePRNG(88);
    for (let i = 0; i < n; i++) {
      const seed   = Math.floor(outerRand() * 0x100000000);
      const frames = Math.floor(outerRand() * 5 * SPAWN_INTERVAL) + SPAWN_INTERVAL;

      const sim = createSimulation(makePRNG(seed));
      for (let f = 0; f < frames; f++) sim.tick();

      for (const tower of sim.towers) {
        assert.ok(
          tower.gapY + GAP_HEIGHT <= CANVAS_HEIGHT,
          `seed=${seed}: gap bottom at ${tower.gapY + GAP_HEIGHT} exceeds CANVAS_HEIGHT=${CANVAS_HEIGHT}`
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
