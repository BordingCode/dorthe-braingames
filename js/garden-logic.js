/* ===== Dorthes have — world/economy/quest logic (pure core) =====
 * Dual-mode: browser global (GardenLogic) + Node require for `node --test`. No DOM.
 * A gridded garden you build up by spending resources earned from mini-games; building
 * "helps nature" → attracts wildlife; a quest chain drives gently-rising difficulty.
 * See gamedev-kb: systems-and-economy, difficulty-and-flow, resilience-and-errors.
 */
(function (root) {
  'use strict';

  const VERSION = 2;
  const COLS = 5, ROWS = 4, TILES = COLS * ROWS;
  const FLOWERS = ['🌷', '🌻', '🌹', '🌼', '🌸', '🪻'];
  // region-1 wildlife collection
  const WILDLIFE = ['🦋', '🐝', '🐞', '🐦', '🐸', '🦔'];
  const BUILDABLE = ['tree', 'pond', 'feeder', 'beehouse'];
  const BUILD_COST = {
    tree: { froe: 3, vand: 2 },
    pond: { vand: 4, sol: 1 },
    feeder: { vand: 2, sol: 1 },
    beehouse: { froe: 2, sol: 1 },
  };
  const BUILD_EMOJI = { soil: '', tree: '🌳', pond: '🪷', feeder: '🛁', beehouse: '🐝' };
  const PLANT_COST = { froe: 1 };
  const WATER_COST = { vand: 1 };

  function pick(arr, rng) { return arr[Math.floor((rng || Math.random)() * arr.length)]; }

  function newState() {
    const grid = [];
    for (let i = 0; i < TILES; i++) grid.push({ type: 'soil', stage: 0, flower: null });
    return {
      v: VERSION, region: 0, chapter: 1,
      grid,
      resources: { sol: 1, vand: 3, froe: 3 },
      questIndex: 0,
      wildlifeSeen: {},
      picked: 0,
    };
  }

  /* ---------- resources ---------- */
  function canAfford(s, cost) { return Object.keys(cost).every((k) => (s.resources[k] || 0) >= cost[k]); }
  function spend(s, cost) { for (const k in cost) s.resources[k] -= cost[k]; }
  function earn(s, gain) { for (const k in gain) s.resources[k] = (s.resources[k] || 0) + gain[k]; return s.resources; }

  /* ---------- tiles ---------- */
  function bloomCount(s) { return s.grid.filter((t) => t.type === 'flower' && t.stage === 3).length; }
  function hasType(s, type) { return s.grid.some((t) => t.type === type); }
  function countType(s, type) { return s.grid.filter((t) => t.type === type).length; }

  function plant(s, i) {
    const t = s.grid[i];
    if (!t || t.type !== 'soil' || !canAfford(s, PLANT_COST)) return false;
    spend(s, PLANT_COST);
    t.type = 'flower'; t.stage = 1; t.flower = null;
    return true;
  }

  // Water a flower: costs vand, advances a stage; blooming records a flower + refreshes wildlife.
  function water(s, i, rng) {
    const t = s.grid[i];
    if (!t || t.type !== 'flower' || t.stage < 1 || t.stage >= 3 || !canAfford(s, WATER_COST)) return { ok: false };
    spend(s, WATER_COST);
    t.stage++;
    if (t.stage === 3) {
      t.flower = pick(FLOWERS, rng);
      return { ok: true, bloomed: true, flower: t.flower, wildlife: refreshWildlife(s) };
    }
    return { ok: true, bloomed: false };
  }

  // Harvest a bloomed flower → back to soil (frees the tile, keeps the flower in the log).
  function harvest(s, i) {
    const t = s.grid[i];
    if (!t || t.type !== 'flower' || t.stage !== 3) return null;
    const f = t.flower;
    t.type = 'soil'; t.stage = 0; t.flower = null;
    s.picked = (s.picked || 0) + 1;
    return f;
  }

  function build(s, type, i) {
    const t = s.grid[i];
    if (!t || t.type !== 'soil' || !BUILD_COST[type] || !canAfford(s, BUILD_COST[type])) return { ok: false };
    spend(s, BUILD_COST[type]);
    t.type = type; t.stage = 0; t.flower = null;
    return { ok: true, wildlife: refreshWildlife(s) };
  }

  // Declarative wildlife: what's present in the garden decides who visits. Returns newcomers.
  function refreshWildlife(s) {
    const blooms = bloomCount(s);
    const news = [];
    const add = (w) => { if (!s.wildlifeSeen[w]) { s.wildlifeSeen[w] = true; news.push(w); } };
    if (blooms >= 2) add('🦋');
    if (blooms >= 3) add('🐝');
    if (blooms >= 4) add('🐞');
    if (hasType(s, 'tree') || hasType(s, 'feeder') || hasType(s, 'beehouse')) add('🐦');
    if (hasType(s, 'beehouse')) add('🐝');
    if (hasType(s, 'pond')) add('🐸');
    if (hasType(s, 'tree') && hasType(s, 'pond')) add('🦔');
    return news;
  }

  /* ---------- quests (region 1) ---------- */
  const QUESTS = [
    { id: 'plant3', icon: '🌱', title: 'Plant og dyrk 3 blomster',
      goal: (s) => { const n = bloomCount(s); return { done: n >= 3, text: n + '/3 blomster i blomst' }; }, reward: { sol: 2, froe: 2 } },
    { id: 'bee', icon: '🐝', title: 'Tiltræk en bi',
      goal: (s) => ({ done: !!s.wildlifeSeen['🐝'], text: s.wildlifeSeen['🐝'] ? 'klaret!' : 'bier kommer til en have fuld af blomster' }), reward: { vand: 4 } },
    { id: 'feeder', icon: '🛁', title: 'Byg et fuglebad',
      goal: (s) => ({ done: hasType(s, 'feeder'), text: hasType(s, 'feeder') ? 'klaret!' : 'byg et fuglebad fra menuen' }), reward: { sol: 2, froe: 2 } },
    { id: 'bird', icon: '🐦', title: 'Tiltræk en fugl',
      goal: (s) => ({ done: !!s.wildlifeSeen['🐦'], text: s.wildlifeSeen['🐦'] ? 'klaret!' : 'fugle elsker fuglebade og træer' }), reward: { vand: 3, sol: 1 } },
    { id: 'tree', icon: '🌳', title: 'Plant et træ',
      goal: (s) => ({ done: hasType(s, 'tree'), text: hasType(s, 'tree') ? 'klaret!' : 'byg et træ fra menuen' }), reward: { vand: 3, froe: 2 } },
    { id: 'pond', icon: '🪷', title: 'Byg en dam',
      goal: (s) => ({ done: hasType(s, 'pond'), text: hasType(s, 'pond') ? 'klaret!' : 'byg en dam fra menuen' }), reward: { sol: 3, froe: 1 } },
    { id: 'frog', icon: '🐸', title: 'Tiltræk en frø',
      goal: (s) => ({ done: !!s.wildlifeSeen['🐸'], text: s.wildlifeSeen['🐸'] ? 'klaret!' : 'frøer flytter ind ved en dam' }), reward: { vand: 4, froe: 2 } },
    { id: 'thrive', icon: '🌸', title: 'Få haven til at trives', finale: true,
      goal: (s) => { const ok = bloomCount(s) >= 6 && hasType(s, 'tree') && hasType(s, 'pond') && hasType(s, 'feeder'); return { done: ok, text: 'fyld haven: 6 blomster + træ + dam + fuglebad' }; }, reward: { sol: 5, vand: 5, froe: 5 } },
  ];

  function currentQuest(s) { return QUESTS[s.questIndex] || null; }

  // Advance through every quest whose goal is already met; grant rewards; raise difficulty.
  function tryAdvance(s) {
    const completed = [];
    let finale = false;
    let q;
    while ((q = currentQuest(s)) && q.goal(s).done) {
      earn(s, q.reward);
      completed.push(q);
      if (q.finale) finale = true;
      s.questIndex++;
      s.chapter = 1 + Math.floor(s.questIndex / 2); // difficulty rises every 2 quests
    }
    return { completed, finale, allDone: !currentQuest(s) };
  }

  /* ---------- difficulty (gentle; sawtooth ceilings) ---------- */
  function difficultyParams(chapter) {
    const c = Math.max(1, chapter | 0);
    return {
      pairs: c >= 3 ? 4 : 3,                            // find-pair pairs
      seqLen: Math.min(3 + Math.floor((c - 1) / 2), 6), // remember sequence length
      oddTiles: c >= 3 ? 16 : 9,                        // odd-one-out grid (3x3 / 4x4)
      countMax: 5 + c,                                  // count task upper range
      sortTargets: c >= 4 ? 4 : 3,                      // sort-by-colour targets
    };
  }

  /* ---------- collection / progress ---------- */
  function progress(s) {
    return {
      flowers: bloomCount(s),
      wildlife: Object.keys(s.wildlifeSeen).length, wildlifeTotal: WILDLIFE.length,
      quests: s.questIndex, questsTotal: QUESTS.length,
    };
  }

  /* ---------- persistence (tolerant) ---------- */
  function save(s) { return JSON.stringify(s); }
  function load(json) {
    try {
      const s = JSON.parse(json);
      if (!s || s.v !== VERSION || !Array.isArray(s.grid) || s.grid.length !== TILES) return newState();
      for (const t of s.grid) { if (!t || typeof t.type !== 'string') return newState(); }
      s.resources = s.resources || { sol: 0, vand: 0, froe: 0 };
      for (const k of ['sol', 'vand', 'froe']) if (typeof s.resources[k] !== 'number' || s.resources[k] < 0) s.resources[k] = 0;
      s.wildlifeSeen = s.wildlifeSeen || {};
      if (typeof s.questIndex !== 'number' || s.questIndex < 0) s.questIndex = 0;
      if (typeof s.chapter !== 'number' || s.chapter < 1) s.chapter = 1;
      s.picked = s.picked || 0;
      return s;
    } catch { return newState(); }
  }

  const api = {
    VERSION, COLS, ROWS, TILES, FLOWERS, WILDLIFE, BUILDABLE, BUILD_COST, BUILD_EMOJI, PLANT_COST, WATER_COST, QUESTS,
    newState, canAfford, spend, earn, plant, water, harvest, build, refreshWildlife,
    bloomCount, hasType, countType, currentQuest, tryAdvance, difficultyParams, progress, save, load,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GardenLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
