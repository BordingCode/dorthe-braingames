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

test('wildlife is declarative: blooms attract pollinators; bees need a beehouse', () => {
  const s = G.newState(); s.resources = { sol: 9, vand: 99, froe: 9 };
  bloom(s, 0); bloom(s, 1); assert.ok(s.wildlifeSeen['🦋']);   // 2 blooms → butterfly
  bloom(s, 2); bloom(s, 3); assert.ok(s.wildlifeSeen['🐞']);   // 4 blooms → ladybug
  assert.ok(!s.wildlifeSeen['🐝']);                            // bee is NOT free from blooms anymore
  G.build(s, 'beehouse', 8); assert.ok(s.wildlifeSeen['🐝']);  // a beehouse brings the bee
});

test('harvest frees a bloomed tile', () => {
  const s = G.newState(); s.resources.vand += 5;
  assert.ok(bloom(s, 0).bloomed);
  assert.ok(G.FLOWERS.includes(G.harvest(s, 0)));
  assert.strictEqual(s.grid[0].type, 'soil');
  assert.strictEqual(s.picked, 1);
  assert.strictEqual(G.harvest(s, 0), null);
});

test('quests do NOT auto-chain: each one needs its own action', () => {
  const s = G.newState();
  assert.strictEqual(G.currentQuest(s).id, 'plant3');
  assert.deepStrictEqual(G.tryAdvance(s).completed, []);
  s.resources = { sol: 9, vand: 99, froe: 9 };
  bloom(s, 0); bloom(s, 1); bloom(s, 2);
  let adv = G.tryAdvance(s);
  assert.strictEqual(adv.completed.length, 1);            // ONLY plant3 — no free auto-completes
  assert.strictEqual(G.currentQuest(s).id, 'beehouse');   // next quest needs a real build
  G.build(s, 'beehouse', 3);                              // so do it
  adv = G.tryAdvance(s);
  assert.strictEqual(adv.completed[0].id, 'beehouse');
  assert.ok(s.questIndex >= 2 && s.chapter >= 2);
});

test('the world GROWS: crossing quest thresholds expands the grid, keeping tiles', () => {
  const s = G.newState();
  s.resources = { sol: 9, vand: 99, froe: 9 };
  G.plant(s, 0); s.resources.vand += 2; G.water(s, 0); G.water(s, 0); // bloom tile 0 (a marker)
  const flowerAt0 = s.grid[0].flower;
  assert.strictEqual(G.maybeGrow(s).grew, false);      // still stage 0 (bed)
  bloom(s, 1); bloom(s, 2);                             // 3 blooms
  G.tryAdvance(s);                                      // plant3 done → questIndex 1 (beehouse)
  assert.strictEqual(G.maybeGrow(s).grew, false);      // still bed — beehouse not built yet
  G.build(s, 'beehouse', 3); G.tryAdvance(s);           // beehouse done → questIndex 2 (feeder)
  const grew = G.maybeGrow(s);
  assert.ok(grew.grew && s.stage === 1);               // bed → garden at questIndex 2
  assert.strictEqual(s.cols, G.STAGES[1].cols);
  assert.strictEqual(s.grid.length, G.STAGES[1].cols * G.STAGES[1].rows);
  assert.strictEqual(s.grid[0].flower, flowerAt0);     // existing tile preserved (top-left anchored)
});

test('decor: place is cosmetic (costs resources, soil only, no wildlife)', () => {
  const s = G.newState(); s.resources = { sol: 9, vand: 9, froe: 9 };
  const before = Object.keys(s.wildlifeSeen).length;
  assert.ok(G.place(s, 'stone', 0).ok);
  assert.strictEqual(s.grid[0].type, 'stone');
  assert.strictEqual(Object.keys(s.wildlifeSeen).length, before); // decor never attracts wildlife
  assert.ok(!G.place(s, 'stone', 0).ok);                          // can't place on an occupied tile
  s.resources = { sol: 0, vand: 0, froe: 0 };
  assert.ok(!G.place(s, 'mushroom', 1).ok);                       // needs resources
});

test('move: relocate any non-soil tile onto an empty tile, preserving its state', () => {
  const s = G.newState(); s.resources = { sol: 9, vand: 9, froe: 9 };
  G.place(s, 'lantern', 0);
  assert.ok(G.move(s, 0, 5));
  assert.strictEqual(s.grid[5].type, 'lantern');
  assert.strictEqual(s.grid[0].type, 'soil');
  assert.ok(!G.move(s, 5, 5));   // can't move onto itself
  assert.ok(!G.move(s, 1, 6));   // source must not be soil
  G.place(s, 'stone', 1);
  assert.ok(!G.move(s, 5, 1));   // destination must be soil
});

test('remove: clears a tile back to soil; seen wildlife stays seen', () => {
  const s = G.newState(); s.resources = { sol: 9, vand: 9, froe: 9 };
  G.build(s, 'pond', 0);
  assert.ok(s.wildlifeSeen['🐸']);
  assert.ok(G.remove(s, 0));
  assert.strictEqual(s.grid[0].type, 'soil');
  assert.ok(s.wildlifeSeen['🐸']);     // collection is permanent
  assert.ok(!G.remove(s, 0));          // nothing to remove on soil
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
  assert.deepStrictEqual(G.load('{"v":3}'), G.newState());
  assert.deepStrictEqual(G.load('{"v":4}'), G.newState());
  assert.deepStrictEqual(G.load('{"v":5}'), G.newState()); // older saves are replaced cleanly
});

