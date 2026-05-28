// Invariant tests for the garden-world logic. Run: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../js/garden-logic.js');

const seeded = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

// helper: bloom the flower at tile i (assumes enough vand or tops it up)
function bloom(s, i, rng) {
  G.plant(s, i);
  s.resources.vand += 2;
  G.water(s, i, rng);
  return G.water(s, i, rng);
}

test('newState: full grid of soil + starting resources', () => {
  const s = G.newState();
  assert.strictEqual(s.grid.length, G.TILES);
  assert.ok(s.grid.every((t) => t.type === 'soil'));
  assert.ok(s.resources.froe >= 1 && s.resources.vand >= 1);
  assert.strictEqual(s.questIndex, 0);
});

test('economy: canAfford / spend / earn never goes impossible', () => {
  const s = G.newState();
  assert.ok(G.canAfford(s, { froe: 1 }));
  assert.ok(!G.canAfford(s, { froe: 999 }));
  G.earn(s, { sol: 5 });
  assert.strictEqual(s.resources.sol, 6);
  G.spend(s, { sol: 4 });
  assert.strictEqual(s.resources.sol, 2);
});

test('plant costs a seed, only on soil; water grows then blooms', () => {
  const s = G.newState();
  const froe0 = s.resources.froe;
  assert.ok(G.plant(s, 0));
  assert.strictEqual(s.resources.froe, froe0 - 1);
  assert.strictEqual(s.grid[0].type, 'flower');
  assert.ok(!G.plant(s, 0));                       // not soil anymore
  s.resources.vand += 5;
  assert.strictEqual(G.water(s, 0).bloomed, false); // 1→2
  const r = G.water(s, 0);                          // 2→3 bloom
  assert.ok(r.bloomed && G.FLOWERS.includes(r.flower));
  assert.strictEqual(G.water(s, 0).ok, false);      // bloomed → done
});

test('plant blocked without seeds; water blocked without water', () => {
  const s = G.newState();
  s.resources.froe = 0;
  assert.ok(!G.plant(s, 0));
  s.resources.froe = 1; G.plant(s, 1);
  s.resources.vand = 0;
  assert.strictEqual(G.water(s, 1).ok, false);
});

test('build costs resources, only on soil, and attracts wildlife', () => {
  const s = G.newState();
  s.resources = { sol: 9, vand: 9, froe: 9 };
  const r = G.build(s, 'pond', 5);
  assert.ok(r.ok);
  assert.strictEqual(s.grid[5].type, 'pond');
  assert.ok(s.wildlifeSeen['🐸']);                 // pond → frog
  assert.ok(!G.build(s, 'pond', 5).ok);            // tile occupied
  s.resources = { sol: 0, vand: 0, froe: 0 };
  assert.ok(!G.build(s, 'tree', 6).ok);            // can't afford
});

test('wildlife is declarative: blooms attract pollinators', () => {
  const s = G.newState();
  s.resources = { sol: 9, vand: 99, froe: 9 };
  bloom(s, 0); assert.ok(s.wildlifeSeen['🦋'] || G.bloomCount(s) < 2);
  bloom(s, 1); assert.ok(s.wildlifeSeen['🦋']);    // ≥2 blooms → butterfly
  bloom(s, 2); assert.ok(s.wildlifeSeen['🐝']);    // ≥3 blooms → bee
});

test('harvest frees a bloomed tile so you can keep building', () => {
  const s = G.newState();
  s.resources.vand += 5;
  const r = bloom(s, 0);
  assert.ok(r.bloomed);
  const f = G.harvest(s, 0);
  assert.ok(G.FLOWERS.includes(f));
  assert.strictEqual(s.grid[0].type, 'soil');
  assert.strictEqual(s.picked, 1);
  assert.strictEqual(G.harvest(s, 0), null);       // empty now
});

test('quests: tryAdvance only advances when the goal is met, grants reward, raises chapter', () => {
  const s = G.newState();
  assert.strictEqual(G.currentQuest(s).id, 'plant3');
  assert.deepStrictEqual(G.tryAdvance(s).completed, []); // nothing yet
  s.resources = { sol: 9, vand: 99, froe: 9 };
  bloom(s, 0); bloom(s, 1); bloom(s, 2);            // 3 blooms → plant3 done, and bee (≥3) → 'bee' done too
  const adv = G.tryAdvance(s);
  assert.ok(adv.completed.length >= 2);             // plant3 + bee auto-complete
  assert.ok(s.questIndex >= 2);
  assert.ok(s.chapter >= 2);                         // rose with progress
});

test('difficultyParams scale up and never below base', () => {
  const a = G.difficultyParams(1), z = G.difficultyParams(8);
  assert.ok(z.seqLen >= a.seqLen && z.seqLen <= 6);
  assert.ok(z.oddTiles >= a.oddTiles);
  assert.ok(z.countMax > a.countMax);
});

test('save → load round-trips; corrupt / wrong-version load → fresh garden', () => {
  const s = G.newState();
  G.plant(s, 3); G.earn(s, { sol: 4 });
  assert.deepStrictEqual(G.load(G.save(s)), s);
  assert.deepStrictEqual(G.load('not json {{'), G.newState());
  assert.deepStrictEqual(G.load('{"v":1}'), G.newState()); // old version → fresh
});
