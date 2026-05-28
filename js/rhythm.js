/* ===== Rytmespil (percussion rhythm reading / echo) ===== */

(function () {
  /* ---------- Instruments (synthesized percussion) ---------- */

  const INSTRUMENTS = {
    wood: { name: 'Træblok', color: '#C4A35A', y: 78 },
    kick: { name: 'Tromme', color: '#3D6147', y: 88 },
    clap: { name: 'Klap', color: '#D9534F', y: 70 },
    hat:  { name: 'Hi-hat', color: '#4AA3C4', y: 60 },
  };

  let _noise = null;
  function noiseBuffer(ctx) {
    if (_noise && _noise.sampleRate === ctx.sampleRate) return _noise;
    const len = Math.floor(ctx.sampleRate * 0.4);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    _noise = buf;
    return buf;
  }

  // All envelopes use soft ramps so nothing clicks; peaks kept modest.
  function envGain(ctx, when, peak, decay) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(peak, when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    return g;
  }

  function playKick(ctx, when) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, when);
    osc.frequency.exponentialRampToValueAtTime(52, when + 0.12);
    const g = envGain(ctx, when, 0.6, 0.22);
    osc.connect(g).connect(ctx.destination);
    osc.start(when);
    osc.stop(when + 0.26);
  }

  function playWood(ctx, when) {
    [1180, 1770].forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, when);
      const g = envGain(ctx, when, i === 0 ? 0.34 : 0.16, 0.075);
      osc.connect(g).connect(ctx.destination);
      osc.start(when);
      osc.stop(when + 0.1);
    });
  }

  function playClap(ctx, when) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1500;
    bp.Q.value = 0.9;
    const g = ctx.createGain();
    // three quick bursts -> soft clap, then a short decay tail
    g.gain.setValueAtTime(0.0001, when);
    [0, 0.011, 0.022].forEach((d) => {
      g.gain.linearRampToValueAtTime(0.42, when + d + 0.002);
      g.gain.exponentialRampToValueAtTime(0.12, when + d + 0.01);
    });
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(when);
    src.stop(when + 0.2);
  }

  function playHat(ctx, when) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7200;
    const g = envGain(ctx, when, 0.22, 0.045);
    src.connect(hp).connect(g).connect(ctx.destination);
    src.start(when);
    src.stop(when + 0.08);
  }

  function playTick(ctx, when, accent) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = accent ? 1000 : 750;
    const g = envGain(ctx, when, accent ? 0.4 : 0.26, 0.06);
    osc.connect(g).connect(ctx.destination);
    osc.start(when);
    osc.stop(when + 0.09);
  }

  const PLAY = { kick: playKick, wood: playWood, clap: playClap, hat: playHat };

  function playInst(inst, when) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    (PLAY[inst] || playWood)(ctx, when == null ? ctx.currentTime : when);
  }

  /* ---------- Notation geometry ---------- */

  const VB_W = 340, VB_H = 120;
  const X0 = 34, X1 = 312, USABLE = X1 - X0;
  const STAFF_Y = 78;

  function slotX(slot) { return X0 + (slot / 8) * USABLE; }
  function progLeftPct(prog) { return ((X0 + prog * USABLE) / VB_W) * 100; }

  /* ---------- DOM ---------- */

  const notationEl = document.getElementById('rhythm-notation');
  const svgWrap = document.getElementById('rhythm-svg');
  const playhead = document.getElementById('rhythm-playhead');
  const dotsEl = document.getElementById('rhythm-beats');
  const statusEl = document.getElementById('rhythm-status');
  const padsEl = document.getElementById('rhythm-pads');
  const levelEl = document.getElementById('rhythm-level');
  const bestEl = document.getElementById('rhythm-best');
  const startBtn = document.getElementById('rhythm-start');
  const modeBtn = document.getElementById('rhythm-mode-btn');

  /* ---------- State ---------- */

  const SVGNS = 'http://www.w3.org/2000/svg';
  let mode = 'read';            // 'read' | 'echo'
  let level = 1;
  let cleared = 0;
  let best = 0;
  let measure = null;
  let listening = false;        // accepting taps
  let stopped = false;
  let timers = [];
  let raf = 0;
  let turnStartPerf = 0;

  function later(fn, ms) {
    const id = setTimeout(() => { if (!stopped) fn(); }, Math.max(0, ms));
    timers.push(id);
    return id;
  }
  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  /* ---------- Measure generation ---------- */

  function paramsFor(lv) {
    let kit, cells;
    if (lv <= 2)      { kit = ['wood'];                  cells = ['Q']; }
    else if (lv <= 4) { kit = ['wood'];                  cells = ['Q', 'EE']; }
    else if (lv <= 6) { kit = ['kick', 'wood'];          cells = ['Q', 'EE', 'Z']; }
    else if (lv <= 8) { kit = ['kick', 'clap', 'hat'];   cells = ['Q', 'EE', 'Z', 'E_']; }
    else              { kit = ['kick', 'clap', 'hat', 'wood']; cells = ['Q', 'EE', 'Z', 'E_', '_E']; }
    const bpm = Math.min(126, 72 + (lv - 1) * 5);
    return { kit, cells, bpm };
  }

  function assignInstrument(slot, kit) {
    if (kit.length === 1) return kit[0];
    const low  = kit.includes('kick') ? 'kick' : kit[0];
    const back = kit.includes('clap') ? 'clap' : (kit.includes('wood') ? 'wood' : kit[kit.length - 1]);
    const off  = kit.includes('hat')  ? 'hat'  : kit[kit.length - 1];
    if (slot % 4 === 0) return low;          // beats 1 & 3
    if (slot === 2 || slot === 6) return back; // beats 2 & 4
    if (slot % 2 === 1) return off;          // off-beats
    return back;
  }

  function buildMeasure(lv) {
    const { kit, cells, bpm } = paramsFor(lv);
    const beatMs = 60000 / bpm;
    const eighthMs = beatMs / 2;

    let chosen, hits, rests;
    let attempts = 0;
    do {
      chosen = [];
      hits = [];
      rests = [];
      for (let b = 0; b < 4; b++) {
        const cell = cells[Math.floor(Math.random() * cells.length)];
        chosen.push(cell);
        const base = b * 2;
        if (cell === 'Q') {
          hits.push({ slot: base, dur: 2, kind: 'q' });
        } else if (cell === 'EE') {
          hits.push({ slot: base, dur: 1, kind: 'e', beam: true });
          hits.push({ slot: base + 1, dur: 1, kind: 'e', beam: true });
        } else if (cell === 'E_') {
          hits.push({ slot: base, dur: 1, kind: 'e' });
          rests.push({ slot: base + 1, kind: 'er' });
        } else if (cell === '_E') {
          rests.push({ slot: base, kind: 'er' });
          hits.push({ slot: base + 1, dur: 1, kind: 'e' });
        } else if (cell === 'Z') {
          rests.push({ slot: base, kind: 'qr' });
        }
      }
      attempts++;
    } while (hits.length < 2 && attempts < 20);

    hits.forEach((h) => {
      h.inst = assignInstrument(h.slot, kit);
      h.time = h.slot * eighthMs;
      h.status = 'pending';
    });

    return { kit, bpm, beatMs, eighthMs, measureMs: beatMs * 4, hits, rests, cells: chosen };
  }

  /* ---------- Notation rendering ---------- */

  function el(tag, attrs) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function renderNotation(m, hidden) {
    svgWrap.innerHTML = '';
    const svg = el('svg', { viewBox: '0 0 ' + VB_W + ' ' + VB_H, class: 'rn-svg' });

    // staff line
    svg.appendChild(el('line', { x1: X0 - 6, y1: STAFF_Y, x2: X1 + 6, y2: STAFF_Y, class: 'rn-staff' }));
    // time signature
    const ts = el('text', { x: 12, y: STAFF_Y + 6, class: 'rn-time' });
    ts.textContent = '4/4';
    svg.appendChild(ts);

    // beat ticks + numbers
    for (let b = 0; b < 4; b++) {
      const x = slotX(b * 2);
      svg.appendChild(el('line', { x1: x, y1: STAFF_Y - 22, x2: x, y2: STAFF_Y + 16, class: 'rn-tick' }));
      const num = el('text', { x: x, y: STAFF_Y + 34, class: 'rn-beatnum' });
      num.textContent = (b + 1) + '';
      svg.appendChild(num);
    }
    // final barline
    svg.appendChild(el('line', { x1: X1 + 6, y1: STAFF_Y - 22, x2: X1 + 6, y2: STAFF_Y + 16, class: 'rn-bar' }));

    if (!hidden) {
      m.rests.forEach((r) => svg.appendChild(restGlyph(r)));
      // group hits into a notes layer
      m.hits.forEach((h) => {
        const cy = INSTRUMENTS[h.inst].y;
        const cx = slotX(h.slot) + 9;
        const note = el('g', { class: 'rn-note', id: 'rn-note-' + h.slot });
        // notehead
        note.appendChild(el('ellipse', {
          cx: cx, cy: cy, rx: 7, ry: 5.2,
          transform: 'rotate(-18 ' + cx + ' ' + cy + ')',
          fill: INSTRUMENTS[h.inst].color, class: 'rn-head',
        }));
        // stem
        const stemX = cx + 6.4;
        note.appendChild(el('line', { x1: stemX, y1: cy - 2, x2: stemX, y2: cy - 34, class: 'rn-stem' }));
        h._stemX = stemX;
        h._cy = cy;
        svg.appendChild(note);
      });
      // beams + flags
      drawBeamsAndFlags(svg, m);
    }

    svgWrap.appendChild(svg);
  }

  function drawBeamsAndFlags(svg, m) {
    const beamed = m.hits.filter((h) => h.beam);
    // pair beamed eighths by beat
    for (let i = 0; i < beamed.length; i += 2) {
      const a = beamed[i], b = beamed[i + 1];
      if (!b) { svg.appendChild(flag(a)); continue; }
      const topY = Math.min(a._cy, b._cy) - 34;
      svg.appendChild(el('line', {
        x1: a._stemX, y1: topY, x2: b._stemX, y2: topY, class: 'rn-beam',
      }));
    }
    // lone eighths (E_ / _E) get a flag
    m.hits.filter((h) => h.kind === 'e' && !h.beam).forEach((h) => svg.appendChild(flag(h)));
  }

  function flag(h) {
    const x = h._stemX, y = h._cy - 34;
    const p = el('path', {
      d: 'M ' + x + ' ' + y + ' q 10 6 7 18 q 4 -10 -7 -13 z',
      class: 'rn-flag',
    });
    return p;
  }

  function restGlyph(r) {
    const cx = slotX(r.slot) + (r.kind === 'qr' ? USABLE / 8 : 9);
    const g = el('g', { class: 'rn-rest' });
    if (r.kind === 'qr') {
      g.appendChild(el('path', {
        d: 'M ' + (cx - 4) + ' ' + (STAFF_Y - 14) +
           ' l 7 8 l -7 7 l 8 9' +
           ' M ' + (cx + 4) + ' ' + (STAFF_Y + 10) + ' q -7 -4 -2 -9',
        class: 'rn-rest-stroke',
      }));
    } else {
      // eighth rest: dot + diagonal
      g.appendChild(el('circle', { cx: cx - 3, cy: STAFF_Y - 6, r: 2.6, class: 'rn-rest-dot' }));
      g.appendChild(el('line', { x1: cx - 2, y1: STAFF_Y - 5, x2: cx + 4, y2: STAFF_Y + 9, class: 'rn-rest-stroke' }));
    }
    return g;
  }

  function markNote(slot, cls) {
    const n = document.getElementById('rn-note-' + slot);
    if (n) n.classList.add(cls);
  }

  /* ---------- Pads ---------- */

  function renderPads(kit) {
    padsEl.innerHTML = '';
    padsEl.style.setProperty('--pad-count', kit.length);
    kit.forEach((inst) => {
      const info = INSTRUMENTS[inst];
      const btn = document.createElement('button');
      btn.className = 'rn-pad';
      btn.dataset.inst = inst;
      btn.style.setProperty('--c', info.color);
      btn.innerHTML = '<span class="rn-pad-dot"></span><span class="rn-pad-name">' + info.name + '</span>';
      btn.addEventListener('click', () => onPad(inst, btn));
      padsEl.appendChild(btn);
    });
  }

  function pulsePad(btn) {
    btn.classList.remove('hit');
    void btn.offsetWidth;
    btn.classList.add('hit');
  }

  /* ---------- Beat dots ---------- */

  function buildDots() {
    dotsEl.innerHTML = '';
    for (let b = 0; b < 4; b++) {
      const d = document.createElement('div');
      d.className = 'rn-dot';
      d.textContent = (b + 1) + '';
      dotsEl.appendChild(d);
    }
  }
  function pulseDot(b, cls) {
    const d = dotsEl.children[b];
    if (!d) return;
    d.classList.remove('count', 'play');
    void d.offsetWidth;
    d.classList.add(cls || 'play');
    later(() => d.classList.remove('count', 'play'), 260);
  }

  /* ---------- Flow ---------- */

  function initRhythm() {
    mode = getDifficulty('rhythm') === 'echo' ? 'echo' : 'read';
    modeBtn.textContent = mode === 'echo' ? 'Gentag' : 'Læs';
    best = Stats.get('rhythm').bestStreak || 0;
    stopped = false;
    listening = false;
    clearTimers();
    cleared = 0;
    level = 1;
    levelEl.textContent = '0';
    bestEl.textContent = best;
    statusEl.textContent = 'Tryk Start';
    statusEl.className = 'rn-status';
    startBtn.style.display = '';
    buildDots();
    padsEl.innerHTML = '';
    svgWrap.innerHTML = '';
    playhead.style.opacity = '0';
  }

  function startGame() {
    stopped = false;
    clearTimers();
    cleared = 0;
    level = 1;
    best = Stats.get('rhythm').bestStreak || 0;
    bestEl.textContent = best;
    startBtn.style.display = 'none';
    getAudioCtx(); // unlock audio on this gesture
    nextRound();
  }

  function nextRound() {
    listening = false;
    measure = buildMeasure(level);
    levelEl.textContent = level;
    renderPads(measure.kit);
    setPadsEnabled(false);
    playhead.style.opacity = '0';
    playhead.style.left = progLeftPct(0) + '%';

    if (mode === 'echo') {
      renderNotation(measure, true); // hidden notes
      statusEl.textContent = 'Lyt godt efter…';
      statusEl.className = 'rn-status listen';
      countIn(() => demoThenTurn());
    } else {
      renderNotation(measure, false);
      statusEl.textContent = 'Gør klar – tæl med';
      statusEl.className = 'rn-status listen';
      countIn(() => startTurn());
    }
  }

  function countIn(done) {
    const ctx = getAudioCtx();
    const beatMs = measure.beatMs;
    const lead = 0.2;
    if (ctx) {
      const t0 = ctx.currentTime + lead;
      for (let b = 0; b < 4; b++) playTick(ctx, t0 + b * (beatMs / 1000), b === 0);
    }
    const perf0 = performance.now() + lead * 1000;
    for (let b = 0; b < 4; b++) {
      later(() => pulseDot(b, 'count'), (perf0 - performance.now()) + b * beatMs);
    }
    later(done, (perf0 - performance.now()) + 4 * beatMs);
  }

  function demoThenTurn() {
    // play the rhythm once (audio + playhead), notes stay hidden
    statusEl.textContent = 'Lyt…';
    statusEl.className = 'rn-status listen';
    const ctx = getAudioCtx();
    const lead = 0.12;
    if (ctx) {
      const t0 = ctx.currentTime + lead;
      measure.hits.forEach((h) => playInst(h.inst, t0 + h.time / 1000));
    }
    const perf0 = performance.now() + lead * 1000;
    animatePlayhead(perf0);
    for (let b = 0; b < 4; b++) {
      later(() => pulseDot(b, 'play'), (perf0 - performance.now()) + b * measure.beatMs);
    }
    // after the demo measure, count-in again, then player's turn
    later(() => {
      statusEl.textContent = 'Din tur!';
      statusEl.className = 'rn-status your-turn';
      countIn(() => startTurn());
    }, (perf0 - performance.now()) + measure.measureMs + 350);
  }

  function startTurn() {
    listening = true;
    setPadsEnabled(true);
    statusEl.textContent = mode === 'echo' ? 'Spil rytmen!' : 'Spil nu!';
    statusEl.className = 'rn-status your-turn';
    turnStartPerf = performance.now();
    animatePlayhead(turnStartPerf);
    for (let b = 0; b < 4; b++) {
      later(() => pulseDot(b, 'play'), b * measure.beatMs);
    }
    const tail = Math.max(220, measure.beatMs * 0.5);
    later(evaluate, measure.measureMs + tail);
  }

  function animatePlayhead(startPerf) {
    playhead.style.opacity = '1';
    function step() {
      if (stopped) return;
      const prog = Math.min(1, (performance.now() - startPerf) / measure.measureMs);
      playhead.style.left = progLeftPct(prog) + '%';
      if (prog < 1) raf = requestAnimationFrame(step);
      else playhead.style.opacity = '0';
    }
    raf = requestAnimationFrame(step);
  }

  function onPad(inst, btn) {
    playInst(inst, null);
    pulsePad(btn);
    vibrate(12);
    if (!listening) return;
    const t = performance.now() - turnStartPerf;
    const winMs = measure.beatMs * 0.45;
    let bestHit = null, bestDelta = Infinity;
    measure.hits.forEach((h) => {
      if (h.status !== 'pending' || h.inst !== inst) return;
      const d = Math.abs(h.time - t);
      if (d < bestDelta) { bestDelta = d; bestHit = h; }
    });
    if (bestHit && bestDelta <= winMs) {
      bestHit.status = 'hit';
      if (mode !== 'echo') markNote(bestHit.slot, 'hit');
    }
  }

  function setPadsEnabled(on) {
    padsEl.classList.toggle('disabled', !on);
  }

  function evaluate() {
    listening = false;
    setPadsEnabled(false);
    playhead.style.opacity = '0';

    const total = measure.hits.length;
    const good = measure.hits.filter((h) => h.status === 'hit').length;
    const ratio = total ? good / total : 1;
    const pass = ratio >= 0.6;

    // reveal + mark in echo, mark misses in read
    if (mode === 'echo') renderNotation(measure, false);
    measure.hits.forEach((h) => {
      markNote(h.slot, h.status === 'hit' ? 'hit' : 'missed');
    });

    if (pass) {
      cleared++;
      level++;
      if (cleared > best) { best = cleared; bestEl.textContent = best; }
      statusEl.textContent = ratio === 1 ? 'Perfekt! ✓' : 'Flot! ✓';
      statusEl.className = 'rn-status your-turn';
      playTone(660, 140, 'sine');
      later(() => playTone(880, 200, 'sine'), 130);
      later(nextRound, 1100);
    } else {
      gameOver(good, total);
    }
  }

  function gameOver(good, total) {
    statusEl.textContent = 'Av – ikke helt!';
    statusEl.className = 'rn-status wrong';
    playTone(330, 200, 'sine');
    later(() => playTone(247, 300, 'sine'), 170);
    vibrate([40, 60, 40]);

    const prevBest = Stats.get('rhythm').bestStreak || 0;
    const won = cleared > 0 && cleared >= prevBest;
    Stats.record('rhythm', {
      won,
      time: 0,
      difficulty: mode,
      extra: { bestStreak: Math.max(prevBest, cleared) },
    });

    const statsHtml =
      'Rytmer i træk: <b>' + cleared + '</b><br>' +
      'Sidste: <b>' + good + '/' + total + '</b> rigtige<br>' +
      'Rekord: <b>' + Math.max(prevBest, cleared) + '</b>';
    later(() => showResult(won, statsHtml, 'rhythm'), 900);
  }

  startBtn.addEventListener('click', startGame);

  modeBtn.onclick = () => {
    showDifficultyModal('rhythm', [
      { label: 'Læs rytmen (se noderne)', value: 'read' },
      { label: 'Gentag rytmen (efter gehør)', value: 'echo' },
    ], (val) => {
      mode = val === 'echo' ? 'echo' : 'read';
      modeBtn.textContent = mode === 'echo' ? 'Gentag' : 'Læs';
      initRhythm();
    });
  };

  window.initRhythm = initRhythm;
  window.gameRestarters.rhythm = startGame;
  window.gameCleanups.rhythm = function () {
    stopped = true;
    listening = false;
    clearTimers();
  };
})();
