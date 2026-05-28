/* ===== Dorthes have — world/economy/quest logic (pure core) =====
 * Dual-mode: browser global (GardenLogic) + Node require for `node --test`. No DOM.
 * A garden that GROWS: a small bed → a garden → a meadow → a big wild park. You earn
 * resources from mini-games, spend them to plant & build; building "helps nature" →
 * attracts wildlife; a quest chain drives gently-rising difficulty AND, at thresholds,
 * the whole world expands to the next, larger stage. See gamedev-kb: systems-and-economy,
 * difficulty-and-flow, resilience-and-errors.
 */
(function (root) {
  'use strict';

  const VERSION = 3;
  // the world grows through these stages (the "small bed → huge park" arc)
  const STAGES = [
    { id: 'bed', name: 'Lille bed', cols: 3, rows: 3 },
    { id: 'garden', name: 'Haven', cols: 5, rows: 4 },
    { id: 'meadow', name: 'Engen', cols: 6, rows: 5 },
    { id: 'forest', name: 'Skovparken', cols: 7, rows: 6 },
  ];
  const FLOWERS = ['🌷', '🌻', '🌹', '🌼', '🌸', '🪻'];
  const WILDLIFE = ['🦋', '🐝', '🐞', '🐦', '🐸', '🦔'];
  const BUILDABLE = ['tree', 'pond', 'feeder', 'beehouse'];
  const BUILD_COST = {
    tree: { froe: 3, vand: 2 }, pond: { vand: 4, sol: 1 },
    feeder: { vand: 2, sol: 1 }, beehouse: { froe: 2, sol: 1 },
  };
  const BUILD_EMOJI = { soil: '', tree: '🌳', pond: '🪷', feeder: '🛁', beehouse: '🐝' };
  // purely cosmetic decorations (no wildlife effect) — free self-expression, cheap
  const DECOR = ['stone', 'mushroom', 'hedge', 'path', 'lantern'];
  const DECOR_COST = {
    stone: { sol: 1 }, mushroom: { froe: 1 }, hedge: { froe: 2 },
    path: { sol: 1 }, lantern: { vand: 2 },
  };
  const DECOR_EMOJI = { stone: '🪨', mushroom: '🍄', hedge: '🌿', path: '🟫', lantern: '🏮' };
  const PLANT_COST = { froe: 1 };
  const WATER_COST = { vand: 1 };

  // light story: Amigo the dog guides you, one warm line per quest
  const STORY = {
    plant3: 'Lad os fylde haven med blomster! Plant tre, og vand dem til de springer ud. 🌱',
    bee: 'Når haven står i fuldt flor, kommer bierne helt af sig selv. 🐝',
    feeder: 'Byg et fuglebad — så får de små fugle et sted at soppe. 🛁',
    bird: 'Fugle elsker bade og træer. Hold øje med den første gæst! 🐦',
    tree: 'Et træ giver skygge og ly til mange dyr. Plant et stort et. 🌳',
    pond: 'En lille dam gør haven helt levende. 🪷',
    frog: 'Hvor der er vand, flytter frøerne ind. Lyt efter dem om aftenen! 🐸',
    thrive: 'Nu skal haven bare fyldes helt op. Du er der næsten! 🌸',
  };
  // "vidste du?" facts shown in the Havelog for each collected guest
  const FACTS = {
    '🦋': 'Sommerfugle smager med fødderne, før de drikker nektar.',
    '🐝': 'En bi kan besøge op mod tusind blomster på én dag.',
    '🐞': 'Mariehøns spiser bladlus og passer på haven.',
    '🐦': 'Fugle spreder blomsterfrø rundt i hele naturen.',
    '🐸': 'Frøer ånder både gennem huden og lungerne.',
    '🦔': 'Pindsvin ruller sig sammen til en pigget kugle, når de er bange.',
  };
  const CHEERS = ['Hvor er du dygtig! 🐾', 'Se lige den have! 🌿', 'Naturen takker dig! 💚', 'Sikke et flot arbejde! ✨'];

  function pick(arr, rng) { return arr[Math.floor((rng || Math.random)() * arr.length)]; }
  function makeGrid(n) { const g = []; for (let i = 0; i < n; i++) g.push({ type: 'soil', stage: 0, flower: null }); return g; }

  function newState() {
    const s0 = STAGES[0];
    return {
      v: VERSION, stage: 0, cols: s0.cols, rows: s0.rows, chapter: 1,
      grid: makeGrid(s0.cols * s0.rows),
      resources: { sol: 1, vand: 3, froe: 3 },
      questIndex: 0, wildlifeSeen: {}, picked: 0,
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
    spend(s, PLANT_COST); t.type = 'flower'; t.stage = 1; t.flower = null; return true;
  }
  function water(s, i, rng) {
    const t = s.grid[i];
    if (!t || t.type !== 'flower' || t.stage < 1 || t.stage >= 3 || !canAfford(s, WATER_COST)) return { ok: false };
    spend(s, WATER_COST); t.stage++;
    if (t.stage === 3) { t.flower = pick(FLOWERS, rng); return { ok: true, bloomed: true, flower: t.flower, wildlife: refreshWildlife(s) }; }
    return { ok: true, bloomed: false };
  }
  function harvest(s, i) {
    const t = s.grid[i];
    if (!t || t.type !== 'flower' || t.stage !== 3) return null;
    const f = t.flower; t.type = 'soil'; t.stage = 0; t.flower = null; s.picked = (s.picked || 0) + 1; return f;
  }
  const costOf = (type) => BUILD_COST[type] || DECOR_COST[type] || null;
  // unified placement for buildables AND decor; only buildables refresh wildlife
  function place(s, type, i) {
    const t = s.grid[i], cost = costOf(type);
    if (!t || t.type !== 'soil' || !cost || !canAfford(s, cost)) return { ok: false };
    spend(s, cost); t.type = type; t.stage = 0; t.flower = null;
    return { ok: true, wildlife: BUILD_COST[type] ? refreshWildlife(s) : [] };
  }
  const build = place; // back-compat alias (buildables go through place too)
  // rearrange: move any non-soil tile onto an empty (soil) tile, preserving its state
  function move(s, from, to) {
    if (from === to) return false;
    const a = s.grid[from], b = s.grid[to];
    if (!a || !b || a.type === 'soil' || b.type !== 'soil') return false;
    s.grid[to] = a; s.grid[from] = { type: 'soil', stage: 0, flower: null }; return true;
  }
  // clear a tile back to soil (no refund — wildlife already seen stays seen)
  function remove(s, i) {
    const t = s.grid[i];
    if (!t || t.type === 'soil') return false;
    s.grid[i] = { type: 'soil', stage: 0, flower: null }; return true;
  }

  function refreshWildlife(s) {
    const blooms = bloomCount(s); const news = [];
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

  /* ---------- quests (region 1 arc) ---------- */
  const QUESTS = [
    { id: 'plant3', icon: '🌱', title: 'Plant og dyrk 3 blomster', goal: (s) => { const n = bloomCount(s); return { done: n >= 3, text: n + '/3 blomster i blomst' }; }, reward: { sol: 2, froe: 2 } },
    { id: 'bee', icon: '🐝', title: 'Tiltræk en bi', goal: (s) => ({ done: !!s.wildlifeSeen['🐝'], text: s.wildlifeSeen['🐝'] ? 'klaret!' : 'bier kommer til en have fuld af blomster' }), reward: { vand: 4 } },
    { id: 'feeder', icon: '🛁', title: 'Byg et fuglebad', goal: (s) => ({ done: hasType(s, 'feeder'), text: hasType(s, 'feeder') ? 'klaret!' : 'byg et fuglebad fra menuen' }), reward: { sol: 2, froe: 2 } },
    { id: 'bird', icon: '🐦', title: 'Tiltræk en fugl', goal: (s) => ({ done: !!s.wildlifeSeen['🐦'], text: s.wildlifeSeen['🐦'] ? 'klaret!' : 'fugle elsker fuglebade og træer' }), reward: { vand: 3, sol: 1 } },
    { id: 'tree', icon: '🌳', title: 'Plant et træ', goal: (s) => ({ done: hasType(s, 'tree'), text: hasType(s, 'tree') ? 'klaret!' : 'byg et træ fra menuen' }), reward: { vand: 3, froe: 2 } },
    { id: 'pond', icon: '🪷', title: 'Byg en dam', goal: (s) => ({ done: hasType(s, 'pond'), text: hasType(s, 'pond') ? 'klaret!' : 'byg en dam fra menuen' }), reward: { sol: 3, froe: 1 } },
    { id: 'frog', icon: '🐸', title: 'Tiltræk en frø', goal: (s) => ({ done: !!s.wildlifeSeen['🐸'], text: s.wildlifeSeen['🐸'] ? 'klaret!' : 'frøer flytter ind ved en dam' }), reward: { vand: 4, froe: 2 } },
    { id: 'thrive', icon: '🌸', title: 'Få haven til at trives', finale: true, goal: (s) => { const ok = bloomCount(s) >= 6 && hasType(s, 'tree') && hasType(s, 'pond') && hasType(s, 'feeder'); return { done: ok, text: 'fyld haven: 6 blomster + træ + dam + fuglebad' }; }, reward: { sol: 5, vand: 5, froe: 5 } },
  ];
  function currentQuest(s) { return QUESTS[s.questIndex] || null; }
  function tryAdvance(s) {
    const completed = []; let finale = false, q;
    while ((q = currentQuest(s)) && q.goal(s).done) {
      earn(s, q.reward); completed.push(q); if (q.finale) finale = true;
      s.questIndex++; s.chapter = 1 + Math.floor(s.questIndex / 2);
    }
    return { completed, finale, allDone: !currentQuest(s) };
  }

  /* ---------- the world grows with progress ---------- */
  function stageForQuest(qi) { return qi >= 7 ? 3 : qi >= 5 ? 2 : qi >= 2 ? 1 : 0; }
  function currentStage(s) { return STAGES[s.stage]; }
  // expand the grid to the bigger stage, keeping existing tiles anchored top-left
  function growTo(s, ns) {
    const old = STAGES[s.stage], nw = STAGES[ns];
    const grid = makeGrid(nw.cols * nw.rows);
    for (let r = 0; r < old.rows; r++) for (let c = 0; c < old.cols; c++) grid[r * nw.cols + c] = s.grid[r * old.cols + c];
    s.grid = grid; s.cols = nw.cols; s.rows = nw.rows; s.stage = ns;
  }
  // call after tryAdvance: if quest progress crossed a stage threshold, grow the world.
  function maybeGrow(s) {
    const target = stageForQuest(s.questIndex);
    if (target > s.stage) { const from = s.stage; growTo(s, target); return { grew: true, from, to: target, stage: STAGES[target] }; }
    return { grew: false };
  }

  /* ---------- difficulty (gentle) ---------- */
  function difficultyParams(chapter) {
    const c = Math.max(1, chapter | 0);
    return { pairs: c >= 3 ? 4 : 3, seqLen: Math.min(3 + Math.floor((c - 1) / 2), 6), oddTiles: c >= 3 ? 16 : 9, countMax: 5 + c, sortTargets: c >= 4 ? 4 : 3 };
  }

  function progress(s) {
    return {
      flowers: bloomCount(s),
      wildlife: Object.keys(s.wildlifeSeen).length, wildlifeTotal: WILDLIFE.length,
      quests: s.questIndex, questsTotal: QUESTS.length,
      stage: s.stage, stageName: STAGES[s.stage].name, stagesTotal: STAGES.length,
    };
  }

  /* ---------- persistence ---------- */
  function save(s) { return JSON.stringify(s); }
  function load(json) {
    try {
      const s = JSON.parse(json);
      if (!s || s.v !== VERSION || !Array.isArray(s.grid)) return newState();
      if (typeof s.cols !== 'number' || typeof s.rows !== 'number' || s.grid.length !== s.cols * s.rows) return newState();
      for (const t of s.grid) { if (!t || typeof t.type !== 'string') return newState(); }
      s.resources = s.resources || { sol: 0, vand: 0, froe: 0 };
      for (const k of ['sol', 'vand', 'froe']) if (typeof s.resources[k] !== 'number' || s.resources[k] < 0) s.resources[k] = 0;
      s.wildlifeSeen = s.wildlifeSeen || {};
      if (typeof s.questIndex !== 'number' || s.questIndex < 0) s.questIndex = 0;
      if (typeof s.chapter !== 'number' || s.chapter < 1) s.chapter = 1;
      if (typeof s.stage !== 'number' || s.stage < 0 || s.stage >= STAGES.length) s.stage = 0;
      s.picked = s.picked || 0;
      return s;
    } catch { return newState(); }
  }

  const api = {
    VERSION, STAGES, FLOWERS, WILDLIFE, BUILDABLE, BUILD_COST, BUILD_EMOJI,
    DECOR, DECOR_COST, DECOR_EMOJI, PLANT_COST, WATER_COST, QUESTS, STORY, FACTS, CHEERS,
    newState, canAfford, spend, earn, plant, water, harvest, build, place, move, remove, refreshWildlife,
    bloomCount, hasType, countType, currentQuest, tryAdvance, stageForQuest, currentStage, growTo, maybeGrow,
    difficultyParams, progress, save, load,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GardenLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
