/* ===== Dorthes have — pure garden logic =====
 * Dual-mode (browser global + Node require for `node --test`). No DOM. rng injectable.
 * Growth model: each plot has stage 0=tom, 1=frø, 2=spire, 3=blomst. Tasks earn water;
 * watering advances a plot one stage; blooming records a flower (+ sometimes a critter).
 * Persistence is versioned and load() falls back to a fresh garden on any corruption
 * (see gamedev-kb/patterns/resilience-and-errors.md).
 */
(function (root) {
  'use strict';

  const FLOWERS = ['🌷', '🌻', '🌹', '🌼', '🌸', '🪻'];
  const CRITTERS = ['🦋', '🐝', '🐞', '🐦'];
  const PLOTS = 6;
  const VERSION = 1;
  const WATER_PER_TASK = 3;
  const CRITTER_CHANCE = 0.5;

  function pick(arr, rng) { return arr[Math.floor((rng || Math.random)() * arr.length)]; }

  function newState() {
    const plots = [];
    for (let i = 0; i < PLOTS; i++) plots.push({ stage: 0, flower: null });
    return { v: VERSION, plots, water: 0, flowersSeen: {}, crittersSeen: {}, bloomedTotal: 0 };
  }

  function plant(s, i) {
    const p = s.plots[i];
    if (!p || p.stage !== 0) return false;
    p.stage = 1;
    return true;
  }

  // Water plot i: costs 1 water, advances one stage. Blooming (stage→3) records a flower
  // and maybe a critter. Returns what happened so the UI can celebrate.
  function water(s, i, rng) {
    const p = s.plots[i];
    if (!p || s.water <= 0 || p.stage < 1 || p.stage >= 3) return { ok: false };
    s.water--;
    p.stage++;
    if (p.stage === 3) {
      p.flower = pick(FLOWERS, rng);
      s.flowersSeen[p.flower] = true;
      s.bloomedTotal++;
      let critter = null;
      if ((rng || Math.random)() < CRITTER_CHANCE) {
        critter = pick(CRITTERS, rng);
        s.crittersSeen[critter] = true;
      }
      return { ok: true, bloomed: true, flower: p.flower, critter };
    }
    return { ok: true, bloomed: false };
  }

  function addWater(s, n) { s.water += n; return s.water; }

  function progress(s) {
    return {
      flowers: Object.keys(s.flowersSeen).length, flowersTotal: FLOWERS.length,
      critters: Object.keys(s.crittersSeen).length, crittersTotal: CRITTERS.length,
    };
  }

  function allBloomed(s) { return s.plots.every((p) => p.stage === 3); }
  function emptyPlots(s) { return s.plots.reduce((a, p, i) => (p.stage === 0 ? (a.push(i), a) : a), []); }

  function save(s) { return JSON.stringify(s); }

  // Tolerant load: any corruption / version mismatch → a fresh garden (never throw into the game).
  function load(json) {
    try {
      const s = JSON.parse(json);
      if (!s || s.v !== VERSION || !Array.isArray(s.plots) || s.plots.length !== PLOTS) return newState();
      for (const p of s.plots) {
        if (typeof p.stage !== 'number' || p.stage < 0 || p.stage > 3) return newState();
      }
      if (typeof s.water !== 'number' || s.water < 0) s.water = 0;
      s.flowersSeen = s.flowersSeen || {};
      s.crittersSeen = s.crittersSeen || {};
      s.bloomedTotal = s.bloomedTotal || 0;
      return s;
    } catch {
      return newState();
    }
  }

  const api = { FLOWERS, CRITTERS, PLOTS, WATER_PER_TASK, newState, plant, water, addWater, progress, allBloomed, emptyPlots, save, load };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GardenLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
