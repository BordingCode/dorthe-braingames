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

  const VERSION = 6;
  // the world grows through these stages (the "small bed → huge wild park" arc)
  const STAGES = [
    { id: 'bed', name: 'Lille bed', cols: 3, rows: 3 },
    { id: 'garden', name: 'Haven', cols: 5, rows: 4 },
    { id: 'meadow', name: 'Engen', cols: 6, rows: 5 },
    { id: 'forest', name: 'Skovparken', cols: 7, rows: 6 },
    { id: 'wild', name: 'Vildmarken', cols: 8, rows: 6 },
  ];
  // cosmetic gentle cycle — applied as a warm light tint (never dark; dusk = lanterns glow)
  const TIMES = ['dawn', 'day', 'golden', 'dusk'];
  // cosmetic season derived from how big the world has grown (renewal as it reaches the wild)
  const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
  const SEASON_FOR_STAGE = [0, 1, 2, 3, 0];
  // "hygge" (charm) — a cosy garden grows more charming as you decorate it and add variety
  const HYGGE_LEVELS = [
    { min: 0, name: 'Spirende have' },
    { min: 8, name: 'Hyggelig have' },
    { min: 18, name: 'Dejlig have' },
    { min: 32, name: 'Fortryllende have' },
    { min: 50, name: 'Drømmehave' },
  ];
  const FLOWERS = ['🌷', '🌻', '🌹', '🌼', '🌸', '🪻', '🌺', '🏵️'];
  const COMMON_FLOWERS = ['🌷', '🌻', '🌹', '🌼', '🌸', '🪻'];
  const RARE = ['🌺', '🏵️']; // appear occasionally — a small thrill to discover
  const FLOWER_NAMES = { '🌷': 'Tulipan', '🌻': 'Solsikke', '🌹': 'Rose', '🌼': 'Bellis', '🌸': 'Kirsebærblomst', '🪻': 'Hyacint', '🌺': 'Hibiscus', '🏵️': 'Morgenfrue' };
  const FLOWER_FACTS = {
    '🌷': 'Tulipaner blev engang handlet så dyrt som huse i Holland.',
    '🌻': 'Unge solsikker vender hovedet og følger solen hen over himlen.',
    '🌹': 'Roser har været dyrket i haver i over 5.000 år.',
    '🌼': 'Bellis lukker kronbladene om natten og åbner dem ved daggry.',
    '🌸': 'Kirsebærtræer blomstrer kun nogle få uger om foråret.',
    '🪻': 'Hyacintens søde duft kan fylde et helt rum.',
    '🌺': 'En hibiscus-blomst holder kun én dag — men der kommer altid nye.',
    '🏵️': 'Morgenfruer plantes ofte i køkkenhaven, fordi de holder skadedyr væk.',
  };
  const WILDLIFE = ['🦋', '🐝', '🐞', '🐦', '🐸', '🦔', '🐿️', '🦆'];
  const BUILDABLE = ['tree', 'pond', 'feeder', 'beehouse'];
  const BUILD_COST = {
    tree: { froe: 3, vand: 2 }, pond: { vand: 4, sol: 1 },
    feeder: { vand: 2, sol: 1 }, beehouse: { froe: 2, sol: 1 },
  };
  const BUILD_EMOJI = { soil: '', tree: '🌳', pond: '🪷', feeder: '🛁', beehouse: '🐝' };
  // purely cosmetic decorations (no wildlife effect) — free self-expression, cheap
  const DECOR = ['stone', 'mushroom', 'hedge', 'path', 'lantern', 'bench', 'birdhouse'];
  const DECOR_COST = {
    stone: { sol: 1 }, mushroom: { froe: 1 }, hedge: { froe: 2 },
    path: { sol: 1 }, lantern: { vand: 2 }, bench: { sol: 2 }, birdhouse: { froe: 2 },
  };
  const DECOR_EMOJI = { stone: '🪨', mushroom: '🍄', hedge: '🌿', path: '🟫', lantern: '🏮', bench: '🪑', birdhouse: '🏠' };
  const PLANT_COST = { froe: 1 };
  const WATER_COST = { vand: 1 };

  // light story: Amigo the dog guides you, one warm line per quest
  const STORY = {
    plant3: 'Lad os fylde haven med blomster! Plant tre, og vand dem til de springer ud. 🌱',
    beehouse: 'Byg et lille bistade — så summer bierne snart mellem blomsterne. 🐝',
    feeder: 'Et fuglebad giver de små fugle et sted at soppe og drikke. 🛁',
    tree: 'Et træ giver skygge og ly til mange dyr. Plant et stort et. 🌳',
    pond: 'En lille dam gør haven helt levende — og frøerne flytter ind. 🐸',
    bloom6: 'Flere blomster, mere liv! Få seks i fuldt flor. 🌼',
    tree2: 'Plant et træ mere — så kommer egernet springende. 🐿️',
    decorate: 'Nu gør vi haven til din egen: sæt lidt pynt — en sten, en bænk, en lanterne. 🎀',
    thrive: 'Haven er ved at blomstre helt op. Du er der næsten! 🌸',
    wildpark: 'Sidste ønske: pynt og fyld haven, til den bliver en hel drømmehave. 💚',
  };
  // "vidste du?" facts shown in the Havelog for each collected guest
  const FACTS = {
    '🦋': 'Sommerfugle smager med fødderne, før de drikker nektar.',
    '🐝': 'En bi kan besøge op mod tusind blomster på én dag.',
    '🐞': 'Mariehøns spiser bladlus og passer på haven.',
    '🐦': 'Fugle spreder blomsterfrø rundt i hele naturen.',
    '🐸': 'Frøer ånder både gennem huden og lungerne.',
    '🦔': 'Pindsvin ruller sig sammen til en pigget kugle, når de er bange.',
    '🐿️': 'Egern gemmer nødder og glemmer nogle — så vokser der nye træer.',
    '🦆': 'Ænder har vandtætte fjer og fryser aldrig om fødderne.',
  };
  const CHEERS = ['Hvor er du dygtig! 🐾', 'Se lige den have! 🌿', 'Naturen takker dig! 💚', 'Sikke et flot arbejde! ✨'];

  function pick(arr, rng) { return arr[Math.floor((rng || Math.random)() * arr.length)]; }
  // mostly common flowers, with an occasional rare one to discover
  function pickFlower(rng) {
    const rnd = (rng || Math.random);
    if (rnd() < 0.12) return RARE[Math.floor(rnd() * RARE.length)];
    return COMMON_FLOWERS[Math.floor(rnd() * COMMON_FLOWERS.length)];
  }
  function makeGrid(n) { const g = []; for (let i = 0; i < n; i++) g.push({ type: 'soil', stage: 0, flower: null }); return g; }

  function newState() {
    const s0 = STAGES[0];
    return {
      v: VERSION, stage: 0, cols: s0.cols, rows: s0.rows, chapter: 1,
      grid: makeGrid(s0.cols * s0.rows),
      resources: { sol: 1, vand: 3, froe: 3 },
      questIndex: 0, wildlifeSeen: {}, flowersSeen: {}, builtSeen: {}, picked: 0, timeOfDay: 0, hygge: 0,
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
  function decorCount(s) { return s.grid.filter((t) => DECOR.includes(t.type)).length; }

  // choice: a specific flower emoji to grow, or null/undefined for "mixed seeds" (random at bloom)
  function plant(s, i, choice) {
    const t = s.grid[i];
    if (!t || t.type !== 'soil' || !canAfford(s, PLANT_COST)) return false;
    spend(s, PLANT_COST); t.type = 'flower'; t.stage = 1;
    t.flower = (choice && FLOWERS.includes(choice)) ? choice : null;
    return true;
  }
  function water(s, i, rng) {
    const t = s.grid[i];
    if (!t || t.type !== 'flower' || t.stage < 1 || t.stage >= 3 || !canAfford(s, WATER_COST)) return { ok: false };
    spend(s, WATER_COST); t.stage++;
    if (t.stage === 3) {
      if (!t.flower) t.flower = pickFlower(rng); // mixed seed → random (may discover a rare one)
      const newFlower = !s.flowersSeen[t.flower];
      s.flowersSeen[t.flower] = true;
      return { ok: true, bloomed: true, flower: t.flower, newFlower: newFlower, wildlife: refreshWildlife(s) };
    }
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
    const newBuild = !s.builtSeen[type];
    s.builtSeen[type] = true;
    return { ok: true, newBuild: newBuild, wildlife: BUILD_COST[type] ? refreshWildlife(s) : [] };
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
    if (blooms >= 4) add('🐞');
    if (hasType(s, 'tree') || hasType(s, 'feeder')) add('🐦');
    if (hasType(s, 'beehouse')) add('🐝'); // bees come from a beehouse, not free from blooms
    if (hasType(s, 'pond')) add('🐸');
    if (hasType(s, 'tree') && hasType(s, 'pond')) add('🦔');
    if (countType(s, 'tree') >= 2) add('🐿️');
    if (hasType(s, 'pond') && blooms >= 6) add('🦆');
    return news;
  }

  /* ---------- quests (region 1 arc) ---------- */
  // Every quest is a thing you DO (grow / build / decorate); the animals arrive as the
  // reward of that action, not as separate "attract X" quests that complete for free.
  // Rewards are a modest bonus — the main income is playing brain games (gentle, earned).
  const QUESTS = [
    { id: 'plant3', icon: '🌱', title: 'Plant og dyrk 3 blomster', goal: (s) => { const n = bloomCount(s); return { done: n >= 3, text: n + '/3 blomster i blomst' }; }, reward: { sol: 1, froe: 1 } },
    { id: 'beehouse', icon: '🐝', title: 'Byg et bistade til bierne', goal: (s) => ({ done: hasType(s, 'beehouse'), text: hasType(s, 'beehouse') ? 'klaret — hør bierne summe!' : 'byg et bistade fra menuen' }), reward: { vand: 2 } },
    { id: 'feeder', icon: '🛁', title: 'Byg et fuglebad', goal: (s) => ({ done: hasType(s, 'feeder'), text: hasType(s, 'feeder') ? 'klaret — fuglene kommer!' : 'byg et fuglebad fra menuen' }), reward: { froe: 2 } },
    { id: 'tree', icon: '🌳', title: 'Plant et stort træ', goal: (s) => ({ done: hasType(s, 'tree'), text: hasType(s, 'tree') ? 'klaret!' : 'byg et træ fra menuen' }), reward: { froe: 2 } },
    { id: 'pond', icon: '🪷', title: 'Grav en lille dam', goal: (s) => ({ done: hasType(s, 'pond'), text: hasType(s, 'pond') ? 'klaret — frøen flytter ind!' : 'byg en dam fra menuen' }), reward: { sol: 2 } },
    { id: 'bloom6', icon: '🌼', title: 'Få seks blomster i fuldt flor', goal: (s) => { const n = bloomCount(s); return { done: n >= 6, text: n + '/6 blomster i blomst' }; }, reward: { vand: 2, froe: 1 } },
    { id: 'tree2', icon: '🐿️', title: 'Plant endnu et træ til egernet', goal: (s) => { const n = countType(s, 'tree'); return { done: n >= 2, text: n + '/2 træer — egern elsker træer' }; }, reward: { froe: 2 } },
    { id: 'decorate', icon: '🎀', title: 'Pynt haven med tre ting', goal: (s) => { const n = decorCount(s); return { done: n >= 3, text: n + '/3 pyntede ting (sten, bænk, lanterne...)' }; }, reward: { sol: 2, vand: 1 } },
    { id: 'thrive', icon: '🌸', title: 'Få haven til at trives', goal: (s) => { const ok = bloomCount(s) >= 8 && hasType(s, 'beehouse') && hasType(s, 'feeder') && hasType(s, 'tree') && hasType(s, 'pond'); return { done: ok, text: '8 blomster + bistade + fuglebad + træ + dam' }; }, reward: { sol: 2, vand: 2, froe: 2 } },
    { id: 'wildpark', icon: '🌳', title: 'Skab din drømmehave', finale: true, goal: (s) => { const sc = hyggeScore(s); return { done: sc >= 50, text: 'pynt og fyld haven til en drømmehave (' + sc + '/50 hygge)' }; }, reward: { sol: 3, vand: 3, froe: 3 } },
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
  function stageForQuest(qi) { return qi >= 9 ? 4 : qi >= 7 ? 3 : qi >= 5 ? 2 : qi >= 2 ? 1 : 0; }
  function currentSeason(s) { return SEASON_FOR_STAGE[s.stage] || 0; }
  function advanceTime(s) { s.timeOfDay = ((s.timeOfDay | 0) + 1) % TIMES.length; return s.timeOfDay; }
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

  const DECORATIONS = BUILDABLE.concat(DECOR); // everything you can place, for the almanac

  // Charm score. Decorations count most (they're pure self-expression), and variety —
  // different decoration types, flower colours and animals — is rewarded over sameness.
  function hyggeScore(s) {
    let placedDecor = 0, nature = 0, distinctDecor = 0;
    const seenType = {};
    for (const t of s.grid) {
      if (DECOR.includes(t.type)) { placedDecor++; if (!seenType[t.type]) { seenType[t.type] = 1; distinctDecor++; } }
      else if (BUILDABLE.includes(t.type)) nature++;
    }
    const colours = new Set(s.grid.filter((t) => t.type === 'flower' && t.stage === 3 && t.flower).map((t) => t.flower)).size;
    const wildlife = Object.keys(s.wildlifeSeen || {}).length;
    return bloomCount(s) + nature + placedDecor * 2 + distinctDecor * 2 + colours + wildlife;
  }
  function hyggeLevel(score) { let lv = 0; for (let i = 0; i < HYGGE_LEVELS.length; i++) if (score >= HYGGE_LEVELS[i].min) lv = i; return lv; }
  function progress(s) {
    return {
      flowers: bloomCount(s),
      wildlife: Object.keys(s.wildlifeSeen).length, wildlifeTotal: WILDLIFE.length,
      flowerKinds: Object.keys(s.flowersSeen || {}).length, flowerKindsTotal: FLOWERS.length,
      builtKinds: Object.keys(s.builtSeen || {}).length, builtKindsTotal: DECORATIONS.length,
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
      s.flowersSeen = s.flowersSeen || {};
      s.builtSeen = s.builtSeen || {};
      if (typeof s.questIndex !== 'number' || s.questIndex < 0) s.questIndex = 0;
      if (typeof s.chapter !== 'number' || s.chapter < 1) s.chapter = 1;
      if (typeof s.stage !== 'number' || s.stage < 0 || s.stage >= STAGES.length) s.stage = 0;
      s.picked = s.picked || 0;
      if (typeof s.timeOfDay !== 'number' || s.timeOfDay < 0 || s.timeOfDay >= TIMES.length) s.timeOfDay = 0;
      if (typeof s.hygge !== 'number' || s.hygge < 0) s.hygge = 0;
      return s;
    } catch { return newState(); }
  }

  const api = {
    VERSION, STAGES, TIMES, SEASONS, SEASON_FOR_STAGE, FLOWERS, RARE, FLOWER_NAMES, FLOWER_FACTS,
    WILDLIFE, BUILDABLE, BUILD_COST, BUILD_EMOJI, DECORATIONS,
    DECOR, DECOR_COST, DECOR_EMOJI, PLANT_COST, WATER_COST, QUESTS, STORY, FACTS, CHEERS,
    newState, canAfford, spend, earn, plant, water, harvest, build, place, move, remove, refreshWildlife,
    bloomCount, hasType, countType, currentQuest, tryAdvance, stageForQuest, currentStage, growTo, maybeGrow,
    currentSeason, advanceTime, HYGGE_LEVELS, hyggeScore, hyggeLevel, difficultyParams, progress, save, load,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GardenLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
