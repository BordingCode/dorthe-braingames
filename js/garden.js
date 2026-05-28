/* ===== Dorthes have — garden-world game (UI host) ===== */

(function () {
  const L = GardenLogic;
  const KEY = 'bg_garden';
  const BUILD_NAME = { tree: 'Træ', pond: 'Dam', feeder: 'Fuglebad', beehouse: 'Bistade' };
  const RES_ICON = { sol: '☀️', vand: '💧', froe: '🌱' };
  const TASK_REWARDS = [{ vand: 2, sol: 1 }, { froe: 2 }, { sol: 2, vand: 1 }, { vand: 3 }, { froe: 1, sol: 1, vand: 1 }];

  let S = null, stopped = false, timers = [], pendingBuild = null, musicStarted = false;

  const gridEl = document.getElementById('garden-grid');
  const hudEl = document.getElementById('garden-hud');
  const questEl = document.getElementById('garden-quest');
  const hintEl = document.getElementById('garden-hint');
  const overlayEl = document.getElementById('garden-overlay');
  const musicBtn = document.getElementById('garden-music-btn');

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

  /* ---------- render ---------- */
  function tileContent(t) {
    if (t.type === 'soil') return '';
    if (t.type === 'flower') return ['', '🌱', '🌿', t.flower][t.stage] || '🌱';
    return L.BUILD_EMOJI[t.type] || '';
  }
  function renderHUD() {
    const r = S.resources, p = L.progress(S);
    hudEl.innerHTML =
      '<span>☀️ <b>' + r.sol + '</b></span><span>💧 <b>' + r.vand + '</b></span><span>🌱 <b>' + r.froe + '</b></span>' +
      '<span class="gd-prog">🦋 ' + p.wildlife + '/' + p.wildlifeTotal + ' · 📜 ' + p.quests + '/' + p.questsTotal + '</span>';
  }
  function renderQuest() {
    const q = L.currentQuest(S);
    questEl.innerHTML = q
      ? '📜 ' + q.icon + ' <b>' + q.title + '</b> — ' + q.goal(S).text
      : '🌳 <b>Haven trives!</b> Nyd den — eller pluk og plant videre.';
  }
  function renderGrid() {
    gridEl.innerHTML = '';
    gridEl.style.setProperty('--cols', L.COLS);
    S.grid.forEach((t, i) => {
      const b = document.createElement('button');
      b.className = 'gd-tile t-' + t.type + (t.type === 'flower' ? ' s-' + t.stage : '') + (pendingBuild && t.type === 'soil' ? ' placeable' : '');
      b.textContent = tileContent(t);
      b.setAttribute('aria-label', 'Bed ' + (i + 1) + ' (' + t.type + ')');
      b.addEventListener('click', () => onTile(i));
      gridEl.appendChild(b);
    });
  }
  function renderAll() { renderHUD(); renderQuest(); renderGrid(); }

  /* ---------- actions ---------- */
  function afterAction(hint) { save(); renderHUD(); renderGrid(); if (hint) setHint(hint); checkQuests(); }

  function onTile(i) {
    if (stopped) return;
    startMusicOnce();
    const t = S.grid[i];
    if (pendingBuild) {
      if (t.type === 'soil') {
        const r = L.build(S, pendingBuild, i);
        if (r.ok) { playTone(330, 140, 'sine'); pop(gridEl.children[i]); const b = pendingBuild; pendingBuild = null; afterAction('Du byggede et ' + BUILD_NAME[b].toLowerCase() + '! 🌿'); celebrateWildlife(r.wildlife); }
        else { pendingBuild = null; setHint('Ikke nok ressourcer til det — lav en opgave.'); renderGrid(); }
      } else { pendingBuild = null; setHint('Vælg et tomt bed at bygge på.'); renderGrid(); }
      return;
    }
    if (t.type === 'soil') {
      if (L.plant(S, i)) { playTone(294, 120, 'sine'); pop(gridEl.children[i]); afterAction('Du plantede et frø! 🌱 Vand det for at få det til at gro.'); }
      else setHint('Du mangler frø 🌱 — lav en opgave for at få flere.');
    } else if (t.type === 'flower') {
      if (t.stage < 3) {
        const r = L.water(S, i, Math.random);
        if (!r.ok) { setHint('Du mangler vand 💧 — lav en opgave for at få mere.'); return; }
        playTone([329.63, 392.00, 523.25][Math.min(t.stage - 1, 2)], 150, 'sine'); pop(gridEl.children[i]);
        if (r.bloomed) { playTone(659.25, 200, 'sine'); later(() => playTone(783.99, 240, 'sine'), 130); afterAction('Den sprang ud! ' + r.flower); celebrateWildlife(r.wildlife); }
        else afterAction('Godt — den vokser! 💧 Vand igen.');
      } else {
        const f = L.harvest(S, i); playTone(523.25, 130, 'sine'); pop(gridEl.children[i]);
        afterAction('Du plukkede ' + f + ' 🧺 — nu er der plads igen.');
      }
    } else {
      wiggle(gridEl.children[i]); setHint('Et dejligt ' + (BUILD_NAME[t.type] || 'sted').toLowerCase() + ' — naturen elsker det.');
    }
  }

  function celebrateWildlife(list) {
    if (!list || !list.length) return;
    list.forEach((w, k) => later(() => { toast('Ny gæst i haven: ' + w + ' 🎉'); }, k * 700));
  }

  function checkQuests() {
    const res = L.tryAdvance(S);
    if (!res.completed.length) return;
    save(); renderHUD();
    res.completed.forEach((q, k) => later(() => {
      toast('✅ ' + q.title + '!');
      playTone(523.25, 140, 'sine'); later(() => playTone(659.25, 160, 'sine'), 120); later(() => playTone(783.99, 200, 'sine'), 240);
      renderQuest();
      if (res.finale && k === res.completed.length - 1) {
        launchConfetti(3000);
        setHint('🎉 Haven trives! Du har genoprettet den lille have. En ny eng venter snart…');
      }
    }, 300 + k * 1100));
  }

  /* ---------- overlay: build menu / mini-games / havelog ---------- */
  function closeOverlay() { overlayEl.classList.remove('active'); overlayEl.innerHTML = ''; }
  const costStr = (cost) => Object.keys(cost).map((k) => RES_ICON[k] + cost[k]).join(' ');

  function openBuildMenu() {
    startMusicOnce();
    const items = L.BUILDABLE.map((type) => {
      const cost = L.BUILD_COST[type], ok = L.canAfford(S, cost);
      return '<button class="gd-build-opt"' + (ok ? '' : ' disabled') + ' data-type="' + type + '">' +
        '<span class="gd-build-emoji">' + L.BUILD_EMOJI[type] + '</span>' +
        '<span class="gd-build-name">' + BUILD_NAME[type] + '</span>' +
        '<span class="gd-build-cost">' + costStr(cost) + '</span></button>';
    }).join('');
    overlayEl.innerHTML = '<div class="gd-task"><h3>🔨 Byg i haven</h3><p>Vælg noget — tryk så på et tomt bed.</p>' +
      '<div class="gd-build-menu">' + items + '</div><button class="btn btn-secondary gd-cancel">Luk</button></div>';
    overlayEl.classList.add('active');
    overlayEl.querySelectorAll('.gd-build-opt').forEach((b) => b.addEventListener('click', () => {
      if (b.disabled) return;
      pendingBuild = b.dataset.type; closeOverlay();
      setHint('Tryk på et tomt bed for at placere ' + L.BUILD_EMOJI[pendingBuild]); renderGrid();
    }));
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
    L.earn(S, bundle); save(); renderHUD();
    playTone(523.25, 150, 'sine'); later(() => playTone(659.25, 190, 'sine'), 130);
    toast(Object.keys(bundle).map((k) => '+' + bundle[k] + RES_ICON[k]).join('  '));
    setHint('Godt klaret! Brug ressourcerne i haven.');
    checkQuests();
  }

  function openHavelog() {
    const wl = L.WILDLIFE.map((w) => '<span class="gd-coll ' + (S.wildlifeSeen[w] ? 'got' : '') + '">' + (S.wildlifeSeen[w] ? w : '❔') + '</span>').join('');
    const p = L.progress(S);
    const done = p.quests >= p.questsTotal;
    overlayEl.innerHTML = '<div class="gd-task gd-log"><h3>📖 Havelog</h3>' +
      '<p>Naturens gæster (' + p.wildlife + '/' + p.wildlifeTotal + ')</p><div class="gd-coll-row">' + wl + '</div>' +
      '<p>Blomster i blomst: <b>' + p.flowers + '</b> · plukket: <b>' + (S.picked || 0) + '</b> 🧺</p>' +
      '<p>Opgaver klaret: <b>' + p.quests + '/' + p.questsTotal + '</b></p>' +
      (done && p.wildlife === p.wildlifeTotal ? '<p class="gd-complete">🎉 Haven er i fuldt flor og fuld af liv!</p>' : '') +
      '<button class="btn btn-primary gd-cancel">Luk</button></div>';
    overlayEl.classList.add('active');
    overlayEl.querySelector('.gd-cancel').addEventListener('click', closeOverlay);
  }

  /* ---------- lifecycle ---------- */
  function initGarden() {
    stopped = false; clearTimers(); pendingBuild = null;
    let raw = null; try { raw = localStorage.getItem(KEY); } catch {}
    S = raw ? L.load(raw) : L.newState();
    closeOverlay();
    Stats.increment('garden', 'played');
    updateMusicBtn();
    renderAll();
    const q = L.currentQuest(S);
    setHint(q ? 'Velkommen i haven! Lav en opgave for ressourcer, og byg haven op. 🌱' : 'Haven trives — nyd den, eller dyrk videre. 🌳');
  }

  document.getElementById('garden-task-btn').addEventListener('click', openTask);
  document.getElementById('garden-build-btn').addEventListener('click', openBuildMenu);
  document.getElementById('garden-log-btn').addEventListener('click', openHavelog);
  if (musicBtn) musicBtn.addEventListener('click', () => { startMusicOnce(); GardenMusic.toggle(); updateMusicBtn(); });

  window.initGarden = initGarden;
  window.gameRestarters.garden = function () { closeOverlay(); pendingBuild = null; renderAll(); };
  window.gameCleanups.garden = function () { stopped = true; clearTimers(); if (typeof GardenMusic !== 'undefined') GardenMusic.stop(); musicStarted = false; save(); };
})();
