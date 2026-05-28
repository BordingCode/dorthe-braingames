// Invariant tests for the sliding-puzzle logic. Run headless, no browser, no install:
//   node --test            (from the repo root)
// See ~/cc/gamedev-kb/patterns/testing-game-logic.md
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../js/slidepuzzle-logic.js');

const SIZES = [3, 4, 5];

test('solved board is solved + a permutation', () => {
  for (const n of SIZES) {
    const b = P.solved(n);
    assert.ok(P.isSolved(b), `solved(${n}) should report solved`);
    assert.ok(P.isPermutation(b, n));
    assert.ok(P.isSolvable(b, n));
    assert.strictEqual(b[b.length - 1], 0); // blank last
  }
});

test('legalMoves count: corner 2, edge 3, centre 4 (3×3)', () => {
  const n = 3;
  const blankAt = (i) => { const b = P.solved(n); const z = b.indexOf(0); b[z] = b[i]; b[i] = 0; return b; };
  assert.strictEqual(P.legalMoves(blankAt(0), n).length, 2); // corner
  assert.strictEqual(P.legalMoves(blankAt(1), n).length, 3); // top edge
  assert.strictEqual(P.legalMoves(blankAt(4), n).length, 4); // centre
});

test('applyMove is pure and rejects illegal moves', () => {
  const n = 3;
  const b = P.solved(n);              // blank at index 8 (corner)
  const before = b.slice();
  const illegal = P.applyMove(b, 0, n);
  assert.strictEqual(illegal, b);     // unchanged reference on illegal move
  const legalIdx = P.legalMoves(b, n)[0];
  const after = P.applyMove(b, legalIdx, n);
  assert.notStrictEqual(after, b);    // new array
  assert.deepStrictEqual(b, before);  // original untouched (pure)
  assert.ok(P.isPermutation(after, n));
  assert.strictEqual(after[legalIdx], 0); // blank moved to where the tile was
});

test('isSolvable rejects a deliberately broken board (single swap)', () => {
  for (const n of SIZES) {
    const broken = P.solved(n);
    [broken[0], broken[1]] = [broken[1], broken[0]]; // swap two tiles → unsolvable
    assert.ok(!P.isSolvable(broken, n), `single-swap board should be unsolvable for n=${n}`);
  }
});

test('scramble ALWAYS yields a solvable, non-trivial permutation (200 runs × each size)', () => {
  for (const n of SIZES) {
    for (let i = 0; i < 200; i++) {
      const b = P.scramble(n);
      assert.ok(P.isPermutation(b, n), `scramble(${n}) not a permutation`);
      assert.ok(P.isSolvable(b, n), `scramble(${n}) produced an UNSOLVABLE board`);
      assert.ok(!P.isSolved(b), `scramble(${n}) handed back a solved board`);
    }
  }
});

test('scramble is reproducible with a seeded rng', () => {
  // tiny seeded LCG so the same seed → same board (determinism for daily puzzles / repro)
  const lcg = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const a = P.scramble(4, 500, lcg(12345));
  const b = P.scramble(4, 500, lcg(12345));
  assert.deepStrictEqual(a, b);
});
