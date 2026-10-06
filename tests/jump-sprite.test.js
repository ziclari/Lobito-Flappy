/**
 * jump-sprite.test.js
 *
 * Property-based tests for jump sprite duration (Property 5 from design.md).
 * Runs in Node.js with no external dependencies:
 *   node tests/jump-sprite.test.js
 *
 * Validates: Requirements 3.2
 */

'use strict';

const assert = require('assert');

// ---------------------------------------------------------------------------
// Constants — mirrored from game.js
// ---------------------------------------------------------------------------
const JUMP_DURATION = 12;   // frames to display jump.png after flap
const IMPULSE       = -7;   // pixels/frame upward (negative = up)

// ---------------------------------------------------------------------------
// Symbolic sprite names — avoids any DOM/Image dependency
// ---------------------------------------------------------------------------
const sprites = {
  fly:  'fly',
  jump: 'jump',
  hit:  'hit',
  dead: 'dead',
};

// ---------------------------------------------------------------------------
// Sprite selection logic — inlined from game.js (getCurrentSprite)
//
// Precedence: dead → hit → jump → fly
// ---------------------------------------------------------------------------
function getCurrentSprite(gameState, wolfHit, jumpTimer) {
  if (gameState === 'GAME_OVER') return sprites.dead;
  if (wolfHit)                   return sprites.hit;
  if (jumpTimer > 0)             return sprites.jump;
  return sprites.fly;
}

// ---------------------------------------------------------------------------
// Flap simulation helper
//
// Simulates a flap (sets jumpTimer = JUMP_DURATION) then ticks N frames,
// returning the sprite name at each frame.
//
// @param {number} framesAfterFlap   How many frames to observe after the flap
// @returns {string[]}               Sprite name at each frame (index 0 = first frame after flap)
// ---------------------------------------------------------------------------
function simulateFlap(framesAfterFlap) {
  let jumpTimer = JUMP_DURATION; // impulse applied — timer set
  const sprites = [];

  for (let f = 0; f < framesAfterFlap; f++) {
    sprites.push(getCurrentSprite('PLAYING', false, jumpTimer));
    // Tick the timer (mirrors tickJumpTimer in game.js)
    if (jumpTimer > 0) jumpTimer--;
  }

  return sprites;
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

// Deterministic pseudo-random number generator (LCG)
function makePRNG(seed = 42) {
  let s = seed;
  return function rand(min, max) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const t = (s >>> 0) / 0xffffffff; // [0, 1)
    return min + t * (max - min);
  };
}

// ---------------------------------------------------------------------------
// Property 5 — Jump sprite is shown immediately after impulse for its full duration
// Validates: Requirement 3.2
//
// After a flap, getCurrentSprite() returns sprites.jump for exactly the next
// JUMP_DURATION frames, then reverts to sprites.fly.
// ---------------------------------------------------------------------------
console.log('\nProperty 5: Jump sprite is shown immediately after impulse for its full duration');

// 5a — Specific deterministic examples

test('frame 1 after flap returns jump sprite', () => {
  const result = simulateFlap(1);
  assert.strictEqual(result[0], 'jump', `expected 'jump' on frame 1, got '${result[0]}'`);
});

test('all JUMP_DURATION frames return jump sprite', () => {
  const result = simulateFlap(JUMP_DURATION);
  for (let f = 0; f < JUMP_DURATION; f++) {
    assert.strictEqual(
      result[f], 'jump',
      `expected 'jump' on frame ${f + 1}, got '${result[f]}'`
    );
  }
});

test('frame JUMP_DURATION + 1 reverts to fly sprite', () => {
  const result = simulateFlap(JUMP_DURATION + 1);
  assert.strictEqual(
    result[JUMP_DURATION], 'fly',
    `expected 'fly' on frame ${JUMP_DURATION + 1}, got '${result[JUMP_DURATION]}'`
  );
});

test('no frames beyond JUMP_DURATION return jump sprite (5 extra frames)', () => {
  const extra = 5;
  const result = simulateFlap(JUMP_DURATION + extra);
  for (let f = JUMP_DURATION; f < JUMP_DURATION + extra; f++) {
    assert.strictEqual(
      result[f], 'fly',
      `expected 'fly' on frame ${f + 1}, got '${result[f]}'`
    );
  }
});

