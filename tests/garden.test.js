// Invariant tests for the garden-world logic. Run: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../js/garden-logic.js');

function bloom(s, i, rng) { G.plant(s, i); s.resources.vand += 2; G.water(s, i, rng); return G.water(s, i, rng); }

test('newState: starts as the small bed (3x3) with starting resources', () => {
  const s = G.newState();
  assert.strictEqual(s.stage, 0);
  assert.strictEqual(s.cols, G.STAGES[0].cols);
  assert.strictEqual(s.grid.length, G.STAGES[0].cols * G.STAGES[0].rows);
  assert.ok(s.grid.every((t) => t.type === 'soil'));
  assert.ok(s.resources.froe >= 1 && s.resources.vand >= 1);
});

test('economy: canAfford / spend / earn', () => {
  const s = G.newState();
  assert.ok(G.canAfford(s, { froe: 1 }));
  assert.ok(!G.canAfford(s, { froe: 999 }));
  G.earn(s, { sol: 5 }); assert.strictEqual(s.resources.sol, 6);
  G.spend(s, { sol: 4 }); assert.strictEqual(s.resources.sol, 2);
});

test('plant costs a seed (soil only); water grows then blooms', () => {
  const s = G.newState();
  const f0 = s.resources.froe;
  assert.ok(G.plant(s, 0)); assert.strictEqual(s.resources.froe, f0 - 1);
  assert.ok(!G.plant(s, 0));
  s.resources.vand += 5;
  assert.strictEqual(G.water(s, 0).bloomed, false);
  const r = G.water(s, 0); assert.ok(r.bloomed && G.FLOWERS.includes(r.flower));
  assert.strictEqual(G.water(s, 0).ok, false);
});

test('plant blocked without seeds; water blocked without water', () => {
  const s = G.newState(); s.resources.froe = 0; assert.ok(!G.plant(s, 0));
  s.resources.froe = 1; G.plant(s, 1); s.resources.vand = 0; assert.strictEqual(G.water(s, 1).ok, false);
});

test('build costs resources (soil only) and attracts wildlife', () => {
  const s = G.newState(); s.resources = { sol: 9, vand: 9, froe: 9 };
  assert.ok(G.build(s, 'pond', 4).ok);
  assert.strictEqual(s.grid[4].type, 'pond');
  assert.ok(s.wildlifeSeen['🐸']);
  assert.ok(!G.build(s, 'pond', 4).ok);
  s.resources = { sol: 0, vand: 0, froe: 0 };
  assert.ok(!G.build(s, 'tree', 5).ok);
});

test('wildlife is declarative: blooms attract pollinators', () => {
  const s = G.newState(); s.resources = { sol: 9, vand: 99, froe: 9 };
  bloom(s, 0); bloom(s, 1); assert.ok(s.wildlifeSeen['🦋']);
  bloom(s, 2); assert.ok(s.wildlifeSeen['🐝']);
});

test('harvest frees a bloomed tile', () => {
  const s = G.newState(); s.resources.vand += 5;
  assert.ok(bloom(s, 0).bloomed);
  assert.ok(G.FLOWERS.includes(G.harvest(s, 0)));
  assert.strictEqual(s.grid[0].type, 'soil');
  assert.strictEqual(s.picked, 1);
  assert.strictEqual(G.harvest(s, 0), null);
});

test('quests: tryAdvance only when met; grants reward; raises chapter', () => {
  const s = G.newState();
  assert.strictEqual(G.currentQuest(s).id, 'plant3');
  assert.deepStrictEqual(G.tryAdvance(s).completed, []);
  s.resources = { sol: 9, vand: 99, froe: 9 };
  bloom(s, 0); bloom(s, 1); bloom(s, 2);
  const adv = G.tryAdvance(s);
  assert.ok(adv.completed.length >= 2 && s.questIndex >= 2 && s.chapter >= 2);
});

test('the world GROWS: crossing quest thresholds expands the grid, keeping tiles', () => {
  const s = G.newState();
  s.resources = { sol: 9, vand: 99, froe: 9 };
  G.plant(s, 0); s.resources.vand += 2; G.water(s, 0); G.water(s, 0); // bloom tile 0 (a marker)
  const flowerAt0 = s.grid[0].flower;
  assert.strictEqual(G.maybeGrow(s).grew, false);      // still stage 0 (bed)
  bloom(s, 1); bloom(s, 2);                             // 3 blooms
  G.tryAdvance(s);                                      // plant3 + bee → questIndex ≥ 2
  const grew = G.maybeGrow(s);
  assert.ok(grew.grew && s.stage === 1);               // bed → garden
  assert.strictEqual(s.cols, G.STAGES[1].cols);
  assert.strictEqual(s.grid.length, G.STAGES[1].cols * G.STAGES[1].rows);
  assert.strictEqual(s.grid[0].flower, flowerAt0);     // existing tile preserved (top-left anchored)
});

test('difficultyParams scale up, never below base', () => {
  const a = G.difficultyParams(1), z = G.difficultyParams(8);
  assert.ok(z.seqLen >= a.seqLen && z.seqLen <= 6 && z.oddTiles >= a.oddTiles && z.countMax > a.countMax);
});

test('save → load round-trips; corrupt / old-version load → fresh', () => {
  const s = G.newState(); G.plant(s, 2); G.earn(s, { sol: 4 });
  assert.deepStrictEqual(G.load(G.save(s)), s);
  assert.deepStrictEqual(G.load('not json {{'), G.newState());
  assert.deepStrictEqual(G.load('{"v":2}'), G.newState());
});
