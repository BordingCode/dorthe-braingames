/* ===== Dorthes have — mini-game pool (the resource faucet) =====
 * A bank of quick, gentle, no-fail tasks. The host (garden.js) calls GardenTasks.run(ctx)
 * with ctx = { overlay (element), level (difficultyParams), mount(html), close(), done(),
 * later(fn,ms) }. Each task renders into the overlay, and calls ctx.done() on success or
 * ctx.close() on "Senere". Difficulty (counts / sequence length / grid / targets) comes from
 * ctx.level. Uses global playTone/vibrate and GardenLogic.FLOWERS. See gamedev-kb genre-playbooks.
 */
(function (root) {
  'use strict';
  const FLOWERS = () => (root.GardenLogic ? root.GardenLogic.FLOWERS : ['🌷', '🌻', '🌹', '🌼', '🌸', '🪻']);

  function pickN(arr, n) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return n == null ? a : a.slice(0, n);
  }
  const tone = (f, d) => { try { playTone(f, d || 120, 'sine'); } catch {} };
  const buzz = (n) => { try { vibrate(n); } catch {} };

  function cancelWire(ctx) {
    const c = ctx.overlay.querySelector('.gd-cancel');
    if (c) c.addEventListener('click', ctx.close);
  }
  // single correct answer carries data-correct
  function wireAnswers(ctx, selector) {
    ctx.overlay.querySelectorAll(selector).forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.done) return;
      if (b.dataset.correct) { b.dataset.done = '1'; b.classList.add('right'); tone(659.25); ctx.later(ctx.done, 420); }
      else { b.classList.add('wrong'); tone(196, 160); buzz(20); ctx.later(() => b.classList.remove('wrong'), 500); }
    }));
    cancelWire(ctx);
  }

  // A: find the matching flower pairs
  function taskFindPair(ctx) {
    const pairs = ctx.level.pairs;
    const flowers = pickN(FLOWERS(), pairs);
    const deck = pickN(flowers.concat(flowers));
    ctx.mount(
      '<h3>Find parrene 🌼</h3><p>Vend kortene og find de to ens.</p>' +
      '<div class="gd-pairs">' + deck.map((f) => '<button class="gd-card" data-f="' + f + '"><span>' + f + '</span></button>').join('') + '</div>' +
      '<button class="btn btn-secondary gd-cancel">Senere</button>'
    );
    let flipped = [], matched = 0, lock = false;
    ctx.overlay.querySelectorAll('.gd-card').forEach((card) => card.addEventListener('click', () => {
      if (lock || card.classList.contains('open') || card.classList.contains('done')) return;
      card.classList.add('open'); tone(440, 90); flipped.push(card);
      if (flipped.length === 2) {
        lock = true;
        if (flipped[0].dataset.f === flipped[1].dataset.f) {
          flipped.forEach((c) => c.classList.add('done')); matched++; flipped = []; lock = false;
          if (matched === pairs) { tone(659); ctx.later(ctx.done, 450); }
        } else { ctx.later(() => { flipped.forEach((c) => c.classList.remove('open')); flipped = []; lock = false; }, 800); }
      }
    }));
    cancelWire(ctx);
  }

  // B: watch a flower sequence, then repeat it
  function taskRemember(ctx) {
    const pads = pickN(FLOWERS(), 4);
    const len = ctx.level.seqLen;
    const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 4));
    ctx.mount(
      '<h3>Husk blomsterne 🧠</h3><p id="gd-rem-status">Se godt efter…</p>' +
      '<div class="gd-pads">' + pads.map((f) => '<button class="gd-pad">' + f + '</button>').join('') + '</div>' +
      '<button class="btn btn-secondary gd-cancel">Senere</button>'
    );
    const padEls = [...ctx.overlay.querySelectorAll('.gd-pad')];
    const status = ctx.overlay.querySelector('#gd-rem-status');
    const NOTE = [330, 392, 440, 523];
    let inputIdx = 0, accepting = false;
    const flash = (i) => { const el = padEls[i]; if (!el) return; el.classList.add('lit'); tone(NOTE[i], 320); ctx.later(() => el.classList.remove('lit'), 340); };
    function play() {
      accepting = false; inputIdx = 0; status.textContent = 'Se godt efter…';
      let t = 400; seq.forEach((i) => { ctx.later(() => flash(i), t); t += 560; });
      ctx.later(() => { accepting = true; status.textContent = 'Din tur!'; }, t);
    }
    padEls.forEach((el, i) => el.addEventListener('click', () => {
      if (!accepting) return;
      el.classList.add('lit'); tone(NOTE[i], 200); ctx.later(() => el.classList.remove('lit'), 200);
      if (i === seq[inputIdx]) { inputIdx++; if (inputIdx >= seq.length) { accepting = false; status.textContent = 'Flot! 🌟'; tone(659); ctx.later(ctx.done, 500); } }
      else { accepting = false; status.textContent = 'Næsten — prøv igen 🙂'; ctx.later(play, 800); }
    }));
    cancelWire(ctx); play();
  }

  // C: count one flower in the patch
  function taskCount(ctx) {
    const target = pickN(FLOWERS(), 1)[0];
    const others = FLOWERS().filter((f) => f !== target);
    const count = 2 + Math.floor(Math.random() * (ctx.level.countMax - 1)); // 2..countMax
    const noise = 3 + Math.floor(Math.random() * 4);
    const items = [];
    for (let i = 0; i < count; i++) items.push(target);
    for (let i = 0; i < noise; i++) items.push(others[Math.floor(Math.random() * others.length)]);
    const scene = pickN(items);
    const opts = new Set([count]);
    while (opts.size < 4) { const d = count + (Math.floor(Math.random() * 5) - 2); if (d >= 1 && d !== count) opts.add(d); }
    ctx.mount(
      '<h3>Tæl blomsterne 🌼</h3><p>Hvor mange ' + target + ' kan du se?</p>' +
      '<div class="gd-show">' + scene.map((f) => '<span>' + f + '</span>').join('') + '</div>' +
      '<div class="gd-nums">' + pickN([...opts]).map((o) => '<button class="gd-num"' + (o === count ? ' data-correct="1"' : '') + '>' + o + '</button>').join('') + '</div>' +
      '<button class="btn btn-secondary gd-cancel">Senere</button>'
    );
    wireAnswers(ctx, '.gd-num');
  }

  // D: spot the different flower
  function taskOdd(ctx) {
    const [base, odd] = pickN(FLOWERS(), 2);
    const n = ctx.level.oddTiles, cols = Math.round(Math.sqrt(n));
    const pos = Math.floor(Math.random() * n);
    const cells = []; for (let i = 0; i < n; i++) cells.push(i === pos ? odd : base);
    ctx.mount(
      '<h3>Find den anderledes 🔍</h3><p>Tryk på den blomst der er anderledes.</p>' +
      '<div class="gd-grid" style="grid-template-columns:repeat(' + cols + ',1fr)">' + cells.map((f, i) => '<button class="gd-cell"' + (i === pos ? ' data-correct="1"' : '') + '>' + f + '</button>').join('') + '</div>' +
      '<button class="btn btn-secondary gd-cancel">Senere</button>'
    );
    wireAnswers(ctx, '.gd-cell');
  }

  // E: memorise a set, then name the one that vanished
  function taskMissing(ctx) {
    const size = Math.min(4 + Math.max(0, ctx.level.seqLen - 3), 6);
    const set = pickN(FLOWERS(), size);
    const missing = set[Math.floor(Math.random() * set.length)];
    ctx.mount(
      '<h3>Hvad mangler? 🧠</h3><p id="gd-miss-status">Kig godt efter…</p>' +
      '<div class="gd-show" id="gd-miss-show">' + set.map((f) => '<span>' + f + '</span>').join('') + '</div>' +
      '<div class="gd-nums gd-hidden" id="gd-miss-opts">' + pickN(set).map((f) => '<button class="gd-pad"' + (f === missing ? ' data-correct="1"' : '') + '>' + f + '</button>').join('') + '</div>' +
      '<button class="btn btn-secondary gd-cancel">Senere</button>'
    );
    const showRow = ctx.overlay.querySelector('#gd-miss-show');
    const opts = ctx.overlay.querySelector('#gd-miss-opts');
    const status = ctx.overlay.querySelector('#gd-miss-status');
    ctx.later(() => {
      showRow.innerHTML = set.filter((f) => f !== missing).map((f) => '<span>' + f + '</span>').join('') + '<span class="gd-miss-gap">❔</span>';
      status.textContent = 'Hvilken blomst er væk?'; opts.classList.remove('gd-hidden');
    }, 2600);
    wireAnswers(ctx, '#gd-miss-opts .gd-pad');
  }

  // F: tap all the flowers of one colour
  const COLOR_FLOWERS = [
    { word: 'gule', dot: '🟡', flower: '🌻' }, { word: 'røde', dot: '🔴', flower: '🌹' },
    { word: 'lilla', dot: '🟣', flower: '🪻' }, { word: 'lyserøde', dot: '🩷', flower: '🌸' },
  ];
  function taskSortColor(ctx) {
    const target = COLOR_FLOWERS[Math.floor(Math.random() * COLOR_FLOWERS.length)];
    const others = COLOR_FLOWERS.filter((c) => c !== target);
    const tCount = ctx.level.sortTargets;
    const items = []; for (let i = 0; i < tCount; i++) items.push(target.flower);
    const dCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < dCount; i++) items.push(others[Math.floor(Math.random() * others.length)].flower);
    ctx.mount(
      '<h3>Sortér efter farve ' + target.dot + '</h3><p>Tryk på alle de ' + target.word + ' blomster.</p>' +
      '<div class="gd-grid" style="grid-template-columns:repeat(3,1fr)">' + pickN(items).map((f) => '<button class="gd-cell"' + (f === target.flower ? ' data-correct="1"' : '') + '>' + f + '</button>').join('') + '</div>' +
      '<button class="btn btn-secondary gd-cancel">Senere</button>'
    );
    let found = 0;
    ctx.overlay.querySelectorAll('.gd-cell').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.done) return;
      if (b.dataset.correct) { b.dataset.done = '1'; b.classList.add('right'); tone(523.25, 110); if (++found === tCount) { tone(659); ctx.later(ctx.done, 420); } }
      else { b.classList.add('wrong'); tone(196, 160); buzz(20); ctx.later(() => b.classList.remove('wrong'), 500); }
    }));
    cancelWire(ctx);
  }

  const TASKS = [taskFindPair, taskRemember, taskCount, taskOdd, taskMissing, taskSortColor];
  function run(ctx) { TASKS[Math.floor(Math.random() * TASKS.length)](ctx); }

  root.GardenTasks = { run, count: TASKS.length };
})(typeof globalThis !== 'undefined' ? globalThis : this);
