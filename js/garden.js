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
  const TASK_REWARDS = [{ vand: 2, sol: 1 }, { froe: 2 }, { sol: 2, vand: 1 }, { vand: 3 }, { froe: 1, sol: 1, vand: 1 }];

  let S = null, stopped = false, timers = [], pendingBuild = null, pendingMove = null, musicStarted = false;

  const gridEl = document.getElementById('garden-grid');
  const hudEl = document.getElementById('garden-hud');
  const questEl = document.getElementById('garden-quest');
  const wishEl = document.getElementById('garden-wish');
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
    // distant scenery (parallax hills + trees) — drawn once, behind everything, gives the world depth
    if (!worldEl.querySelector('.gd-scenery')) {
      const sc = document.createElement('div'); sc.className = 'gd-scenery';
      sc.innerHTML =
        '<svg class="gd-scenery-svg" viewBox="0 0 480 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
        '<path class="gd-hill gd-hill-far" d="M0 168 Q120 120 240 156 T480 150 V300 H0 Z"/>' +
        '<g class="gd-trees-far">' +
          treeSVG(60, 168, 0.7) + treeSVG(150, 158, 0.55) + treeSVG(330, 160, 0.6) + treeSVG(430, 166, 0.8) +
        '</g>' +
        '<path class="gd-hill gd-hill-near" d="M0 206 Q140 168 280 200 T480 196 V300 H0 Z"/>' +
        '<g class="gd-trees-near">' + treeSVG(40, 210, 1) + treeSVG(250, 206, 0.9) + treeSVG(455, 212, 1.05) + '</g>' +
        '</svg>';
      worldEl.insertBefore(sc, worldEl.firstChild);
    }
    if (!worldEl.querySelector('.gd-ambient')) { const a = document.createElement('div'); a.className = 'gd-ambient'; worldEl.appendChild(a); }
    let weather = worldEl.querySelector('.gd-weather');
    if (!worldEl.querySelector('.gd-daylight')) { const d = document.createElement('div'); d.className = 'gd-daylight'; worldEl.appendChild(d); }
    if (!weather) { weather = document.createElement('div'); weather.className = 'gd-weather'; worldEl.appendChild(weather); }
    return { weather, ambient: worldEl.querySelector('.gd-ambient') };
  }
  // a soft layered tree for the distant scenery
  function treeSVG(x, y, s) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      '<rect x="-3" y="-2" width="6" height="16" rx="2" fill="#7a5733"/>' +
      '<ellipse cx="0" cy="-14" rx="20" ry="18" fill="#6fae5e"/>' +
      '<ellipse cx="-9" cy="-8" rx="13" ry="12" fill="#7dbb69"/>' +
      '<ellipse cx="9" cy="-9" rx="12" ry="12" fill="#84c270"/>' +
      '</g>';
  }
  function applyStageTheme() {
    if (!worldEl) return;
    const timeName = L.TIMES[S.timeOfDay | 0] || 'day';
    const seasonName = L.SEASONS[L.currentSeason(S)] || 'spring';
    worldEl.className = 'gd-world stage-' + L.currentStage(S).id + ' time-' + timeName + ' season-' + seasonName;
    const { weather } = ensureLayers();
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
    const r = S.resources, p = L.progress(S);
    hudEl.innerHTML =
      '<span>☀️ <b>' + r.sol + '</b></span><span>💧 <b>' + r.vand + '</b></span><span>🌱 <b>' + r.froe + '</b></span>' +
      '<span class="gd-prog">🦋 ' + p.wildlife + '/' + p.wildlifeTotal + ' · 📜 ' + p.quests + '/' + p.questsTotal + ' · 🌿 ' + p.stageName + '</span>';
  }
  function renderQuest() {
    const q = L.currentQuest(S);
    questEl.innerHTML = q
      ? '📜 ' + q.icon + ' <b>' + q.title + '</b> — ' + q.goal(S).text
      : '🌳 <b>Haven trives!</b> Nyd den — eller pluk og plant videre.';
  }
  // a living guest perched in the world, tied to the active wish (gentle bob; static if reduced-motion)
  function renderWorldGuest(guest) {
    if (!worldEl) return;
    let el = worldEl.querySelector('.gd-guest');
    if (!guest) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.className = 'gd-guest'; worldEl.appendChild(el); }
    el.textContent = guest;
  }
  // the single active wish line (or hidden) — always a calm, optional little ask from a guest
  function renderWish() {
    const p = L.wishProgress(S);
    renderWorldGuest(p ? p.guest : null);
    if (!wishEl) return;
    if (!p) { wishEl.classList.remove('show'); wishEl.innerHTML = ''; return; }
    wishEl.classList.add('show');
    wishEl.innerHTML = '<span class="gd-wish-face">' + p.guest + '</span>' +
      '<span class="gd-wish-say">' + p.say + ' <b>(' + p.have + '/' + p.need + ')</b></span>';
  }

  function currentStory() {
    const q = L.currentQuest(S);
    return q ? (L.STORY[q.id] || '') : 'Haven trives nu! Den er blevet et lille paradis for dyrene. 🌳';
  }
  function renderGuide(text) {
    if (!guideEl) return;
    guideEl.innerHTML = '<span class="gd-guide-face">' + GUIDE.emoji + '</span>' +
      '<span class="gd-guide-say"><b>' + GUIDE.name + ':</b> ' + (text || currentStory()) + '</span>';
  }
  function renderGrid() {
    gridEl.innerHTML = '';
    gridEl.style.setProperty('--cols', S.cols);
    const placing = pendingBuild || pendingMove !== null;
    S.grid.forEach((t, i) => {
      const b = document.createElement('button');
      const placeable = placing && t.type === 'soil';
      b.className = 'gd-tile t-' + t.type + (t.type === 'flower' ? ' s-' + t.stage : '') + (placeable ? ' placeable' : '');
      // show a translucent ghost of what's about to be placed
      if (placeable && pendingBuild) b.innerHTML = '<div class="gd-ghost">' + GardenArt.tile({ type: pendingBuild }) + '</div>';
      else b.innerHTML = GardenArt.tile(t);
      b.setAttribute('aria-label', 'Bed ' + (i + 1) + ' (' + t.type + ')');
      b.addEventListener('click', () => onTile(i));
      gridEl.appendChild(b);
    });
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
  function renderAll() { applyStageTheme(); renderHUD(); renderQuest(); renderWish(); renderGuide(); renderHygge(); renderGrid(); }

  /* ---------- actions ---------- */
  function afterAction(hint) { save(); renderHUD(); renderHygge(); renderGrid(); if (hint) setHint(hint); checkQuests(); checkHygge(); checkWishes(); }

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
  function onTile(i) {
    if (stopped) return;
    startMusicOnce();
    const t = S.grid[i];
    if (pendingMove !== null) {
      if (t.type === 'soil') {
        if (L.move(S, pendingMove, i)) { playTone(392, 140, 'sine'); pendingMove = null; pop(gridEl.children[i]); afterAction('Flyttet! 🌿'); }
        else { pendingMove = null; renderGrid(); }
      } else { pendingMove = null; setHint('Vælg et tomt bed at flytte det hen til.'); renderGrid(); }
      return;
    }
    if (pendingBuild) {
      if (t.type === 'soil') {
        const r = L.place(S, pendingBuild, i);
        if (r.ok) {
          playTone(330, 140, 'sine'); const b = pendingBuild; pendingBuild = null;
          afterAction('Du placerede ' + NAME[b].toLowerCase() + '! 🌿');
          const cell = gridEl.children[i]; if (cell) { cell.classList.add('gd-grown'); sparkle(cell, 5); later(() => cell.classList.remove('gd-grown'), 500); }
          mEvent('build'); updateScene();
          if (r.newBuild) later(() => toast('✨ Ny ting i haven: ' + (NAME[b] || '') + '!'), 450);
          celebrateWildlife(r.wildlife);
        } else { pendingBuild = null; setHint('Ikke nok ressourcer — host dine modne blomster for flere.'); renderGrid(); }
      } else { pendingBuild = null; setHint('Vælg et tomt bed at bygge på.'); renderGrid(); }
      return;
    }
    if (t.type === 'soil') {
      if (!L.canAfford(S, L.PLANT_COST)) { setHint('Du mangler frø 🌱 — host en moden blomst (🧺) for flere.'); return; }
      // once you've discovered a couple of flowers, you get to choose what to plant
      if (Object.keys(S.flowersSeen || {}).length >= 2) openSeedPicker(i);
      else plantSeed(i, null);
    } else if (t.type === 'flower') {
      if (t.stage < 3) {
        const r = L.water(S, i, Math.random);
        if (!r.ok) { setHint('Du mangler vand 💧 — host en moden blomst (🧺) for mere.'); return; }
        playTone([329.63, 392.00, 523.25][Math.min(t.stage - 1, 2)], 150, 'sine');
        if (r.bloomed) {
          playTone(659.25, 200, 'sine'); later(() => playTone(783.99, 240, 'sine'), 130);
          afterAction('Den sprang ud! ' + r.flower + ' +☀️');
          const cell = gridEl.children[i]; if (cell) { cell.classList.add('gd-bloomed'); sparkle(cell, 8); later(() => cell.classList.remove('gd-bloomed'), 850); }
          mEvent('bloom');
          if (r.newFlower) discoverFlower(r.flower, cell);
          else if (Math.random() < 0.6) { renderGuide(pickCheer()); later(() => { if (!stopped) renderGuide(); }, 2600); }
          celebrateWildlife(r.wildlife);
        } else {
          afterAction('Godt — den vokser! 💧 Vand igen.');
          const cell = gridEl.children[i]; if (cell) { cell.classList.add('gd-grown'); later(() => cell.classList.remove('gd-grown'), 500); }
        }
      } else {
        const h = L.harvest(S, i); playTone(523.25, 130, 'sine'); later(() => playTone(659.25, 150, 'sine'), 90);
        afterAction('Du plukkede ' + h.flower + ' 🧺 — og fik ' + rewardText(h.reward));
        const cell = gridEl.children[i]; if (cell) sparkle(cell, 6);
      }
    } else {
      wiggle(gridEl.children[i]); openTileMenu(i);
    }
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
    }, k * 1000));
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
    setHint('Godt klaret! Brug ressourcerne i haven.');
    checkQuests();
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
    if (!S.wish) L.assignWish(S, Math.random); // a returning guest may already be waiting with a little wish
    renderAll();
    updateScene();
    const q = L.currentQuest(S);
    setHint(q ? 'Velkommen i haven! Plant, vand og pluk dine blomster — så vokser den. 🌱' : 'Haven trives — nyd den, eller dyrk videre. 🌳');
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
    if (S.questIndex > 0 || L.bloomCount(S) > 0) { try { localStorage.setItem(INTRO_KEY, '1'); } catch {} return; }
    const steps = [
      { say: 'Hej, jeg er Amigo! 🐕 Velkommen i din have. Skal vi gøre den smuk sammen?', btn: 'Ja tak!', target: null },
      { say: 'Tryk på et brunt bed for at <b>plante</b> 🌱 — og igen for at <b>vande</b> 💧, til blomsten springer ud. 🌸', btn: 'Forstået', target: null },
      { say: 'Når en blomst er sprunget ud, kan du <b>plukke</b> den 🧺 — så får du sol, vand og frø til mere. ☀️💧🌱', btn: 'Forstået', target: null },
      { say: 'I <b>📖 Havelog</b> ser du alle de dyr, du lokker til haven. God fornøjelse! 💚', btn: 'Lad os gå i gang', target: 'garden-log-btn' },
    ];
    let i = 0;
    const coach = document.createElement('div'); coach.className = 'gd-coach'; coach.id = 'gd-coach';
    document.getElementById('screen-garden').appendChild(coach);
    function show() {
      document.querySelectorAll('.gd-coach-target').forEach((e) => e.classList.remove('gd-coach-target'));
      const st = steps[i];
      coach.innerHTML = '<div class="gd-coach-card"><div class="gd-cf">🐕</div>' +
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
  window.gameCleanups.garden = function () { stopped = true; clearTimers(); clearTutorial(); if (typeof GardenMusic !== 'undefined') GardenMusic.stop(); musicStarted = false; save(); };
})();
