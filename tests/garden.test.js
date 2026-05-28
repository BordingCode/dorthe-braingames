// Invariant tests for the garden logic. Run: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../js/garden-logic.js');

const seeded = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

test('newState: 6 empty plots, no water', () => {
  const s = G.newState();
  assert.strictEqual(s.plots.length, 6);
  assert.ok(s.plots.every((p) => p.stage === 0 && p.flower === null));
  assert.strictEqual(s.water, 0);
});

test('plant only works on an empty plot', () => {
  const s = G.newState();
  assert.ok(G.plant(s, 0));
  assert.strictEqual(s.plots[0].stage, 1);
  assert.ok(!G.plant(s, 0)); // already planted
});

test('water needs water + a growing plot, and advances one stage', () => {
  const s = G.newState();
  G.plant(s, 0);
  assert.strictEqual(G.water(s, 0, Math.random).ok, false); // no water
  G.addWater(s, 5);
  assert.strictEqual(G.water(s, 0).ok, true);   // 1 → 2
  assert.strictEqual(s.plots[0].stage, 2);
  assert.strictEqual(G.water(s, 1).ok, false);  // plot 1 is empty (stage 0) — not waterable
});

test('blooming records a flower (stage 3), and is then un-waterable', () => {
  const s = G.newState();
  G.plant(s, 0);
  G.addWater(s, 10);
  G.water(s, 0); // →2
  const r = G.water(s, 0); // →3 bloom
  assert.ok(r.bloomed);
  assert.strictEqual(s.plots[0].stage, 3);
  assert.ok(G.FLOWERS.includes(r.flower));
  assert.ok(s.flowersSeen[r.flower]);
  assert.strictEqual(G.water(s, 0).ok, false); // bloomed → can't water more
});

test('progress + allBloomed', () => {
  const s = G.newState();
  const rng = seeded(7);
  s.plots.forEach((_, i) => { G.plant(s, i); G.addWater(s, 2); G.water(s, i, rng); G.water(s, i, rng); });
  assert.ok(G.allBloomed(s));
  const p = G.progress(s);
  assert.ok(p.flowers >= 1 && p.flowers <= p.flowersTotal);
});

test('save → load round-trips; corrupt/garbage load → fresh garden', () => {
  const s = G.newState();
  G.plant(s, 2); G.addWater(s, 3);
  assert.deepStrictEqual(G.load(G.save(s)), s);
  assert.deepStrictEqual(G.load('not json {{'), G.newState());
  assert.deepStrictEqual(G.load('{"v":999}'), G.newState()); // wrong version
});
