/* ===== Dorthes have (a cosy garden you grow over visits) ===== */

(function () {
  const G = GardenLogic;
  const KEY = 'bg_garden';
  const GROW_TONE = [329.63, 392.00, 523.25]; // rising as a plant grows
  const STAGE_EMOJI = ['', '🌱', '🌿', '']; // 3 = the flower itself

  let S = null;
  let stopped = false;
  let timers = [];
  let everBloomed = false;

  const sceneEl = document.getElementById('garden-scene');
  const waterEl = document.getElementById('garden-water');
  const progressEl = document.getElementById('garden-progress');
  const hintEl = document.getElementById('garden-hint');
  const taskBtn = document.getElementById('garden-task-btn');
  const logBtn = document.getElementById('garden-log-btn');
  const overlayEl = document.getElementById('garden-overlay');

  const later = (fn, ms) => { const id = setTimeout(() => { if (!stopped) fn(); }, Math.max(0, ms)); timers.push(id); return id; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  const save = () => { try { localStorage.setItem(KEY, G.save(S)); } catch {} };

  function setHint(t) { hintEl.textContent = t; }

  function toast(text) {
    const el = document.createElement('div');
    el.className = 'gd-toast';
    el.textContent = text;
    sceneEl.parentElement.appendChild(el);
    later(() => el.remove(), 1600);
  }

  /* ---------- render ---------- */
  function renderInfo() {
    waterEl.textContent = S.water;
    const p = G.progress(S);
    progressEl.textContent = '🌸 ' + p.flowers + '/' + p.flowersTotal + ' · 🦋 ' + p.critters + '/' + p.crittersTotal;
  }

  function renderScene() {
    sceneEl.innerHTML = '';
    S.plots.forEach((p, i) => {
      const b = document.createElement('button');
      b.className = 'gd-plot stage-' + p.stage;
      b.dataset.i = i;
      b.textContent = p.stage === 3 ? p.flower : STAGE_EMOJI[p.stage];
      const label = p.stage === 0 ? 'tomt bed' : p.stage === 3 ? 'blomst ' + p.flower : 'plante der gror';
      b.setAttribute('aria-label', 'Bed ' + (i + 1) + ': ' + label);
      b.addEventListener('click', () => onPlotTap(i));
      sceneEl.appendChild(b);
    });
  }

  function renderAll() { renderInfo(); renderScene(); }

  /* ---------- interaction ---------- */
  function onPlotTap(i) {
    if (stopped) return;
    const p = S.plots[i];
    const cell = sceneEl.children[i];
    if (p.stage === 0) {
      G.plant(S, i);
      playTone(294, 120, 'sine');
      vibrate(10);
      save(); renderScene();
      pop(sceneEl.children[i]);
      setHint('Du plantede et frø! 🌱 Vand det for at få det til at gro.');
    } else if (p.stage === 1 || p.stage === 2) {
      if (S.water <= 0) {
        setHint('Du mangler vand 💧 — lav en opgave for at få mere.');
        nudge(taskBtn);
        return;
      }
      const before = p.stage;
      const r = G.water(S, i, Math.random);
      if (!r.ok) return;
      playTone(GROW_TONE[Math.min(before, GROW_TONE.length - 1)], 160, 'sine');
      vibrate(10);
      save(); renderInfo(); renderScene();
      pop(sceneEl.children[i]);
      if (r.bloomed) {
        playTone(659.25, 220, 'sine');
        later(() => playTone(783.99, 260, 'sine'), 140);
        setHint('Den sprang ud! ' + r.flower);
        if (r.critter) {
          flutter(sceneEl.children[i], r.critter);
          toast('Ny gæst i haven: ' + r.critter);
        }
        if (G.allBloomed(S)) {
          if (!everBloomed) { everBloomed = true; launchConfetti(2600); Stats.save('garden', { won: (Stats.get('garden').won || 0) + 1 }); }
          setHint('Hele haven blomstrer! 🌸 Tryk på en blomst for at plukke den og dyrke en ny.');
        }
      } else {
        setHint('Godt — den vokser! Vand igen for mere.');
      }
    } else {
      // bloomed → harvest: pick the flower, freeing the plot so you can keep growing
      const f = G.harvest(S, i);
      save(); renderInfo(); renderScene();
      pop(sceneEl.children[i]);
      playTone(523.25, 130, 'sine');
      vibrate(10);
      toast('Du plukkede ' + f + ' 🧺');
      setHint('Plukket! Nu er der plads — tryk på bedet for at plante et nyt frø. 🌱');
    }
  }

  /* ---------- little animations ---------- */
  function pop(el) { if (!el) return; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  function wiggle(el) { if (!el) return; el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle'); }
  function nudge(el) { el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge'); }
  function flutter(el, critter) {
    const c = document.createElement('span');
    c.className = 'gd-critter';
    c.textContent = critter;
    el.appendChild(c);
    later(() => c.remove(), 2200);
  }

  /* ---------- tasks (the water faucet) ---------- */
  function openTask() {
    if (stopped) return;
    const pool = [taskFindPair, taskRemember, taskCount, taskOdd, taskMissing, taskSortColor];
    pool[Math.floor(Math.random() * pool.length)]();
  }

  // shared: wire single-answer buttons (correct one carries data-correct)
  function wireAnswers(selector) {
    overlayEl.querySelectorAll(selector).forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.done) return;
      if (b.dataset.correct) {
        b.dataset.done = '1';
        b.classList.add('right'); playTone(659.25, 120, 'sine');
        later(finishTask, 420);
      } else {
        b.classList.add('wrong'); playTone(196, 160, 'sine'); vibrate(20);
        later(() => b.classList.remove('wrong'), 500);
      }
    }));
    const c = overlayEl.querySelector('.gd-cancel');
    if (c) c.addEventListener('click', closeOverlay);
  }

  function showOverlay(html) {
    overlayEl.innerHTML = html;
    overlayEl.classList.add('active');
  }
  function closeOverlay() { overlayEl.classList.remove('active'); overlayEl.innerHTML = ''; }

  function finishTask() {
    G.addWater(S, G.WATER_PER_TASK);
    save(); renderInfo();
    closeOverlay();
    playTone(523.25, 160, 'sine');
    later(() => playTone(659.25, 200, 'sine'), 130);
    toast('+' + G.WATER_PER_TASK + ' 💧');
    setHint('Godt klaret! Brug vandet på dine planter.');
  }

  function pickN(arr, n) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, n);
  }

  // Task A: find the matching flower pairs (3 pairs)
  function taskFindPair() {
    const flowers = pickN(G.FLOWERS, 3);
    const deck = pickN(flowers.concat(flowers), 6);
    showOverlay(
      '<div class="gd-task"><h3>Find parrene 🌼</h3><p>Vend kortene og find de to ens.</p>' +
      '<div class="gd-pairs">' + deck.map((f, i) => '<button class="gd-card" data-i="' + i + '" data-f="' + f + '"><span>' + f + '</span></button>').join('') + '</div>' +
      '<button class="btn btn-secondary gd-cancel">Senere</button></div>'
    );
    let flipped = [], matched = 0, lock = false;
    const cards = [...overlayEl.querySelectorAll('.gd-card')];
    cards.forEach((card) => card.addEventListener('click', () => {
      if (lock || card.classList.contains('open') || card.classList.contains('done')) return;
      card.classList.add('open');
      playTone(440, 90, 'sine');
      flipped.push(card);
      if (flipped.length === 2) {
        lock = true;
        if (flipped[0].dataset.f === flipped[1].dataset.f) {
          flipped.forEach((c) => c.classList.add('done'));
          matched++;
          flipped = []; lock = false;
          if (matched === 3) { playTone(659, 120, 'sine'); later(finishTask, 450); }
        } else {
          later(() => { flipped.forEach((c) => c.classList.remove('open')); flipped = []; lock = false; }, 800);
        }
      }
    }));
    overlayEl.querySelector('.gd-cancel').addEventListener('click', closeOverlay);
  }

  // Task B: watch a short flower sequence, then repeat it
  function taskRemember() {
    const pads = pickN(G.FLOWERS, 4);
    const seq = Array.from({ length: 3 }, () => Math.floor(Math.random() * 4));
    showOverlay(
      '<div class="gd-task"><h3>Husk blomsterne 🧠</h3><p id="gd-rem-status">Se godt efter…</p>' +
      '<div class="gd-pads">' + pads.map((f, i) => '<button class="gd-pad" data-i="' + i + '">' + f + '</button>').join('') + '</div>' +
      '<button class="btn btn-secondary gd-cancel">Senere</button></div>'
    );
    const padEls = [...overlayEl.querySelectorAll('.gd-pad')];
    const status = overlayEl.querySelector('#gd-rem-status');
    overlayEl.querySelector('.gd-cancel').addEventListener('click', closeOverlay);
    let inputIdx = 0, accepting = false;

    function flash(i) {
      const el = padEls[i]; if (!el) return;
      el.classList.add('lit'); playTone([330, 392, 440, 523][i], 320, 'sine');
      later(() => el.classList.remove('lit'), 340);
    }
    function play() {
      accepting = false; inputIdx = 0;
      status.textContent = 'Se godt efter…';
      let t = 400;
      seq.forEach((i) => { later(() => flash(i), t); t += 560; });
      later(() => { accepting = true; status.textContent = 'Din tur!'; }, t);
    }
    padEls.forEach((el, i) => el.addEventListener('click', () => {
      if (!accepting) return;
      el.classList.add('lit'); playTone([330, 392, 440, 523][i], 200, 'sine'); later(() => el.classList.remove('lit'), 200);
      if (i === seq[inputIdx]) {
        inputIdx++;
        if (inputIdx >= seq.length) { accepting = false; status.textContent = 'Flot! 🌟'; playTone(659, 140, 'sine'); later(finishTask, 500); }
      } else {
        accepting = false; status.textContent = 'Næsten — prøv igen 🙂'; later(play, 800);
      }
    }));
    play();
  }

  // Task C: count how many of one flower are in the patch
  function taskCount() {
    const target = pickN(G.FLOWERS, 1)[0];
    const others = G.FLOWERS.filter((f) => f !== target);
    const count = 2 + Math.floor(Math.random() * 5);   // 2..6 of the target
    const noise = 3 + Math.floor(Math.random() * 4);   // 3..6 distractors
    const items = [];
    for (let i = 0; i < count; i++) items.push(target);
    for (let i = 0; i < noise; i++) items.push(others[Math.floor(Math.random() * others.length)]);
    const scene = pickN(items, items.length); // shuffle
    const opts = new Set([count]);
    while (opts.size < 4) { const d = count + (Math.floor(Math.random() * 5) - 2); if (d >= 1 && d !== count) opts.add(d); }
    const optArr = pickN([...opts], opts.size);
    showOverlay(
      '<div class="gd-task"><h3>Tæl blomsterne 🌼</h3><p>Hvor mange ' + target + ' kan du se?</p>' +
      '<div class="gd-show">' + scene.map((f) => '<span>' + f + '</span>').join('') + '</div>' +
      '<div class="gd-nums">' + optArr.map((o) => '<button class="gd-num"' + (o === count ? ' data-correct="1"' : '') + '>' + o + '</button>').join('') + '</div>' +
      '<button class="btn btn-secondary gd-cancel">Senere</button></div>'
    );
    wireAnswers('.gd-num');
  }

  // Task D: spot the one flower that is different
  function taskOdd() {
    const [base, odd] = pickN(G.FLOWERS, 2);
    const n = 9;
    const pos = Math.floor(Math.random() * n);
    const cells = [];
    for (let i = 0; i < n; i++) cells.push(i === pos ? odd : base);
    showOverlay(
      '<div class="gd-task"><h3>Find den anderledes 🔍</h3><p>Tryk på den blomst der er anderledes.</p>' +
      '<div class="gd-grid">' + cells.map((f, i) => '<button class="gd-cell"' + (i === pos ? ' data-correct="1"' : '') + '>' + f + '</button>').join('') + '</div>' +
      '<button class="btn btn-secondary gd-cancel">Senere</button></div>'
    );
    wireAnswers('.gd-cell');
  }

  // Task E: memorise a small set, then say which flower disappeared
  function taskMissing() {
    const set = pickN(G.FLOWERS, 4);
    const missing = set[Math.floor(Math.random() * set.length)];
    showOverlay(
      '<div class="gd-task"><h3>Hvad mangler? 🧠</h3><p id="gd-miss-status">Kig godt efter…</p>' +
      '<div class="gd-show" id="gd-miss-show">' + set.map((f) => '<span>' + f + '</span>').join('') + '</div>' +
      '<div class="gd-nums gd-hidden" id="gd-miss-opts">' + pickN(set, 4).map((f) => '<button class="gd-pad"' + (f === missing ? ' data-correct="1"' : '') + '>' + f + '</button>').join('') + '</div>' +
      '<button class="btn btn-secondary gd-cancel">Senere</button></div>'
    );
    const showRow = overlayEl.querySelector('#gd-miss-show');
    const opts = overlayEl.querySelector('#gd-miss-opts');
    const status = overlayEl.querySelector('#gd-miss-status');
    later(() => {
      showRow.innerHTML = set.filter((f) => f !== missing).map((f) => '<span>' + f + '</span>').join('') + '<span class="gd-miss-gap">❔</span>';
      status.textContent = 'Hvilken blomst er væk?';
      opts.classList.remove('gd-hidden');
    }, 2600);
    wireAnswers('#gd-miss-opts .gd-pad');
  }

  // Task F: tap all the flowers of one colour (sort/categorise by colour)
  const COLOR_FLOWERS = [
    { word: 'gule', dot: '🟡', flower: '🌻' },
    { word: 'røde', dot: '🔴', flower: '🌹' },
    { word: 'lilla', dot: '🟣', flower: '🪻' },
    { word: 'lyserøde', dot: '🩷', flower: '🌸' },
  ];
  function taskSortColor() {
    const target = COLOR_FLOWERS[Math.floor(Math.random() * COLOR_FLOWERS.length)];
    const others = COLOR_FLOWERS.filter((c) => c !== target);
    const tCount = 2 + Math.floor(Math.random() * 3);   // 2..4 of the target colour
    const items = [];
    for (let i = 0; i < tCount; i++) items.push(target.flower);
    const dCount = 3 + Math.floor(Math.random() * 3);   // 3..5 distractors
    for (let i = 0; i < dCount; i++) items.push(others[Math.floor(Math.random() * others.length)].flower);
    const scene = pickN(items, items.length);
    showOverlay(
      '<div class="gd-task"><h3>Sortér efter farve ' + target.dot + '</h3>' +
      '<p>Tryk på alle de ' + target.word + ' blomster.</p>' +
      '<div class="gd-grid">' + scene.map((f) => '<button class="gd-cell"' + (f === target.flower ? ' data-correct="1"' : '') + '>' + f + '</button>').join('') + '</div>' +
      '<button class="btn btn-secondary gd-cancel">Senere</button></div>'
    );
    let found = 0;
    overlayEl.querySelectorAll('.gd-cell').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.done) return;
      if (b.dataset.correct) {
        b.dataset.done = '1'; b.classList.add('right'); playTone(523.25, 110, 'sine');
        if (++found === tCount) { playTone(659.25, 120, 'sine'); later(finishTask, 420); }
      } else {
        b.classList.add('wrong'); playTone(196, 160, 'sine'); vibrate(20); later(() => b.classList.remove('wrong'), 500);
      }
    }));
    overlayEl.querySelector('.gd-cancel').addEventListener('click', closeOverlay);
  }

  /* ---------- Havelog (collection) ---------- */
  function openHavelog() {
    const flowers = G.FLOWERS.map((f) => '<span class="gd-coll ' + (S.flowersSeen[f] ? 'got' : '') + '">' + (S.flowersSeen[f] ? f : '❔') + '</span>').join('');
    const critters = G.CRITTERS.map((c) => '<span class="gd-coll ' + (S.crittersSeen[c] ? 'got' : '') + '">' + (S.crittersSeen[c] ? c : '❔') + '</span>').join('');
    const p = G.progress(S);
    showOverlay(
      '<div class="gd-task gd-log"><h3>📖 Havelog</h3>' +
      '<p>Blomster (' + p.flowers + '/' + p.flowersTotal + ')</p><div class="gd-coll-row">' + flowers + '</div>' +
      '<p>Havens gæster (' + p.critters + '/' + p.crittersTotal + ')</p><div class="gd-coll-row">' + critters + '</div>' +
      '<p>Plukket i alt: <b>' + (S.picked || 0) + '</b> 🧺</p>' +
      (p.flowers === p.flowersTotal && p.critters === p.crittersTotal ? '<p class="gd-complete">🎉 Du har samlet alle blomster og gæster!</p>' : '') +
      '<button class="btn btn-primary gd-cancel">Luk</button></div>'
    );
    overlayEl.querySelector('.gd-cancel').addEventListener('click', closeOverlay);
  }

  /* ---------- lifecycle ---------- */
  function initGarden() {
    stopped = false;
    clearTimers();
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch {}
    S = raw ? G.load(raw) : G.newState();
    everBloomed = G.allBloomed(S);
    closeOverlay();
    Stats.increment('garden', 'played');
    renderAll();
    const empties = G.emptyPlots(S).length;
    setHint(empties === G.PLOTS
      ? 'Velkommen i haven! Tryk på et bed for at plante et frø. 🌱'
      : G.allBloomed(S)
        ? 'Haven er fuld og smuk! 🌸 Tryk på en blomst for at plukke den og gøre plads til en ny.'
        : 'Velkommen tilbage! Pas dine planter, eller plant nye.');
  }

  taskBtn.addEventListener('click', openTask);
  logBtn.addEventListener('click', openHavelog);

  window.initGarden = initGarden;
  window.gameRestarters.garden = function () { closeOverlay(); renderAll(); };
  window.gameCleanups.garden = function () { stopped = true; clearTimers(); save(); };
})();
