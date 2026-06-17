/* ===== Dorthes have — garden-world game (UI host) ===== */

(function () {
  const L = GardenLogic;
  const KEY = 'bg_garden';
  const NAME = {
    tree: 'Træ', pond: 'Dam', feeder: 'Fuglebad', beehouse: 'Bistade',
    stone: 'Sten', mushroom: 'Svamp', hedge: 'Hæk', path: 'Sti', lantern: 'Lanterne',
    bench: 'Bænk', birdhouse: 'Fuglehus',
  };
  const reduce = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const mEvent = (n) => { if (typeof GardenMusic !== 'undefined' && GardenMusic.event) GardenMusic.event(n); };
  const EMOJI_OF = (type) => L.BUILD_EMOJI[type] || L.DECOR_EMOJI[type] || '';
  const COST_OF = (type) => L.BUILD_COST[type] || L.DECOR_COST[type];
  const RES_ICON = { sol: '☀️', vand: '💧', froe: '🌱' };
  const GUIDE = { emoji: '🐕', name: 'Amigo' };
  // Custom vector portrait of Amigo (Mathias's family dog) — a scruffy warm-brown
  // wire-haired terrier with a beard, bushy brows and floppy ears, drawn from his photo.
  const AMIGO_SVG = '<svg viewBox="0 0 64 64" class="gd-amigo" role="img" aria-label="Amigo">' +
    '<g stroke="#3c2f22" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">' +
    // floppy ears (darker brown), behind the head
    '<path d="M17 23 C8 22 6 37 15 45 C20 41 22 31 22 26 Z" fill="#8a5a2e"/>' +
    '<path d="M47 23 C56 22 58 37 49 45 C44 41 42 31 42 26 Z" fill="#8a5a2e"/>' +
    // head — warm tan, slightly shaggy silhouette
    '<path d="M13 31 C13 18 21 12 32 12 C43 12 51 18 51 31 C51 43 44 51 32 53 C20 51 13 43 13 31 Z" fill="#c08f4c"/>' +
    // scruffy fur tufts on top of the head
    '<path d="M22 14 l-3 -7 l5 3 l3 -7 l3 7 l4 -5 l2 7 l4 -4 l1 6 Z" fill="#cd9c56"/>' +
    // bushy eyebrows
    '<path d="M21 27 q4 -4 9 -1" fill="none"/>' +
    '<path d="M43 27 q-4 -4 -9 -1" fill="none"/>' +
    // shaggy beard / muzzle (lighter), with side fur
    '<path d="M22 35 C21 47 27 55 32 55 C37 55 43 47 42 35 C39 41 25 41 22 35 Z" fill="#e2c281"/>' +
    '<path d="M24 50 l-3 5 l4 -2 l2 4 l3 -4 l3 4 l2 -4 l4 2 l-3 -5 Z" fill="#e7ca90"/>' +
    '</g>' +
    // eyes (friendly, with a little shine)
    '<ellipse cx="26" cy="31" rx="2.7" ry="3" fill="#241c16"/>' +
    '<ellipse cx="38" cy="31" rx="2.7" ry="3" fill="#241c16"/>' +
    '<circle cx="27.1" cy="30" r="0.9" fill="#fff"/><circle cx="39.1" cy="30" r="0.9" fill="#fff"/>' +
    // nose + gentle smile
    '<ellipse cx="32" cy="39" rx="3.3" ry="2.5" fill="#241c16"/>' +
    '<path d="M32 41.5 q-3.5 3 -6.5 0.5 M32 41.5 q3.5 3 6.5 0.5" stroke="#3c2f22" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
    '</svg>';
  const TASK_REWARDS = [{ vand: 2, sol: 1 }, { froe: 2 }, { sol: 2, vand: 1 }, { vand: 3 }, { froe: 1, sol: 1, vand: 1 }];

  let S = null, stopped = false, timers = [], pendingBuild = null, pendingMove = null, musicStarted = false;

  const gridEl = document.getElementById('garden-grid');
  const stageEl = document.getElementById('garden-stage');
  const hudEl = document.getElementById('garden-hud');
  const questEl = document.getElementById('garden-quest');
  const wishEl = document.getElementById('garden-wish');
  const finaleEl = document.getElementById('garden-finale');
  const hintEl = document.getElementById('garden-hint');
  const overlayEl = document.getElementById('garden-overlay');
  const musicBtn = document.getElementById('garden-music-btn');
  const guideEl = document.getElementById('garden-guide');
  const worldEl = document.querySelector('#screen-garden .gd-world');

  const later = (fn, ms) => { const id = setTimeout(() => { if (!stopped) fn(); }, Math.max(0, ms)); timers.push(id); return id; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  const save = () => { try { localStorage.setItem(KEY, L.save(S)); } catch {} };
  const setHint = (t) => { hintEl.textContent = t; };

  function startMusicOnce() { if (!musicStarted && typeof GardenMusic !== 'undefined') { musicStarted = true; GardenMusic.start(); updateMusicBtn(); } }
  function updateMusicBtn() { if (musicBtn && typeof GardenMusic !== 'undefined') musicBtn.textContent = GardenMusic.isMuted() ? '🔇' : '🎵'; }

  function toast(text) {
    const el = document.createElement('div');
    el.className = 'gd-toast'; el.textContent = text;
    document.getElementById('screen-garden').appendChild(el);
    later(() => el.remove(), 1700);
  }
  function pop(el) { if (!el) return; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  function wiggle(el) { if (!el) return; el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle'); }
  function sparkle(tileEl, n) {
    if (reduce() || !tileEl) return;
    for (let k = 0; k < (n || 6); k++) {
      const s = document.createElement('div'); s.className = 'gd-spark';
      const ang = Math.random() * Math.PI * 2, dist = 14 + Math.random() * 18;
      s.style.left = '50%'; s.style.top = '44%';
      s.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
      s.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 8) + 'px');
      tileEl.appendChild(s); later(() => s.remove(), 720);
    }
  }
  function popNumber(text, x, y) {
    if (reduce()) return;
    const el = document.createElement('div'); el.className = 'gd-pop-num'; el.textContent = text;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    document.body.appendChild(el); later(() => el.remove(), 1100);
  }
  function popAtHud(text) { const r = hudEl.getBoundingClientRect(); popNumber(text, r.left + r.width / 2 - 18, r.top + r.height / 2); }
  function pickCheer() { return L.CHEERS[Math.floor(Math.random() * L.CHEERS.length)]; }
  function updateScene() {
    if (typeof GardenMusic !== 'undefined' && GardenMusic.setScene) {
      GardenMusic.setScene({ pond: L.hasType(S, 'pond'), birds: L.hasType(S, 'tree') || L.hasType(S, 'feeder') || L.hasType(S, 'birdhouse'), bees: L.hasType(S, 'beehouse') });
    }
  }
  function discoverFlower(f, cell) {
    const name = L.FLOWER_NAMES[f] || 'blomst';
    L.earn(S, { froe: 2 }); save(); renderHUD();
    if (cell) sparkle(cell, 6);
    renderGuide('Sikke en flot blomst — en ' + name + '! 🌸');
    later(() => { if (!stopped) renderGuide(); }, 2800);
    later(() => { toast('🌸 Ny blomst opdaget: ' + name + '!  +2🌱'); popAtHud('+2🌱'); }, 550);
  }

  /* ---------- render ---------- */
  function ensureLayers() {
    if (!worldEl) return {};
    // distant scenery container (parallax hills + trees) — rebuilt per stage so the world
    // visibly grows richer and comes alive as the garden advances
    if (!worldEl.querySelector('.gd-scenery')) {
      const sc = document.createElement('div'); sc.className = 'gd-scenery';
      worldEl.insertBefore(sc, worldEl.firstChild);
    }
    if (!worldEl.querySelector('.gd-ambient')) { const a = document.createElement('div'); a.className = 'gd-ambient'; worldEl.appendChild(a); }
    let weather = worldEl.querySelector('.gd-weather');
    if (!worldEl.querySelector('.gd-daylight')) { const d = document.createElement('div'); d.className = 'gd-daylight'; worldEl.appendChild(d); }
    if (!weather) { weather = document.createElement('div'); weather.className = 'gd-weather'; worldEl.appendChild(weather); }
    return { weather, ambient: worldEl.querySelector('.gd-ambient') };
  }
  // a soft layered tree for the distant scenery
  function treeSVG(x, y, s, col) {
    const c = col || '#6fae5e';
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<rect x="-3" y="-2" width="6" height="16" rx="2" fill="#7a5733"/>' +
      '<ellipse cx="0" cy="-14" rx="20" ry="18" fill="' + c + '"/>' +
      '<ellipse cx="-9" cy="-8" rx="13" ry="12" fill="#7dbb69"/>' +
      '<ellipse cx="9" cy="-9" rx="12" ry="12" fill="#84c270"/>' +
      '</g>';
  }
  // The scene gets richer each stage: bare hills → trees → meadow grasses + a stream →
  // a dense wood. The horizon literally fills with life as the garden grows (Terra Nil swell).
  function buildScenery(stageId) {
    const STAGE_DENSITY = { bed: 2, garden: 4, meadow: 6, forest: 9, wild: 13 };
    const n = STAGE_DENSITY[stageId] || 3;
    let far = '', near = '';
    for (let k = 0; k < n; k++) {
      const fx = 20 + (k / Math.max(1, n - 1)) * 440 + (k % 2 ? 14 : -10);
      far += treeSVG(fx, 150 + (k % 3) * 6, 0.5 + (k % 3) * 0.12);
      if (k < Math.ceil(n / 2)) near += treeSVG(30 + (k / Math.max(1, Math.ceil(n / 2) - 1 || 1)) * 420, 206 + (k % 2) * 6, 0.9 + (k % 2) * 0.18);
    }
    // a stream appears from the meadow stage onward; the wood deepens at the end
    const stream = (stageId === 'meadow' || stageId === 'forest' || stageId === 'wild')
      ? '<path d="M-20 230 Q120 218 240 232 T500 228 L500 250 Q240 256 -20 252 Z" fill="#8fd0ee" opacity="0.7"/>' +
        '<path d="M-20 234 Q120 224 240 236 T500 232" fill="none" stroke="#cdeeff" stroke-width="2" opacity="0.7"/>' : '';
    const hillFar = stageId === 'forest' || stageId === 'wild' ? '#86bd75' : '#b6dca0';
    return '<svg class="gd-scenery-svg" viewBox="0 0 480 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
      '<path class="gd-hill gd-hill-far" style="fill:' + hillFar + '" d="M0 168 Q120 120 240 156 T480 150 V300 H0 Z"/>' +
      '<g class="gd-trees-far">' + far + '</g>' +
      '<path class="gd-hill gd-hill-near" d="M0 206 Q140 168 280 200 T480 196 V300 H0 Z"/>' + stream +
      '<g class="gd-trees-near">' + near + '</g>' +
      '</svg>';
  }
  function applyStageTheme() {
    // The scene (sky, hills, day/night tint, particles) is owned by the PixiJS canvas now.
    if (window.GardenIso) GardenIso.render(S, { pendingBuild, pendingMove });
    if (worldEl) worldEl.className = 'gd-world time-' + (L.TIMES[S.timeOfDay | 0] || 'day') + ' season-' + (L.SEASONS[L.currentSeason(S)] || 'spring');
    return; // old DOM-scenery path below is superseded by the canvas
    if (!worldEl) return;
    const timeName = L.TIMES[S.timeOfDay | 0] || 'day';
    const seasonName = L.SEASONS[L.currentSeason(S)] || 'spring';
    const stageId = L.currentStage(S).id;
    worldEl.className = 'gd-world stage-' + stageId + ' time-' + timeName + ' season-' + seasonName;
    const { weather } = ensureLayers();
    // rebuild the distant scenery for this stage (richer horizon as the world grows)
    const scenery = worldEl.querySelector('.gd-scenery');
    if (scenery && scenery.dataset.stage !== stageId) { scenery.innerHTML = buildScenery(stageId); scenery.dataset.stage = stageId; }
    // drifting pollen motes (ambient)
    worldEl.querySelectorAll('.gd-mote').forEach((m) => m.remove());
    if (!reduce()) for (let k = 0; k < 5; k++) {
      const m = document.createElement('div'); m.className = 'gd-mote';
      m.style.left = (10 + Math.random() * 78) + '%';
      m.style.animationDuration = (7 + Math.random() * 6) + 's';
      m.style.animationDelay = (-Math.random() * 8) + 's';
      worldEl.appendChild(m);
    }
    // scene-wide ambient life: butterflies drift across the WHOLE world once it's blooming
    const amb = worldEl.querySelector('.gd-ambient');
    if (amb) {
      amb.innerHTML = '';
      const blooms = S.grid.filter((t) => t.type === 'flower').length;
      const n = reduce() ? 0 : Math.min(3, Math.floor(blooms / 2));
      const cols = ['#ffb3d1', '#ffd166', '#a6e3ff'];
      for (let k = 0; k < n; k++) {
        const b = document.createElement('div'); b.className = 'gd-butterfly';
        b.style.top = (30 + Math.random() * 50) + '%';
        b.style.setProperty('--bf', cols[k % cols.length]);
        b.style.animationDuration = (13 + Math.random() * 8) + 's';
        b.style.animationDelay = (-Math.random() * 12) + 's';
        b.style.setProperty('--rise', (-18 - Math.random() * 26) + 'px');
        b.innerHTML = '<svg viewBox="0 0 24 20" width="22" height="18"><g class="gd-bf-wings">' +
          '<path d="M12 10 C6 2 0 4 2 10 C0 16 7 18 12 11 Z" fill="var(--bf)"/>' +
          '<path d="M12 10 C18 2 24 4 22 10 C24 16 17 18 12 11 Z" fill="var(--bf)" opacity="0.92"/>' +
          '<ellipse cx="12" cy="10" rx="1.4" ry="4" fill="#5b4636"/></g></svg>';
        amb.appendChild(b);
      }
      // birds glide across the sky once there are trees/feeders to live in
      if (!reduce() && (L.hasType(S, 'tree') || L.hasType(S, 'feeder') || L.hasType(S, 'birdhouse'))) {
        for (let k = 0; k < 2; k++) {
          const bird = document.createElement('div'); bird.className = 'gd-bird';
          bird.style.top = (8 + Math.random() * 22) + '%';
          bird.style.animationDuration = (10 + Math.random() * 6) + 's';
          bird.style.animationDelay = (-Math.random() * 10) + 's';
          bird.innerHTML = '<svg viewBox="0 0 28 14" width="24" height="12"><path class="gd-bird-w" d="M2 9 Q8 2 14 8 Q20 2 26 9" fill="none" stroke="#5b5b6e" stroke-width="2.2" stroke-linecap="round"/></svg>';
          amb.appendChild(bird);
        }
      }
      // a duck paddles along once there's a pond
      if (!reduce() && L.hasType(S, 'pond')) {
        const duck = document.createElement('div'); duck.className = 'gd-duck';
        duck.style.animationDuration = '22s'; duck.style.animationDelay = '-4s';
        duck.innerHTML = '<svg viewBox="0 0 30 20" width="26" height="18"><ellipse cx="15" cy="13" rx="11" ry="6" fill="#f4f0e6"/><circle cx="24" cy="8" r="4.2" fill="#f4f0e6"/><path d="M27 8 l5 1 -5 1.6 Z" fill="#e7a33c"/><circle cx="25" cy="7" r="0.9" fill="#3a3a3a"/></svg>';
        amb.appendChild(duck);
      }
    }
    // season weather: cherry petals in spring, falling leaves in autumn
    if (weather) {
      weather.innerHTML = '';
      const fall = seasonName === 'spring' ? '🌸' : seasonName === 'autumn' ? '🍂' : null;
      if (fall && !reduce()) for (let k = 0; k < 5; k++) {
        const f = document.createElement('div'); f.className = 'gd-fall'; f.textContent = fall;
        f.style.left = (Math.random() * 92) + '%';
        f.style.animationDuration = (8 + Math.random() * 6) + 's';
        f.style.animationDelay = (-Math.random() * 12) + 's';
        weather.appendChild(f);
      }
    }
  }
  function renderHUD() {
    const r = S.resources, bp = L.blueprintProgress(S);
    hudEl.innerHTML =
      '<span>☀️ <b>' + r.sol + '</b></span><span>💧 <b>' + r.vand + '</b></span><span>🌱 <b>' + r.froe + '</b></span>' +
      '<span class="gd-prog">🌿 ' + L.currentStage(S).name + ' · ✓ ' + bp.done + '/' + bp.total + '</span>';
  }
  // BLUEPRINT progress line ("X/Y felter klar") with a little fill bar — replaces the old quest line
  function renderProgress() {
    if (!questEl) return;
    const bp = L.blueprintProgress(S);
    const pct = bp.total ? Math.round((bp.done / bp.total) * 100) : 0;
    const done = bp.done >= bp.total;
    questEl.innerHTML = '<div class="gd-bp">' +
      '<div class="gd-bp-top"><span>🗺️ <b>' + L.currentStage(S).name + '</b></span>' +
      '<span class="gd-bp-count">' + (done ? '🎉 alle felter klar!' : bp.done + '/' + bp.total + ' felter klar') + '</span></div>' +
      '<div class="gd-bp-bar"><div class="gd-bp-fill" style="width:' + Math.max(4, pct) + '%"></div></div></div>';
  }
  function renderQuest() { renderProgress(); }
  // a living guest perched in the world, tied to the active wish (gentle bob; static if reduced-motion)
  function renderWorldGuest(guest) {
    if (!worldEl) return;
    let el = worldEl.querySelector('.gd-guest');
    if (!guest) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.className = 'gd-guest'; worldEl.appendChild(el); }
    el.textContent = guest;
  }
  // Wishes are retired in BLUEPRINT mode — keep the function as a no-op so nothing breaks.
  function renderWish() {
    renderWorldGuest(null);
    if (wishEl) { wishEl.classList.remove('show'); wishEl.innerHTML = ''; }
  }

  // Amigo's gentle guidance: what the field still needs, or warm praise when it's done.
  function currentStory() {
    const i = L.firstUnsolved(S);
    if (i < 0) {
      if (S.stage >= L.STAGES.length - 1) return 'Din drømmehave er fuldendt! 💚 Nyd den i ro og mag.';
      return 'Alle felter er klar — haven vokser nu til noget endnu større! 🌱';
    }
    const target = L.blueprintTarget(S, i);
    return 'Vi følger havetegningen sammen 🗺️ — næste felt ønsker sig ' + TARGET_NAME[target] + ' ' + (TARGET_EMOJI[target] || '') + '. Tryk på et felt for at gå i gang.';
  }
  function renderGuide(text) {
    if (!guideEl) return;
    guideEl.innerHTML = '<span class="gd-guide-face">' + AMIGO_SVG + '</span>' +
      '<span class="gd-guide-say"><b>' + GUIDE.name + ':</b> ' + (text || currentStory()) + '</span>';
  }
  // The scene is now a 2.5D isometric PixiJS canvas (garden-iso.js); it renders S.grid and
  // calls onTile(i) on tap. We keep the same logic/HUD/menus — only the visuals changed.
  function renderGrid() {
    if (window.GardenIso) GardenIso.render(S, { pendingBuild, pendingMove });
  }
  function renderHygge() {
    const el = document.getElementById('garden-hygge'); if (!el) return;
    const score = L.hyggeScore(S), lv = L.hyggeLevel(score), levels = L.HYGGE_LEVELS;
    const cur = levels[lv], next = levels[lv + 1];
    const pct = next ? Math.max(6, Math.min(100, Math.round((score - cur.min) / (next.min - cur.min) * 100))) : 100;
    el.innerHTML = '<div class="gd-hygge-top"><span>✨ ' + cur.name + '</span>' +
      '<span class="gd-hygge-next">' + (next ? 'næste: ' + next.name : 'fuld hygge! 💚') + '</span></div>' +
      '<div class="gd-hygge-bar"><div class="gd-hygge-fill" style="width:' + pct + '%"></div></div>';
  }
  // celebrate when the garden becomes more charming than ever before
  function checkHygge() {
    const lv = L.hyggeLevel(L.hyggeScore(S));
    if (lv > (S.hygge || 0)) {
      S.hygge = lv; L.earn(S, { sol: 2, vand: 2, froe: 2 }); save(); renderHUD(); renderHygge();
      const name = L.HYGGE_LEVELS[lv].name;
      launchConfetti(1600); mEvent('grow');
      later(() => { toast('✨ Din have er nu en ' + name + '!'); popAtHud('+2☀️ +2💧 +2🌱'); }, 300);
      renderGuide('Sikke en ' + name.toLowerCase() + ' du har skabt! 💚');
      later(() => { if (!stopped) renderGuide(); }, 3200);
    }
  }
  function renderAll() { applyStageTheme(); renderHUD(); renderProgress(); renderWish(); renderFinale(); renderGuide(); hideHygge(); renderGrid(); }
  // hygge/charm bar is retired in BLUEPRINT mode — clear its element so it takes no space
  function hideHygge() { const el = document.getElementById('garden-hygge'); if (el) el.innerHTML = ''; }

  /* ---------- actions ---------- */
  // After any placement/bloom: lock any newly-correct tiles (pay the bonus, celebrate), update
  // progress, and if the whole field is correct → celebrate + grow to the next blueprint.
  function afterAction(hint) {
    save(); renderHUD(); renderGrid();
    if (hint) setHint(hint);
    lockNewlyCorrect();
    renderProgress();
    checkBlueprintComplete();
    renderFinale();
  }
  // scan for tiles that just became correct, award the lock bonus once each, and juice them
  function lockNewlyCorrect() {
    let any = false;
    for (let i = 0; i < S.grid.length; i++) {
      const bonus = L.tryLock(S, i);
      if (!bonus) continue;
      any = true;
      mEvent('quest');
      playTone(587.33, 130, 'sine'); later(() => playTone(783.99, 170, 'sine'), 110);
      const txt = Object.keys(bonus).map((k) => '+' + bonus[k] + RES_ICON[k]).join(' ');
      const cell = gridEl.children && gridEl.children[i]; if (cell) { sparkle(cell, 6); pop(cell); }
      later(() => { toast('✓ Felt klar! ' + txt); popAtHud(txt); }, 200);
    }
    if (any) { save(); renderHUD(); renderGrid(); }
  }

  // F1 — ONE reusable "region complete" celebration: a warm, FELT mini-arrival —
  // a consonant arpeggio + the music's grow flourish + a gentle in-scene burst of
  // petals/butterflies with a soft camera breath + confetti + an Amigo line.
  // Every region unlock fires the small version; the HUGE finale will reuse it at
  // full volume via { big:true } (the same beat, scaled up). See docs/garden-finale-plan.md.
  // Motion (scene burst + camera breath) is skipped under reduced-motion; the warm
  // sound + Amigo line still play, so the moment never feels harsh or empty.
  function celebrateRegion(opts) {
    opts = opts || {};
    const big = !!opts.big;
    const notes = big
      ? [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]
      : [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, k) => later(() => { if (!stopped) playTone(f, big ? 280 : 230, 'sine'); }, k * (big ? 150 : 130)));
    mEvent('grow');
    launchConfetti(big ? 3600 : 2200);
    if (!reduce() && window.GardenIso && GardenIso.celebrate) GardenIso.celebrate({ big: big });
    if (opts.guide) renderGuide(opts.guide);
  }

  // F2 — the finale gate UI. On the FINAL region show a warm "garden waking up" meter (endowed
  // fill, never empty); once the region is full it swaps to a softly-glowing OPT-IN invitation.
  // No auto-fire, no timer — the huge finale only plays when Dorthe chooses it.
  function renderFinale() {
    if (!finaleEl) return;
    const f = L.finaleState(S);
    if (!f.onFinalRegion || f.seen) { finaleEl.innerHTML = ''; return; }
    if (f.ready) {
      finaleEl.innerHTML =
        '<div class="gd-finale gd-finale-ready">' +
          '<div class="gd-finale-meter"><div class="gd-finale-fill" style="width:100%"></div></div>' +
          '<button type="button" class="btn btn-primary gd-finale-invite" id="garden-finale-btn">🌸 Lad haven blomstre helt op</button>' +
          '<div class="gd-finale-sub">Haven er fuld af liv — tryk når du er klar. 💚</div>' +
        '</div>';
      const btn = document.getElementById('garden-finale-btn');
      if (btn) btn.onclick = fireFinale; // assignment is idempotent — never stacks listeners
    } else {
      finaleEl.innerHTML =
        '<div class="gd-finale">' +
          '<div class="gd-finale-top"><span>🌅 Haven vågner</span><span class="gd-finale-pct">livet vender tilbage…</span></div>' +
          '<div class="gd-finale-meter"><div class="gd-finale-fill" style="width:' + Math.max(6, f.fill) + '%"></div></div>' +
        '</div>';
    }
  }

  // Fire the chosen finale. F2 reuses the big celebration; F3 will expand this into the full
  // "release the world" sequence. Opt-in only, and it sets the saved flag so it plays once.
  function fireFinale() {
    if (stopped || S.finaleSeen) return;
    S.finaleSeen = true; save();
    celebrateRegion({ big: true, guide: 'Du har skabt din drømmehave! 💚 Tak fordi du passede den så smukt.' });
    setHint('🎉 Din drømmehave blomstrer — haven er din nu. Nyd den i ro og mag. 💚');
    renderFinale();   // invitation → cleared (now seen)
    renderProgress();
  }

  // BLUEPRINT: when the whole field is correct → celebrate and grow to the next, bigger blueprint.
  // On the final stage → arm the opt-in finale invitation (F2); free play continues; nothing punishes.
  let celebrating = false;
  function checkBlueprintComplete() {
    if (celebrating || !L.blueprintComplete(S)) return;
    celebrating = true;
    save();
    const lu = L.blueprintLevelUp(S);
    if (lu.grew) {
      // a region mini-finale — the dress rehearsal for the big finale (F1)
      celebrateRegion({ guide: 'Haven er færdig — sikke smukt! 🌸 Nu vokser den til ' + lu.stage.name + '.' });
      later(() => {
        if (stopped) return;
        save(); renderAll(); renderProgress();
        toast('🌱→🌳 Haven vokser til ' + lu.stage.name + '!');
        setHint('Ny, større have: ' + lu.stage.name + '. Fyld den efter tegningen. 🌿');
        celebrating = false;
      }, 1900);
    } else {
      // final region complete → DON'T auto-fire. Surface the opt-in finale invitation (F2);
      // the huge finale plays only when Dorthe taps "Lad haven blomstre helt op".
      celebrating = false;
      save(); renderProgress(); renderFinale();
      if (!S.finaleSeen) setHint('Haven er fuld af liv! 🌸 Den er klar til at blomstre helt op — når du er klar.');
    }
  }

  // grant a fulfilled wish (a happy moment), then hand the garden its next gentle ask
  function checkWishes() {
    const g = L.grantWishIfDone(S);
    if (g) {
      save(); renderHUD(); renderHygge();
      mEvent('quest');
      playTone(587.33, 150, 'sine'); later(() => playTone(783.99, 190, 'sine'), 120);
      launchConfetti(900);
      const rewardTxt = Object.keys(g.reward).map((k) => '+' + g.reward[k] + RES_ICON[k]).join('  ');
      later(() => { toast(g.guest + ' er glad nu! 💛  ' + rewardTxt); popAtHud(rewardTxt); }, 250);
      renderGuide(g.guest + ' er så glad for haven nu! 💛');
      later(() => { if (!stopped) renderGuide(); }, 2900);
      if (g.gift) later(() => toast('💛 ' + g.guest + ' har fået dig rigtig kær!'), 950);
    }
    const assigned = L.assignWish(S, Math.random);
    save();
    renderWish();
    // a freshly arrived ask gets a soft pulse; Amigo only speaks it when nothing else is talking
    if (assigned && wishEl) { wishEl.classList.remove('gd-wish-pulse'); void wishEl.offsetWidth; wishEl.classList.add('gd-wish-pulse'); }
  }

  // pretty icon string for a resource reward, e.g. {froe:2,vand:2} -> "🌱🌱 💧💧"
  function rewardText(r) {
    const ic = { sol: '☀️', vand: '💧', froe: '🌱' };
    return Object.keys(r).map((k) => ic[k].repeat(r[k])).join(' ');
  }
  // The Danish name of a blueprint target category (for gentle guidance)
  const TARGET_NAME = {
    flower: 'en blomst', tree: 'et træ', pond: 'en dam', feeder: 'et fuglebad',
    beehouse: 'et bistade', hedge: 'en hæk', bench: 'en bænk', stone: 'en sten',
  };
  const TARGET_EMOJI = { flower: '🌷', tree: '🌳', pond: '🪷', feeder: '🛁', beehouse: '🐝', hedge: '🌿', bench: '🪑', stone: '🪨' };

  // BLUEPRINT core: tapping a tile does the RIGHT thing for that tile's target. Correct/locked
  // tiles are protected (a warm "perfekt"); empty/wrong tiles open the right placement action.
  function onTile(i) {
    if (stopped) return;
    startMusicOnce();
    const t = S.grid[i];
    const target = L.blueprintTarget(S, i);

    // free-play placement (the Byg & pynt menu) — only on tiles that aren't locked-correct
    if (pendingBuild) {
      if (L.isTileCorrect(S, i)) { setHint('Det felt er allerede perfekt — vælg et tomt felt. 💚'); return; }
      if (t.type === 'soil') {
        const r = L.place(S, pendingBuild, i);
        if (r.ok) { playTone(330, 140, 'sine'); const b = pendingBuild; pendingBuild = null; afterAction('Du satte ' + (NAME[b] || '').toLowerCase() + '. 🌿'); mEvent('build'); updateScene(); celebrateWildlife(r.wildlife); }
        else { pendingBuild = null; setHint('Lidt ressourcer mangler — spil en Hjernebænk-leg. 🧠'); renderGrid(); }
      } else { pendingBuild = null; setHint('Vælg et tomt felt at sætte det på.'); renderGrid(); }
      return;
    }

    // already correct & locked → never destructive, just a little praise
    if (L.isTileCorrect(S, i)) {
      playTone(659.25, 90, 'sine');
      const cell = gridEl.children && gridEl.children[i]; if (cell) pop(cell);
      setHint('✓ Perfekt — ' + TARGET_NAME[target] + ' præcis som tegningen ønsker. 💚');
      return;
    }

    if (target === 'flower') {
      // plant + water flow toward a bloom (the existing mechanic)
      if (t.type === 'soil') {
        if (!L.canAfford(S, L.PLANT_COST)) { setHint('Lidt frø mangler 🌱 — spil en Hjernebænk-leg for flere. 🧠'); return; }
        if (Object.keys(S.flowersSeen || {}).length >= 2) openSeedPicker(i);
        else plantSeed(i, null);
        return;
      }
      if (t.type === 'flower' && t.stage < 3) {
        const r = L.water(S, i, Math.random);
        if (!r.ok) { setHint('Lidt vand mangler 💧 — spil en Hjernebænk-leg for mere. 🧠'); return; }
        playTone([329.63, 392.00, 523.25][Math.min(t.stage - 1, 2)], 150, 'sine');
        if (r.bloomed) {
          playTone(659.25, 200, 'sine'); later(() => playTone(783.99, 240, 'sine'), 130);
          afterAction('Den sprang ud! ' + r.flower + ' 🌸');
          mEvent('bloom');
          if (r.newFlower) discoverFlower(r.flower, null);
          celebrateWildlife(r.wildlife);
        } else {
          afterAction('Godt — den vokser! 💧 Vand igen, så springer den ud.');
        }
        return;
      }
      // a flower target but the tile holds the wrong thing (shouldn't normally happen) — offer to clear it
      wiggle(gridEl.children && gridEl.children[i]); openWrongTileMenu(i, target);
      return;
    }

    // structure/decor target → auto-place exactly the wanted thing (no menu hunting)
    if (t.type === 'soil') {
      if (!L.canAfford(S, COST_OF(target))) {
        setHint('Lidt ressourcer mangler til ' + TARGET_NAME[target] + ' — spil en Hjernebænk-leg. 🧠'); return;
      }
      const r = L.place(S, target, i);
      if (r.ok) {
        playTone(330, 140, 'sine');
        afterAction('Du satte ' + TARGET_NAME[target] + '! ' + (TARGET_EMOJI[target] || '🌿'));
        mEvent('build'); updateScene();
        if (r.newBuild) later(() => toast('✨ Ny ting i haven: ' + (NAME[target] || '') + '!'), 450);
        celebrateWildlife(r.wildlife);
      }
      return;
    }
    // tile holds the wrong thing for a structure target → let her swap it out
    wiggle(gridEl.children && gridEl.children[i]); openWrongTileMenu(i, target);
  }

  // gentle menu when a tile holds the wrong thing: clear it so the right thing can go in
  function openWrongTileMenu(i, target) {
    const t = S.grid[i];
    overlayEl.innerHTML = '<div class="gd-task"><h3>' + (TARGET_EMOJI[target] || '🌿') + ' Dette felt ønsker ' + TARGET_NAME[target] + '</h3>' +
      '<p>Her står ' + (NAME[t.type] || 'noget andet') + '. Vil du rydde feltet, så du kan sætte det rigtige?</p>' +
      '<div class="gd-tilemenu"><button class="btn btn-primary" data-act="clear">🧺 Ryd feltet</button></div>' +
      '<button class="btn btn-secondary gd-cancel">Behold</button></div>';
    overlayEl.classList.add('active');
    overlayEl.querySelector('[data-act="clear"]').addEventListener('click', () => {
      L.remove(S, i); playTone(220, 120, 'sine'); closeOverlay(); afterAction('Ryddet — nu er der plads til ' + TARGET_NAME[target] + '. 🌿');
    });
    overlayEl.querySelector('.gd-cancel').addEventListener('click', closeOverlay);
  }

  function openTileMenu(i) {
    const t = S.grid[i];
    overlayEl.innerHTML = '<div class="gd-task"><h3>' + EMOJI_OF(t.type) + ' ' + (NAME[t.type] || 'Bed') + '</h3>' +
      '<p>Vil du flytte det eller fjerne det?</p>' +
      '<div class="gd-tilemenu"><button class="btn btn-primary" data-act="move">↔️ Flyt</button>' +
      '<button class="btn btn-secondary" data-act="remove">🗑️ Fjern</button></div>' +
      '<button class="btn btn-secondary gd-cancel">Behold</button></div>';
    overlayEl.classList.add('active');
    overlayEl.querySelector('[data-act="move"]').addEventListener('click', () => {
      pendingMove = i; closeOverlay(); setHint('Tryk på et tomt bed for at flytte det dertil. ↔️'); renderGrid();
    });
    overlayEl.querySelector('[data-act="remove"]').addEventListener('click', () => {
      L.remove(S, i); playTone(220, 120, 'sine'); closeOverlay(); afterAction('Fjernet — nu er der plads igen. 🧺');
    });
    overlayEl.querySelector('.gd-cancel').addEventListener('click', closeOverlay);
  }

  function celebrateWildlife(list) {
    if (!list || !list.length) return;
    list.forEach((w, k) => later(() => {
      mEvent('arrival');
      if (!reduce() && worldEl) {
        const el = document.createElement('div'); el.className = 'gd-arrival'; el.textContent = w;
        worldEl.appendChild(el); later(() => el.remove(), 1700);
        later(() => toast('Ny gæst i haven: ' + w + ' 🎉'), 850);
      } else {
        toast('Ny gæst i haven: ' + w + ' 🎉');
      }
      // Amigo warmly shares a little "vidste du?" fact about the new visitor — in-scene, not buried in the log
      const fact = L.FACTS && L.FACTS[w];
      if (fact) { later(() => { renderGuide(w + ' ' + fact); later(() => { if (!stopped) renderGuide(); }, 4200); }, 1500); }
    }, k * 1200));
  }

  function checkQuests() {
    const res = L.tryAdvance(S);
    if (!res.completed.length) return;
    save(); renderHUD();
    res.completed.forEach((q, k) => later(() => {
      const grand = res.finale && k === res.completed.length - 1;
      toast('✅ ' + q.title + '!');
      playTone(523.25, 140, 'sine'); later(() => playTone(659.25, 160, 'sine'), 120); later(() => playTone(783.99, 200, 'sine'), 240);
      renderQuest();
      mEvent(grand ? 'grow' : 'quest');
      if (grand) {
        launchConfetti(3200);
        renderGuide('Haven er blevet helt vild og fri. Tak fordi du passede den! 💚');
        setHint('🎉 Du har skabt et helt lille stykke vild natur!');
      } else {
        launchConfetti(1100);
        renderGuide(pickCheer());
      }
    }, 300 + k * 1100));
    // after the quest fanfare, see if the world should grow — then settle Amigo back to the next story line
    later(growIfReady, 300 + res.completed.length * 1100 + 200);
    later(() => renderGuide(), 300 + res.completed.length * 1100 + 700);
  }

  function growIfReady() {
    const g = L.maybeGrow(S);
    if (!g.grew) return;
    save();
    launchConfetti(2800);
    mEvent('grow');
    [392, 523.25, 659.25, 783.99].forEach((f, i) => later(() => playTone(f, 240, 'sine'), i * 150));
    renderAll();
    if (worldEl) { worldEl.classList.remove('grow'); void worldEl.offsetWidth; worldEl.classList.add('grow'); }
    // the new, bigger world unfurls tile by tile
    if (!reduce()) [...gridEl.children].forEach((c, i) => {
      c.classList.add('gd-unfurl'); c.style.animationDelay = (i * 16) + 'ms';
      later(() => { c.classList.remove('gd-unfurl'); c.style.animationDelay = ''; }, 520 + i * 16);
    });
    toast('🌱→🌳 Haven vokser til ' + g.stage.name + '!');
    setHint('Din have er vokset til ' + g.stage.name + '! Mere plads, mere natur. 🌿');
  }

  /* ---------- overlay: build menu / mini-games / havelog ---------- */
  function closeOverlay() { overlayEl.classList.remove('active'); overlayEl.innerHTML = ''; }
  const costStr = (cost) => Object.keys(cost).map((k) => RES_ICON[k] + cost[k]).join(' ');

  function buildOpt(type) {
    const cost = COST_OF(type), ok = L.canAfford(S, cost);
    return '<button class="gd-build-opt"' + (ok ? '' : ' disabled') + ' data-type="' + type + '">' +
      '<span class="gd-build-emoji">' + EMOJI_OF(type) + '</span>' +
      '<span class="gd-build-name">' + NAME[type] + '</span>' +
      '<span class="gd-build-cost">' + costStr(cost) + '</span></button>';
  }
  function openBuildMenu() {
    startMusicOnce();
    const builds = L.BUILDABLE.map(buildOpt).join('');
    const decor = L.DECOR.map(buildOpt).join('');
    overlayEl.innerHTML = '<div class="gd-task"><h3>🔨 Byg & pynt</h3><p>Vælg noget — tryk så på et tomt bed.</p>' +
      '<h4 class="gd-build-h">🌿 Byg natur</h4><div class="gd-build-menu">' + builds + '</div>' +
      '<h4 class="gd-build-h">🎀 Pynt (kun for hyggen)</h4><div class="gd-build-menu">' + decor + '</div>' +
      '<button class="btn btn-secondary gd-cancel">Luk</button></div>';
    overlayEl.classList.add('active');
    overlayEl.querySelectorAll('.gd-build-opt').forEach((b) => b.addEventListener('click', () => {
      if (b.disabled) return;
      pendingBuild = b.dataset.type; closeOverlay();
      setHint('Tryk på et tomt bed for at placere ' + EMOJI_OF(pendingBuild)); renderGrid();
    }));
    overlayEl.querySelector('.gd-cancel').addEventListener('click', closeOverlay);
  }

  function plantSeed(i, choice) {
    if (!L.plant(S, i, choice)) { setHint('Du mangler frø 🌱 — host en moden blomst (🧺) for flere.'); return; }
    playTone(294, 120, 'sine');
    const what = choice ? ('en ' + (L.FLOWER_NAMES[choice] || 'blomst').toLowerCase()) : 'et frø';
    afterAction('Du plantede ' + what + '! 🌱 Vand det for at få det til at gro.');
    const cell = gridEl.children[i]; if (cell) { cell.classList.add('gd-grown'); later(() => cell.classList.remove('gd-grown'), 500); }
  }
  function openSeedPicker(i) {
    startMusicOnce();
    const seen = L.FLOWERS.filter((f) => S.flowersSeen[f]);
    const opt = (emoji, name, choice) =>
      '<button class="gd-build-opt" data-choice="' + (choice || '') + '">' +
      '<span class="gd-build-emoji">' + emoji + '</span>' +
      '<span class="gd-build-name">' + name + '</span>' +
      '<span class="gd-build-cost">🌱1</span></button>';
    overlayEl.innerHTML = '<div class="gd-task"><h3>🌱 Hvad vil du plante?</h3>' +
      '<p>Vælg en blomst — eller prøv blandede frø for en overraskelse.</p>' +
      '<div class="gd-build-menu">' + opt('🎲', 'Blandede frø', '') +
      seen.map((f) => opt(f, L.FLOWER_NAMES[f] || 'Blomst', f)).join('') + '</div>' +
      '<button class="btn btn-secondary gd-cancel">Fortryd</button></div>';
    overlayEl.classList.add('active');
    overlayEl.querySelectorAll('.gd-build-opt').forEach((b) => b.addEventListener('click', () => { const c = b.dataset.choice || null; closeOverlay(); plantSeed(i, c); }));
    overlayEl.querySelector('.gd-cancel').addEventListener('click', closeOverlay);
  }

  function openTask() {
    startMusicOnce();
    const ctx = {
      overlay: overlayEl,
      level: L.difficultyParams(S.chapter),
      mount(html) { overlayEl.innerHTML = '<div class="gd-task">' + html + '</div>'; overlayEl.classList.add('active'); },
      close: closeOverlay,
      done() { closeOverlay(); grantTaskReward(); },
      later,
    };
    GardenTasks.run(ctx);
  }
  function grantTaskReward() {
    const bundle = TASK_REWARDS[Math.floor(Math.random() * TASK_REWARDS.length)];
    L.earn(S, bundle); L.advanceTime(S); save(); renderHUD(); applyStageTheme();
    playTone(523.25, 150, 'sine'); later(() => playTone(659.25, 190, 'sine'), 130);
    const txt = Object.keys(bundle).map((k) => '+' + bundle[k] + RES_ICON[k]).join('  ');
    toast(txt); popAtHud(txt);
    const i = L.firstUnsolved(S);
    if (i >= 0) { const tg = L.blueprintTarget(S, i); setHint('Godt klaret! 🧠 Nu kan du sætte ' + TARGET_NAME[tg] + ' på næste felt.'); }
    else setHint('Godt klaret! 🧠');
  }

  function collRow(items, seenMap) {
    return '<div class="gd-coll-row">' + items.map((it) =>
      '<span class="gd-coll ' + (seenMap[it] ? 'got' : '') + '">' + (seenMap[it] ? it : '❔') + '</span>').join('') + '</div>';
  }
  function factList(items, seenMap, names, facts, emptyMsg) {
    const seen = items.filter((it) => seenMap[it] && (facts[it] || (names && names[it])));
    if (!seen.length) return '<p class="gd-facts-empty">' + emptyMsg + '</p>';
    return '<div class="gd-facts">' + seen.map((it) => {
      const nm = names && names[it] ? '<b>' + names[it] + '</b>' : '';
      const ft = facts[it] ? (nm ? ' — ' : '') + facts[it] : '';
      return '<p class="gd-fact"><span>' + it + '</span> ' + nm + ft + '</p>';
    }).join('') + '</div>';
  }
  // the guests who've grown happy through their wishes — shown with little hearts
  function happyGuestsHtml() {
    const g = S.guests || {};
    const happy = L.WILDLIFE.filter((w) => g[w] && g[w].happy > 0);
    if (!happy.length) return '';
    return '<p class="gd-happy">💛 Glade gæster: ' +
      happy.map((w) => '<span class="gd-happy-g">' + w + '<span class="gd-hearts">' + '💛'.repeat(Math.min(g[w].happy, 5)) + '</span></span>').join(' ') +
      '</p>';
  }

  function openHavelog() {
    const p = L.progress(S);
    const buildNames = {}; L.DECORATIONS.forEach((t) => { buildNames[t] = NAME[t] || ''; });
    const allDone = p.flowerKinds >= p.flowerKindsTotal && p.wildlife >= p.wildlifeTotal && p.builtKinds >= p.builtKindsTotal;
    overlayEl.innerHTML = '<div class="gd-task gd-log"><h3>📖 Havelog</h3>' +
      '<p>Din samling — opdag det hele lidt efter lidt 🌿</p>' +
      '<h4 class="gd-alm-h">🌸 Blomster <span>' + p.flowerKinds + '/' + p.flowerKindsTotal + '</span></h4>' +
      collRow(L.FLOWERS, S.flowersSeen) +
      factList(L.FLOWERS, S.flowersSeen, L.FLOWER_NAMES, L.FLOWER_FACTS, 'Dyrk blomster for at fylde samlingen. 🌱') +
      '<h4 class="gd-alm-h">🦋 Dyr <span>' + p.wildlife + '/' + p.wildlifeTotal + '</span></h4>' +
      collRow(L.WILDLIFE, S.wildlifeSeen) +
      happyGuestsHtml() +
      factList(L.WILDLIFE, S.wildlifeSeen, null, L.FACTS, 'Tiltræk dyr for at låse vidste-du-fakta op. 💡') +
      '<h4 class="gd-alm-h">🪴 Pynt & natur <span>' + p.builtKinds + '/' + p.builtKindsTotal + '</span></h4>' +
      collRow(L.DECORATIONS, S.builtSeen) +
      factList(L.DECORATIONS, S.builtSeen, buildNames, {}, 'Byg og pynt for at fylde denne side. 🔨') +
      (allDone ? '<p class="gd-complete">🎉 Du har opdaget det hele! Haven er fuld af liv.</p>' : '') +
      '<button class="btn btn-primary gd-cancel">Luk</button></div>';
    overlayEl.classList.add('active');
    overlayEl.querySelector('.gd-cancel').addEventListener('click', closeOverlay);
  }

  /* ---------- lifecycle ---------- */
  function initGarden() {
    stopped = false; clearTimers(); pendingBuild = null; pendingMove = null;
    let raw = null; try { raw = localStorage.getItem(KEY); } catch {}
    S = raw ? L.load(raw) : L.newState();
    closeOverlay();
    Stats.increment('garden', 'played');
    updateMusicBtn();
    celebrating = false;
    // (re)mount the isometric PixiJS scene for this screen open
    if (window.GardenIso && stageEl) { GardenIso.destroy(); GardenIso.mount(stageEl, { onTap: onTile }); }
    renderAll();
    // redraw once layout has settled (the canvas needs its final size)
    later(() => { if (!stopped && window.GardenIso) GardenIso.render(S, { pendingBuild, pendingMove }); }, 80);
    updateScene();
    const bp = L.blueprintProgress(S);
    setHint(bp.done >= bp.total
      ? '🎉 Haven er fuldendt! Nyd den — eller pynt videre med 🔨.'
      : 'Velkommen! Følg havetegningen 🗺️ — de svage skygger viser, hvad hvert felt ønsker. Tryk for at fylde dem. 🌱');
    maybeStartTutorial();
  }

  /* ---------- first-time tutorial (gentle, skippable, once) ---------- */
  const INTRO_KEY = 'bg_garden_seen_intro';
  function clearTutorial() {
    document.querySelectorAll('.gd-coach-target').forEach((e) => e.classList.remove('gd-coach-target'));
    const c = document.getElementById('gd-coach'); if (c) c.remove();
  }
  function endTutorial() { try { localStorage.setItem(INTRO_KEY, '1'); } catch {} clearTutorial(); }
  function maybeStartTutorial() {
    let seen = false; try { seen = localStorage.getItem(INTRO_KEY) === '1'; } catch {}
    if (seen) return;
    if (L.blueprintProgress(S).done > 0) { try { localStorage.setItem(INTRO_KEY, '1'); } catch {} return; }
    const steps = [
      { say: 'Hej, jeg er Amigo! 🐕 Velkommen i din have. Vi skal fylde den ud efter en lille havetegning. 🗺️', btn: 'Ja tak!', target: null },
      { say: 'Hvert felt har en <b>svag skygge</b> af det, det ønsker sig — en blomst, et træ, en dam… Tryk på feltet, så fylder vi det rigtige i. 🌱', btn: 'Forstået', target: null },
      { say: 'Skal feltet have en <b>blomst</b>? Så plant 🌱 og vand 💧, til den springer ud. Et færdigt felt bliver <b>flot og frodigt</b> med et ✓. 🌸', btn: 'Forstået', target: null },
      { say: 'Mangler du sol, vand eller frø? Spil en <b>🧠 Hjernebænk</b>-leg — det er der, du henter ressourcer. Når hele haven er klar, vokser den! 💚', btn: 'Lad os gå i gang', target: 'garden-task-btn' },
    ];
    let i = 0;
    const coach = document.createElement('div'); coach.className = 'gd-coach'; coach.id = 'gd-coach';
    document.getElementById('screen-garden').appendChild(coach);
    function show() {
      document.querySelectorAll('.gd-coach-target').forEach((e) => e.classList.remove('gd-coach-target'));
      const st = steps[i];
      coach.innerHTML = '<div class="gd-coach-card"><div class="gd-cf">' + AMIGO_SVG + '</div>' +
        '<p class="gd-coach-say">' + st.say + '</p>' +
        '<button class="btn btn-primary" id="gd-coach-next">' + st.btn + '</button>' +
        '<button class="gd-coach-skip" id="gd-coach-skip">Spring introen over</button></div>';
      if (st.target) { const t = document.getElementById(st.target); if (t) t.classList.add('gd-coach-target'); }
      coach.querySelector('#gd-coach-next').addEventListener('click', () => { i++; if (i >= steps.length) endTutorial(); else show(); });
      coach.querySelector('#gd-coach-skip').addEventListener('click', endTutorial);
    }
    show();
  }

  document.getElementById('garden-task-btn').addEventListener('click', openTask);
  document.getElementById('garden-build-btn').addEventListener('click', openBuildMenu);
  document.getElementById('garden-log-btn').addEventListener('click', openHavelog);
  if (musicBtn) musicBtn.addEventListener('click', () => { startMusicOnce(); GardenMusic.toggle(); updateMusicBtn(); });

  window.initGarden = initGarden;
  window.gameRestarters.garden = function () { closeOverlay(); pendingBuild = null; pendingMove = null; renderAll(); };
  window.gameCleanups.garden = function () { stopped = true; clearTimers(); clearTutorial(); if (window.GardenIso) GardenIso.destroy(); if (typeof GardenMusic !== 'undefined') GardenMusic.stop(); musicStarted = false; save(); };
})();