test('hygge: decorations and variety raise charm; levels climb', () => {
  const s = G.newState(); s.resources = { sol: 99, vand: 99, froe: 99 };
  const base = G.hyggeScore(s);
  G.place(s, 'stone', 0);
  const oneDecor = G.hyggeScore(s);
  assert.ok(oneDecor >= base + 3);                 // a decoration adds a meaningful chunk (placed*2 + distinct*2)
  G.place(s, 'mushroom', 1);
  assert.ok(G.hyggeScore(s) > oneDecor);           // a *different* decoration adds more (variety)
  assert.ok(G.hyggeLevel(0) === 0 && G.hyggeLevel(8) === 1 && G.hyggeLevel(50) === G.HYGGE_LEVELS.length - 1);
});

test('flowers are collected; rares still belong to FLOWERS; blooming records the kind', () => {
  G.RARE.forEach((r) => assert.ok(G.FLOWERS.includes(r)));     // rare flowers are valid blooms
  const s = G.newState(); s.resources = { sol: 9, vand: 99, froe: 9 };
  const r = bloom(s, 0);
  assert.ok(r.bloomed && G.FLOWERS.includes(r.flower));
  assert.ok(s.flowersSeen[r.flower]);                          // recorded in the almanac
  assert.strictEqual(typeof r.newFlower, 'boolean');
});

test('you can choose which flower to plant; mixed seeds stay random', () => {
  const s = G.newState(); s.resources = { sol: 9, vand: 99, froe: 9 };
  G.plant(s, 0, '🌹'); s.resources.vand += 2; G.water(s, 0); const r = G.water(s, 0);
  assert.strictEqual(r.flower, '🌹');           // a chosen flower blooms as chosen
  assert.ok(s.flowersSeen['🌹']);
  const s2 = G.newState(); s2.resources = { sol: 9, vand: 99, froe: 9 };
  G.plant(s2, 0); s2.resources.vand += 2; G.water(s2, 0); const r2 = G.water(s2, 0);
  assert.ok(G.FLOWERS.includes(r2.flower));      // mixed seed (no choice) → some valid flower
});

test('placing something records it in the build collection (once)', () => {
  const s = G.newState(); s.resources = { sol: 9, vand: 9, froe: 9 };
  const r = G.place(s, 'lantern', 0);
  assert.ok(r.ok && r.newBuild === true);
  assert.ok(s.builtSeen['lantern']);
  assert.strictEqual(G.place(s, 'lantern', 1).newBuild, false); // already discovered
});

test('timeOfDay: starts at dawn, advances and wraps; survives load', () => {
  const s = G.newState();
  assert.strictEqual(s.timeOfDay, 0);
  for (let k = 1; k <= G.TIMES.length; k++) G.advanceTime(s);
  assert.strictEqual(s.timeOfDay, 0);                 // wrapped full circle
  G.advanceTime(s); assert.strictEqual(s.timeOfDay, 1);
  assert.strictEqual(G.load(G.save(s)).timeOfDay, 1); // persisted
  const bad = G.load('{"v":4,"timeOfDay":99}');        // out-of-range clamps to 0 via fresh state
  assert.strictEqual(bad.timeOfDay, 0);
});

test('season is derived from how big the world has grown', () => {
  const s = G.newState();
  assert.strictEqual(G.currentSeason(s), 0);          // bed → spring
  s.stage = 3; assert.strictEqual(G.currentSeason(s), 3); // forest → winter
  s.stage = 4; assert.strictEqual(G.currentSeason(s), 0); // wild → renewal (spring)
});

test('new guests: a 2nd tree brings a squirrel; pond + many blooms brings a duck', () => {
  const s = G.newState(); s.resources = { sol: 99, vand: 999, froe: 99 };
  G.build(s, 'tree', 0);
  assert.ok(!s.wildlifeSeen['🐿️']);                   // one tree is not enough
  G.build(s, 'tree', 1);
  assert.ok(s.wildlifeSeen['🐿️']);                    // two trees → squirrel
  const s2 = G.newState(); s2.resources = { sol: 99, vand: 999, froe: 99 };
  G.build(s2, 'pond', 0);
  assert.ok(!s2.wildlifeSeen['🦆']);                   // pond alone is not enough
  for (let i = 1; i <= 6; i++) bloom(s2, i);            // 6 blooms + a pond
  assert.ok(s2.wildlifeSeen['🦆']);                    // → duck
});

test('the world reaches the wild 5th region near the finale', () => {
  assert.strictEqual(G.STAGES.length, 5);
  assert.strictEqual(G.stageForQuest(9), 4);           // last quest unlocks Vildmarken
  assert.ok(G.QUESTS[G.QUESTS.length - 1].finale);     // grand finale is the last quest
  assert.strictEqual(G.QUESTS.find((q) => q.id === 'thrive').finale, undefined); // thrive is now a milestone
});
