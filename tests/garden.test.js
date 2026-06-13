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
  const sol0 = s.resources.sol;
  G.earn(s, { sol: 5 }); assert.strictEqual(s.resources.sol, sol0 + 5);
  G.spend(s, { sol: 4 }); assert.strictEqual(s.resources.sol, sol0 + 1);
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

test('harvest frees a bloomed tile (current {flower,reward} API)', () => {
  const s = G.newState(); s.resources.vand += 5;
  // tile 1 is NOT a flower target in the 3x3 blueprint (it's a feeder), so a flower there never
  // locks → harvesting is allowed (correct/locked tiles are protected; this one isn't).
  assert.strictEqual(G.blueprintTarget(s, 1), 'feeder');
  assert.ok(bloom(s, 1).bloomed);
  const h = G.harvest(s, 1);
  assert.ok(h && G.FLOWERS.includes(h.flower));
  assert.ok(h.reward && typeof h.reward.froe === 'number');
  assert.strictEqual(s.grid[1].type, 'soil');
  assert.strictEqual(s.picked, 1);
  assert.strictEqual(G.harvest(s, 1), null);
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

test('save → load round-trips; corrupt / old-version load → fresh blueprint', () => {
  const s = G.newState(); G.earn(s, { sol: 4 });
  assert.deepStrictEqual(G.load(G.save(s)), s);
  assert.deepStrictEqual(G.load('not json {{'), G.newState());
  assert.deepStrictEqual(G.load('{"v":2}'), G.newState());
  assert.deepStrictEqual(G.load('{"v":6}'), G.newState());
  assert.deepStrictEqual(G.load('{"v":7}'), G.newState()); // the pre-blueprint save is replaced cleanly
});

test('BLUEPRINT migration: any pre-v8 save starts a fresh blueprint, never crashes', () => {
  // a realistic v7 save (old free-build garden with quests/guests) → clean fresh start, no throw
  const old = { v: 7, stage: 1, cols: 5, rows: 4, chapter: 2, grid: Array.from({ length: 20 }, () => ({ type: 'soil', stage: 0, flower: null })),
    resources: { sol: 1, vand: 3, froe: 3 }, questIndex: 4, wildlifeSeen: { '🐸': true }, guests: { '🐸': { happy: 2 } }, wish: { guest: '🐸', base: 1 } };
  old.grid[4] = { type: 'pond', stage: 0, flower: null };
  let m; assert.doesNotThrow(() => { m = G.load(JSON.stringify(old)); });
  assert.deepStrictEqual(m, G.newState());     // fresh blueprint (3x3 bed, all soil)
  assert.strictEqual(m.stage, 0);
  assert.ok(m.grid.every((t) => t.type === 'soil'));
});

test('wishes: assigned only for seen guests, always a real forward ask, one at a time', () => {
  const s = G.newState(); s.resources = { sol: 99, vand: 999, froe: 99 };
  assert.strictEqual(G.assignWish(s, () => 0), null);   // no guests seen yet → no wish
  for (let i = 0; i <= 6; i++) bloom(s, i);             // blooms → butterfly + ladybug appear
  const g = G.assignWish(s, () => 0);                   // rng→0 picks the first seen guest deterministically
  assert.ok(g && G.WISHES[g]);
  assert.ok(s.wish && s.wish.guest === g);
  const p = G.wishProgress(s);
  assert.ok(p && p.done === false && p.have === 0 && p.need >= 1); // freshly assigned is never pre-satisfied
  assert.strictEqual(G.assignWish(s, () => 0), null);   // already one active → never a second
});

test('wishes: granting makes a guest happier, pays a modest bonus, then clears', () => {
  const s = G.newState(); s.resources = { sol: 99, vand: 999, froe: 99 };
  bloom(s, 0); bloom(s, 1);                              // butterfly (needs 1 new colour)
  // force a known wish: the ladybug wants 1 more bloom
  s.guests = { '🐞': { happy: 0 } }; s.wish = { guest: '🐞', base: G.bloomCount(s) };
  assert.strictEqual(G.grantWishIfDone(s), null);        // not done yet
  bloom(s, 2);                                           // one more bloom → wish met
  const before = s.resources.froe;
  const r = G.grantWishIfDone(s);
  assert.ok(r && r.guest === '🐞' && r.happy === 1);
  assert.ok(s.resources.froe > before);                  // a modest reward was paid
  assert.strictEqual(s.wish, null);                      // wish cleared
  assert.strictEqual(s.guests['🐞'].happy, 1);           // heart recorded
});

test('hygge: happy guests add a small, capped charm bonus', () => {
  const s = G.newState();
  const base = G.hyggeScore(s);
  s.guests = { '🦋': { happy: 3 }, '🐝': { happy: 1 }, '🐞': { happy: 0 } };
  assert.strictEqual(G.happyGuestCount(s), 2);           // only guests with ≥1 heart count
  assert.strictEqual(G.hyggeScore(s), base + 2);         // +1 per happy guest, not per heart (no runaway)
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

/* ===================== BLUEPRINT mode ===================== */

test('blueprint: target is deterministic and a valid category at every stage size', () => {
  for (let st = 0; st < G.STAGES.length; st++) {
    const s = G.newState(); G.growTo(s, st);
    for (let i = 0; i < s.grid.length; i++) {
      const a = G.blueprintTarget(s, i), b = G.blueprintTarget(s, i);
      assert.strictEqual(a, b);                          // deterministic
      assert.ok(G.BP_CATEGORIES.includes(a), 'category ' + a);
    }
  }
});

test('blueprint: a designed look — trees in the 4 corners, a pond at the centre, every stage', () => {
  for (let st = 0; st < G.STAGES.length; st++) {
    const s = G.newState(); G.growTo(s, st);
    const { cols, rows } = s, last = (s.grid.length - 1);
    assert.strictEqual(G.blueprintTarget(s, 0), 'tree');                       // top-left
    assert.strictEqual(G.blueprintTarget(s, cols - 1), 'tree');               // top-right
    assert.strictEqual(G.blueprintTarget(s, (rows - 1) * cols), 'tree');      // bottom-left
    assert.strictEqual(G.blueprintTarget(s, last), 'tree');                   // bottom-right
    if (st >= 1) {                                                            // bigger stages get a centre pond
      const cIdx = (Math.round((rows - 1) / 2)) * cols + Math.round((cols - 1) / 2);
      assert.strictEqual(G.blueprintTarget(s, cIdx), 'pond');                 // centre is a pond
    }
    assert.ok(s.grid.some((_, i) => G.blueprintTarget(s, i) === 'flower'));   // every stage has flowers
  }
});

test('blueprint: a tile is correct only when it matches its target (flower must be bloomed)', () => {
  const s = G.newState(); s.resources = { sol: 9, vand: 99, froe: 9 };
  // find a flower-target tile and a structure-target tile
  let fi = -1, si = -1, st = null;
  for (let i = 0; i < s.grid.length; i++) {
    const t = G.blueprintTarget(s, i);
    if (t === 'flower' && fi < 0) fi = i;
    if (t !== 'flower' && si < 0) { si = i; st = t; }
  }
  assert.ok(fi >= 0 && si >= 0);
  // flower target: only correct once fully bloomed
  G.plant(s, fi); assert.ok(!G.isTileCorrect(s, fi));
  s.resources.vand += 2; G.water(s, fi); assert.ok(!G.isTileCorrect(s, fi)); // still growing
  G.water(s, fi); assert.ok(G.isTileCorrect(s, fi));                          // bloomed → correct
  // structure target: correct once the RIGHT thing is placed; a wrong thing does NOT lock
  const wrong = st === 'tree' ? 'pond' : 'tree';
  G.place(s, wrong, si); assert.ok(!G.isTileCorrect(s, si));                  // wrong placement never locks
  G.remove(s, si); G.place(s, st, si); assert.ok(G.isTileCorrect(s, si));    // right thing → correct
});

test('blueprint: tryLock pays the bonus once per tile; progress/complete track the field', () => {
  const s = G.newState(); s.resources = { sol: 99, vand: 999, froe: 99 };
  const total = s.grid.length;
  assert.deepStrictEqual(G.blueprintProgress(s), { done: 0, total });
  assert.ok(!G.blueprintComplete(s));
  // solve tile 0 (a tree in the bed)
  assert.strictEqual(G.blueprintTarget(s, 0), 'tree');
  G.place(s, 'tree', 0);
  const before = s.resources.froe;
  const b = G.tryLock(s, 0);
  assert.ok(b && b.froe > 0);                       // bonus paid
  assert.ok(s.resources.froe > before);
  assert.strictEqual(G.tryLock(s, 0), null);        // no double bonus for the same locked tile
  assert.strictEqual(G.blueprintProgress(s).done, 1);
});

test('blueprint: locked correct tiles are NOT harvestable / removable / movable', () => {
  const s = G.newState(); s.resources = { sol: 99, vand: 999, froe: 99 };
  // a flower-target tile, bloomed → correct
  let fi = -1; for (let i = 0; i < s.grid.length; i++) if (G.blueprintTarget(s, i) === 'flower') { fi = i; break; }
  G.plant(s, fi); G.water(s, fi); G.water(s, fi);
  assert.ok(G.isTileCorrect(s, fi));
  assert.strictEqual(G.harvest(s, fi), null);       // can't harvest a correct flower away
  assert.ok(!G.remove(s, fi));                       // can't remove it
  // a structure correct tile: can't be moved off its spot
  G.place(s, 'tree', 0); assert.ok(G.isTileCorrect(s, 0));
  let soil = -1; for (let i = 0; i < s.grid.length; i++) if (s.grid[i].type === 'soil') { soil = i; break; }
  assert.ok(!G.move(s, 0, soil));                    // a correct tile stays put
});

test('blueprint: completing the field grows to the next, FRESH bigger stage', () => {
  const s = G.newState(); s.resources = { sol: 999, vand: 9999, froe: 999 };
  function solve(st) {
    for (let i = 0; i < st.grid.length; i++) {
      const tgt = G.blueprintTarget(st, i);
      if (tgt === 'flower') { G.plant(st, i); G.water(st, i); G.water(st, i, () => 0.5); }
      else G.place(st, tgt, i);
      G.tryLock(st, i);
    }
  }
  solve(s);
  assert.ok(G.blueprintComplete(s));
  const lu = G.blueprintLevelUp(s);
  assert.ok(lu.grew && !lu.last);
  assert.strictEqual(s.stage, 1);
  assert.strictEqual(s.cols, G.STAGES[1].cols);
  assert.strictEqual(s.grid.length, G.STAGES[1].cols * G.STAGES[1].rows);
  assert.ok(s.grid.every((t) => t.type === 'soil'));   // a fresh, bigger empty field
  assert.ok(!G.blueprintComplete(s));                  // the new stage isn't done yet
});

test('blueprint: completing the FINAL stage reports last (drømmehave), does not grow past', () => {
  const s = G.newState(); s.resources = { sol: 9999, vand: 99999, froe: 9999 };
  G.growTo(s, G.STAGES.length - 1);                     // jump to the last stage
  for (let i = 0; i < s.grid.length; i++) {
    const tgt = G.blueprintTarget(s, i);
    if (tgt === 'flower') { G.plant(s, i); G.water(s, i); G.water(s, i, () => 0.5); }
    else G.place(s, tgt, i);
  }
  assert.ok(G.blueprintComplete(s));
  const lu = G.blueprintLevelUp(s);
  assert.ok(lu.last && !lu.grew);
  assert.strictEqual(s.stage, G.STAGES.length - 1);    // stays on the final stage
});

test('blueprint: stage 0 is fully affordable from starting resources alone (no wall, no-fail)', () => {
  const s = G.newState();                              // starting resources only — no brain games
  for (let i = 0; i < s.grid.length; i++) {
    const tgt = G.blueprintTarget(s, i);
    if (tgt === 'flower') {
      assert.ok(G.plant(s, i), 'afford plant ' + i);
      assert.ok(G.water(s, i).ok && G.water(s, i, () => 0.5).bloomed, 'afford water ' + i);
    } else {
      const cost = G.BUILD_COST[tgt] || G.DECOR_COST[tgt];
      assert.ok(G.canAfford(s, cost), 'afford ' + tgt + ' at ' + i + ' res=' + JSON.stringify(s.resources));
      assert.ok(G.place(s, tgt, i).ok);
    }
    G.tryLock(s, i);                                    // lock bonuses keep the player solvent
  }
  assert.ok(G.blueprintComplete(s));
});

test('blueprint: firstUnsolved points at the next gap, -1 when complete', () => {
  const s = G.newState(); s.resources = { sol: 99, vand: 999, froe: 99 };
  assert.strictEqual(G.firstUnsolved(s), 0);           // nothing solved yet → first tile
  for (let i = 0; i < s.grid.length; i++) {
    const tgt = G.blueprintTarget(s, i);
    if (tgt === 'flower') { G.plant(s, i); G.water(s, i); G.water(s, i, () => 0.5); }
    else G.place(s, tgt, i);
  }
  assert.strictEqual(G.firstUnsolved(s), -1);          // all correct
});