test('exactly JUMP_DURATION = 12 jump frames, then fly', () => {
  const result = simulateFlap(JUMP_DURATION + 10);
  const jumpFrames = result.filter(s => s === 'jump').length;
  assert.strictEqual(
    jumpFrames, JUMP_DURATION,
    `expected exactly ${JUMP_DURATION} jump frames, got ${jumpFrames}`
  );
  // All frames after JUMP_DURATION should be fly
  for (let f = JUMP_DURATION; f < result.length; f++) {
    assert.strictEqual(result[f], 'fly', `frame ${f + 1} should be fly, got '${result[f]}'`);
  }
});

// 5b — Sprite precedence: dead takes priority over jump timer

test('dead state always returns dead sprite regardless of jumpTimer', () => {
  // Even with a non-zero jumpTimer, GAME_OVER wins
  for (let timer = 0; timer <= JUMP_DURATION; timer++) {
    const sprite = getCurrentSprite('GAME_OVER', false, timer);
    assert.strictEqual(sprite, 'dead', `jumpTimer=${timer}: expected 'dead', got '${sprite}'`);
  }
});

test('hit flag returns hit sprite even when jumpTimer is active', () => {
  for (let timer = 1; timer <= JUMP_DURATION; timer++) {
    const sprite = getCurrentSprite('PLAYING', true, timer);
    assert.strictEqual(sprite, 'hit', `jumpTimer=${timer}: expected 'hit', got '${sprite}'`);
  }
});

test('fly is returned when jumpTimer is 0 and not hit or dead', () => {
  const sprite = getCurrentSprite('PLAYING', false, 0);
  assert.strictEqual(sprite, 'fly', `expected 'fly' when jumpTimer=0, got '${sprite}'`);
});

// 5c — Property-based: jump covers exactly JUMP_DURATION frames after any flap

propertyTest(
  'jump sprite lasts exactly JUMP_DURATION frames after any flap (varied observation windows)',
  300,
  (n) => {
    const rand = makePRNG(31);
    for (let i = 0; i < n; i++) {
      // Observe between JUMP_DURATION+1 and JUMP_DURATION+20 frames
      const window = JUMP_DURATION + Math.floor(rand(1, 20));
      const result = simulateFlap(window);

      // All frames in [0, JUMP_DURATION) must be 'jump'
      for (let f = 0; f < JUMP_DURATION; f++) {
        assert.strictEqual(
          result[f], 'jump',
          `window=${window}, frame=${f + 1}: expected 'jump', got '${result[f]}'`
        );
      }

      // All frames in [JUMP_DURATION, window) must be 'fly'
      for (let f = JUMP_DURATION; f < window; f++) {
        assert.strictEqual(
          result[f], 'fly',
          `window=${window}, frame=${f + 1}: expected 'fly', got '${result[f]}'`
        );
      }
    }
  }
);

propertyTest(
  'consecutive flaps each reset the full JUMP_DURATION timer',
  200,
  (n) => {
    const rand = makePRNG(53);
    for (let i = 0; i < n; i++) {
      // Flap at a random point mid-stream, confirm timer restarts
      const firstFlap  = Math.floor(rand(1, 5));   // frames before second flap
      const totalFrames = firstFlap + JUMP_DURATION + 5;

      let jumpTimer = JUMP_DURATION; // first flap
      const sprites = [];

      for (let f = 0; f < totalFrames; f++) {
        // Second flap fires at firstFlap
        if (f === firstFlap) jumpTimer = JUMP_DURATION;

        sprites.push(getCurrentSprite('PLAYING', false, jumpTimer));
        if (jumpTimer > 0) jumpTimer--;
      }

      // After the second flap, the next JUMP_DURATION frames must all be 'jump'
      for (let f = firstFlap; f < firstFlap + JUMP_DURATION; f++) {
        assert.strictEqual(
          sprites[f], 'jump',
          `secondFlap@${firstFlap}, frame=${f + 1}: expected 'jump', got '${sprites[f]}'`
        );
      }

      // Frame immediately after should revert to fly
      const revertFrame = firstFlap + JUMP_DURATION;
      assert.strictEqual(
        sprites[revertFrame], 'fly',
        `secondFlap@${firstFlap}, frame=${revertFrame + 1}: expected 'fly', got '${sprites[revertFrame]}'`
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
