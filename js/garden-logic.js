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

  const VERSION = 8;
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
  // BLUEPRINT economy: a generous bonus every time a tile locks correct — the main self-funding
  // faucet alongside the brain games, so Dorthe can always afford to finish the field (no wall).
  const LOCK_BONUS = { sol: 1, vand: 2, froe: 2 };

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
      resources: { sol: 4, vand: 8, froe: 8 },
      questIndex: 0, wildlifeSeen: {}, flowersSeen: {}, builtSeen: {}, picked: 0, timeOfDay: 0, hygge: 0,
      guests: {}, wish: null,
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
  function natureCount(s) { return s.grid.filter((t) => BUILDABLE.includes(t.type)).length; }
  function distinctDecorCount(s) { const seen = {}; let n = 0; for (const t of s.grid) if (DECOR.includes(t.type) && !seen[t.type]) { seen[t.type] = 1; n++; } return n; }
  function bloomColours(s) { return new Set(s.grid.filter((t) => t.type === 'flower' && t.stage === 3 && t.flower).map((t) => t.flower)).size; }

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
      const bonus = { sol: 1 }; earn(s, bonus); // a bloom opening rewards a little sunlight (self-funding)
      return { ok: true, bloomed: true, flower: t.flower, newFlower: newFlower, bonus: bonus, wildlife: refreshWildlife(s) };
    }
    return { ok: true, bloomed: false };
  }
  // harvesting a bloom is the cozy payoff — it returns seeds + water + a little sun,
  // so tending the garden funds itself (no brain-task required).
  function harvest(s, i) {
    const t = s.grid[i];
    if (!t || t.type !== 'flower' || t.stage !== 3) return null;
    if (isTileCorrect(s, i)) return null; // a correct/locked blueprint tile is never harvested away
    const f = t.flower; t.type = 'soil'; t.stage = 0; t.flower = null; s.picked = (s.picked || 0) + 1;
    const reward = { froe: 2, vand: 2, sol: 1 }; earn(s, reward);
    return { flower: f, reward: reward };
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
    if (isTileCorrect(s, from)) return false; // don't let a correct tile be moved away (would un-complete it)
    s.grid[to] = a; s.grid[from] = { type: 'soil', stage: 0, flower: null }; return true;
  }
  // clear a tile back to soil (no refund — wildlife already seen stays seen)
  function remove(s, i) {
    const t = s.grid[i];
    if (!t || t.type === 'soil') return false;
    if (isTileCorrect(s, i)) return false; // a correct/locked blueprint tile stays put
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

  /* ---------- living guests & their little wishes ----------
   * Each animal you've attracted STAYS and, gently, asks for one small thing — always a
   * real forward ask (relative to the moment it's asked), never pre-satisfied, never timed,
   * never a fail. At most ONE wish is active at a time (no chore list). Granting it makes
   * that guest a little happier (a heart) and gives a modest bonus — smaller than a
   * mini-game, so playing games stays the main income. This is the gentle heartbeat that
   * keeps the garden alive after the quest chain ends. See gamedev-kb: systems-and-economy
   * (turn the wildlife "arc" into a loop), motivation-and-ethics (no daily-guilt decay).
   */
  const WISHES = {
    '🦋': { metric: bloomColours, inc: 1, unit: 'farver i flor', say: 'Sommerfuglen drømmer om en ny farve i haven 🌈' },
    '🐝': { metric: bloomCount, inc: 2, unit: 'blomster i flor', say: 'Bien vil summe om endnu flere blomster 🌼' },
    '🐞': { metric: bloomCount, inc: 1, unit: 'blomster i flor', say: 'Mariehønen vil se én blomst mere springe ud 🐞' },
    '🐦': { metric: decorCount, inc: 1, unit: 'pynt i haven', say: 'Fuglen ønsker sig lidt mere pynt at sidde på 🏠' },
    '🐸': { metric: natureCount, inc: 1, unit: 'natur-ting', say: 'Frøen vil have mere natur omkring sig 🌿' },
    '🦔': { metric: distinctDecorCount, inc: 1, unit: 'slags pynt', say: 'Pindsvinet elsker hygge — sæt en ny slags pynt 🍄' },
    '🐿️': { metric: (s) => countType(s, 'tree'), inc: 1, unit: 'træer', say: 'Egernet ønsker sig endnu et træ at klatre i 🌳' },
    '🦆': { metric: bloomCount, inc: 2, unit: 'blomster i flor', say: 'Anden vil se haven blomstre endnu mere 🌸' },
  };
  // make sure every animal we've seen has a guest record (lazy, idempotent)
  function syncGuests(s) {
    s.guests = s.guests || {};
    for (const w in (s.wildlifeSeen || {})) if (WISHES[w] && !s.guests[w]) s.guests[w] = { happy: 0 };
    return s.guests;
  }
  function happyGuestCount(s) { let n = 0; const g = s.guests || {}; for (const k in g) if ((g[k].happy || 0) > 0) n++; return n; }
  // the modest reward for granting a wish — small, varied, with a tiny extra every 3rd heart
  function wishReward(happy) {
    const r = { froe: 1 };
    if (happy % 2 === 0) r.sol = 1; else r.vand = 1;
    const gift = happy % 3 === 0;
    if (gift) r.froe += 1;
    return { reward: r, gift };
  }
  // the live state of the active wish (or null) — progress is clamped at 0 so harvesting can't go negative
  function wishProgress(s) {
    if (!s.wish || !WISHES[s.wish.guest]) return null;
    const w = WISHES[s.wish.guest];
    const have = Math.max(0, w.metric(s) - s.wish.base);
    return { guest: s.wish.guest, say: w.say, unit: w.unit, have: Math.min(have, w.inc), need: w.inc, done: have >= w.inc };
  }
  // pick a new wish if none is active: a random seen guest, anchored to the current state so it's always a real ask
  function assignWish(s, rng) {
    syncGuests(s);
    if (s.wish) return null;
    const seen = Object.keys(s.guests).filter((g) => WISHES[g]);
    if (!seen.length) return null;
    const g = seen[Math.floor((rng || Math.random)() * seen.length)];
    s.wish = { guest: g, base: WISHES[g].metric(s) };
    return g;
  }
  // if the active wish is fulfilled: the guest gets happier, you get the bonus, the wish clears
  function grantWishIfDone(s) {
    const p = wishProgress(s);
    if (!p || !p.done) return null;
    const g = s.wish.guest;
    syncGuests(s);
    s.guests[g] = s.guests[g] || { happy: 0 };
    s.guests[g].happy = (s.guests[g].happy || 0) + 1;
    const happy = s.guests[g].happy;
    const { reward, gift } = wishReward(happy);
    earn(s, reward);
    s.wish = null;
    return { guest: g, happy, reward, gift };
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

  /* ---------- BLUEPRINT mode (the gentle fill-the-field puzzle) ----------
   * Each tile of the current stage has a designated TARGET category. The player fills the
   * whole field with the right thing; a tile that matches its target locks as "correct" and
   * renders lusher. The stage completes only when every tile is correct → the world grows to
   * the next, bigger blueprint. No-fail: wrong placements simply don't lock; locked tiles are
   * never harvestable/removable (so the field can't un-complete). See gamedev-kb:
   * systems-and-economy (taut faucet→sink), difficulty-and-flow (a wall is a bug — keep it
   * affordable), motivation-and-ethics (completable goal, no treadmill).
   *
   * Target categories: 'flower' | 'tree' | 'pond' | 'feeder' | 'beehouse' | 'hedge' | 'bench' | 'stone'.
   * A tile is CORRECT when:
   *   target 'flower'  → tile is a bloomed flower (type==='flower' && stage===3), any species;
   *   target <other>   → tile.type === target.
   */
  const BP_CATEGORIES = ['flower', 'tree', 'pond', 'feeder', 'beehouse', 'hedge', 'bench', 'stone'];
  const BP_STRUCTURES = ['tree', 'pond', 'feeder', 'beehouse', 'hedge', 'bench', 'stone']; // everything that isn't a flower

  // Deterministic, pleasant per-stage layout — a pure function of (col,row,cols,rows). It must
  // look like a *designed* garden at every stage size (3x3 … 8x6):
  //   • trees in the four corners (ly + structure)            • a pond block near the centre
  //   • a hedge frame along the outer ring (with bench/stone/feeder accents on the edges)
  //   • the interior is mostly flowers, with the odd beehouse/feeder among them
  // No species are required — 'flower' just means "a bloom".
  function blueprintTargetFor(c, r, cols, rows) {
    const lastC = cols - 1, lastR = rows - 1;
    const corner = (c === 0 || c === lastC) && (r === 0 || r === lastR);
    const edge = (c === 0 || c === lastC || r === 0 || r === lastR);
    const small = cols < 4 || rows < 4; // only the tiny 3x3 bed: a cozy flower bed, no pond clutter
    // centre pond: a small block in the middle (1 tile, up to ~2x2 on big stages). On the tiny
    // bed there's no room for a pond — the middle stays a flower so the bed reads as a flower bed.
    const cc = (cols - 1) / 2, cr = (rows - 1) / 2;
    const pondR = cols >= 6 ? 1.05 : 0.55;
    const isPond = !small && Math.abs(c - cc) <= pondR && Math.abs(r - cr) <= pondR;
    if (corner) return 'tree';                                  // trees in the four corners, always
    if (isPond) return 'pond';
    if (edge) {
      if (small) {
        // tiny bed: a feeder centred on each of the four edges, the rest is hedge — calm + simple
        const midTop = (r === 0 || r === lastR) && c === Math.round(cc);
        const midSide = (c === 0 || c === lastC) && r === Math.round(cr);
        return (midTop || midSide) ? 'feeder' : 'hedge';
      }
      // bigger stages: a hedge frame with calm accents at predictable spots so it reads as designed
      const mid = (c === Math.floor(cc) && (r === 0 || r === lastR)) || (r === Math.floor(cr) && (c === 0 || c === lastC));
      if (mid && (r === 0 || r === lastR)) return 'bench';     // a bench centred on the top & bottom edges
      if (mid) return 'feeder';                                 // a feeder centred on the left & right edges
      if ((r === 0 || r === lastR) && (c === 1 || c === lastC - 1)) return 'stone'; // a stone by each corner
      return 'hedge';
    }
    // interior: mostly flowers, with a beehouse on a sparse, deterministic lattice
    if (!small && (c + r) % 5 === 0 && (c * 2 + r) % 3 === 0) return 'beehouse';
    return 'flower';
  }
  function blueprintTarget(s, i) {
    const cols = s.cols, c = i % cols, r = (i / cols) | 0;
    return blueprintTargetFor(c, r, cols, s.rows);
  }
  // is this tile currently matching its blueprint target?
  function isTileCorrect(s, i) {
    const t = s.grid[i]; if (!t) return false;
    const target = blueprintTarget(s, i);
    if (target === 'flower') return t.type === 'flower' && t.stage === 3;
    return t.type === target;
  }
  function blueprintProgress(s) {
    let done = 0; const total = s.grid.length;
    for (let i = 0; i < total; i++) if (isTileCorrect(s, i)) done++;
    return { done, total };
  }
  function blueprintComplete(s) { const p = blueprintProgress(s); return p.total > 0 && p.done === p.total; }
  // first not-yet-correct tile (for gentle "what's left" guidance), or -1 when complete
  function firstUnsolved(s) { for (let i = 0; i < s.grid.length; i++) if (!isTileCorrect(s, i)) return i; return -1; }

  // After any placement action, call this for the affected tile: if it's now correct and wasn't
  // already credited, award the lock bonus ONCE and mark it locked. Returns the bonus or null.
  // (The `locked` flag is just bookkeeping so the bonus can't be farmed by re-placing.)
  function tryLock(s, i) {
    const t = s.grid[i]; if (!t) return null;
    if (!isTileCorrect(s, i)) { if (t.locked) t.locked = false; return null; }
    if (t.locked) return null;
    t.locked = true;
    const bonus = Object.assign({}, LOCK_BONUS);
    earn(s, bonus);
    return bonus;
  }

  // When a stage is complete, grow to the next bigger blueprint (and bump the gentle difficulty
  // of the brain games). Returns {grew, last} — `last` true when the FINAL stage was completed.
  function blueprintLevelUp(s) {
    if (!blueprintComplete(s)) return { grew: false, last: false };
    if (s.stage >= STAGES.length - 1) return { grew: false, last: true }; // final stage done → drømmehave
    const from = s.stage, to = s.stage + 1, nw = STAGES[to];
    // Grow to a FRESH, bigger field: the completed garden is the reward; the next, larger
    // blueprint is the next puzzle. (A clean empty bed avoids leftover mismatched tiles and
    // keeps the "one clear task" feel — see accessibility-older-adults.)
    s.grid = makeGrid(nw.cols * nw.rows);
    s.cols = nw.cols; s.rows = nw.rows; s.stage = to;
    s.chapter = 1 + to; // brain games get gently harder as the field grows
    return { grew: true, last: false, from, to, stage: nw };
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
    // a garden full of happy guests is more charming (capped so endless wishes can't runaway-inflate it)
    return bloomCount(s) + nature + placedDecor * 2 + distinctDecor * 2 + colours + wildlife + happyGuestCount(s);
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
      // BLUEPRINT redesign: the game changed shape, so any pre-v8 save starts a fresh blueprint
      // cleanly (never crash). Only the current version is accepted/round-tripped.
      if (!s || !Array.isArray(s.grid) || s.v !== VERSION) return newState();
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
      // guests & the single active wish
      if (!s.guests || typeof s.guests !== 'object') s.guests = {};
      for (const k in s.guests) { const gg = s.guests[k]; if (!gg || typeof gg.happy !== 'number' || gg.happy < 0) s.guests[k] = { happy: 0 }; }
      syncGuests(s); // any animal already seen becomes a guest (migrates v6 saves cleanly)
      if (!s.wish || typeof s.wish.guest !== 'string' || !WISHES[s.wish.guest] || typeof s.wish.base !== 'number' || s.wish.base < 0) s.wish = null;
      s.v = VERSION; // stamp up to the current version after migrating
      return s;
    } catch { return newState(); }
  }

  const api = {
    VERSION, STAGES, TIMES, SEASONS, SEASON_FOR_STAGE, FLOWERS, RARE, FLOWER_NAMES, FLOWER_FACTS,
    WILDLIFE, BUILDABLE, BUILD_COST, BUILD_EMOJI, DECORATIONS,
    DECOR, DECOR_COST, DECOR_EMOJI, PLANT_COST, WATER_COST, LOCK_BONUS, QUESTS, STORY, FACTS, CHEERS, WISHES,
    BP_CATEGORIES, BP_STRUCTURES, blueprintTargetFor, blueprintTarget, isTileCorrect,
    blueprintProgress, blueprintComplete, firstUnsolved, tryLock, blueprintLevelUp,
    newState, canAfford, spend, earn, plant, water, harvest, build, place, move, remove, refreshWildlife,
    bloomCount, hasType, countType, currentQuest, tryAdvance, stageForQuest, currentStage, growTo, maybeGrow,
    syncGuests, happyGuestCount, wishProgress, assignWish, grantWishIfDone,
    currentSeason, advanceTime, HYGGE_LEVELS, hyggeScore, hyggeLevel, difficultyParams, progress, save, load,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GardenLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
