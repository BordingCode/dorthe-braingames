/* ===== Tap tempoet (BPM tap game) ===== */

(function () {
  const DIFFICULTIES = [
    { label: 'Let', value: 'easy' },
    { label: 'Medium', value: 'medium' },
    { label: 'Svær', value: 'hard' },
  ];
  const LABEL_MAP = { easy: 'Let', medium: 'Medium', hard: 'Svær' };

  // tolerance = how far off (as a fraction) still counts as a win
  const CONFIG = {
    easy:   { tolerance: 0.10, pick: () => pickFrom([60, 70, 80, 90, 100, 110, 120]) },
    medium: { tolerance: 0.07, pick: () => 55 + 5 * Math.floor(Math.random() * 18) }, // 55..140 step 5
    hard:   { tolerance: 0.05, pick: () => 50 + Math.floor(Math.random() * 119) },    // 50..168
  };

  const TAPS_NEEDED = 10;

  let level = 'easy';
  let target = 90;
  let taps = [];          // timestamps
  let finished = false;

  const countEl = document.getElementById('taptempo-count');
  const targetEl = document.getElementById('taptempo-target');
  const padEl = document.getElementById('taptempo-pad');
  const hintEl = document.getElementById('taptempo-hint');
  const diffBtn = document.getElementById('taptempo-diff-btn');

  function pickFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getConfig() {
    return CONFIG[level] || CONFIG.easy;
  }

  function initTapTempo() {
    level = getDifficulty('taptempo') || 'easy';
    diffBtn.textContent = LABEL_MAP[level] || 'Let';
    newRound();
  }

  function newRound() {
    target = getConfig().pick();
    taps = [];
    finished = false;
    targetEl.textContent = target;
    countEl.textContent = '0/' + TAPS_NEEDED;
    padEl.textContent = 'TRYK';
    padEl.classList.remove('done');
    hintEl.textContent = 'Tryk ' + TAPS_NEEDED + ' gange i den takt du tror passer';
  }

  function handleTap() {
    if (finished) return;
    taps.push(performance.now());
    vibrate(15);

    // pulse animation
    padEl.classList.remove('pulse');
    void padEl.offsetWidth; // reflow to restart animation
    padEl.classList.add('pulse');

    countEl.textContent = taps.length + '/' + TAPS_NEEDED;

    if (taps.length === 1) {
      hintEl.textContent = 'Bliv ved i samme takt…';
    } else if (taps.length >= TAPS_NEEDED) {
      finish();
    }
  }

  function finish() {
    finished = true;
    padEl.textContent = '✓';
    padEl.classList.add('done');

    // BPM from the 9 intervals between the 10 taps
    const totalMs = taps[taps.length - 1] - taps[0];
    const avgInterval = totalMs / (taps.length - 1);
    const bpm = Math.round(60000 / avgInterval);

    const diff = Math.abs(bpm - target);
    const fracOff = diff / target;
    const tolerance = getConfig().tolerance;
    const won = fracOff <= tolerance;
    const accuracy = Math.max(0, Math.round((1 - fracOff) * 100));

    Stats.record('taptempo', {
      won,
      time: 0,
      difficulty: level,
      extra: { bestAccuracy: Math.max(Stats.get('taptempo').bestAccuracy || 0, accuracy) },
    });

    const fasterSlower = bpm > target ? 'lidt for hurtigt' : (bpm < target ? 'lidt for langsomt' : 'helt perfekt');
    const statsHtml =
      'Mål: <b>' + target + '</b> slag/min<br>' +
      'Du ramte: <b>' + bpm + '</b> slag/min<br>' +
      (won ? 'Flot ramt!' : 'Du var ' + fasterSlower) +
      '<br>Træfsikkerhed: <b>' + accuracy + '%</b>';

    setTimeout(() => showResult(won, statsHtml, 'taptempo'), 350);
  }

  padEl.addEventListener('click', handleTap);

  diffBtn.onclick = () => {
    showDifficultyModal('taptempo', DIFFICULTIES, (val) => {
      level = val;
      diffBtn.textContent = LABEL_MAP[val] || 'Let';
      newRound();
    });
  };

  window.initTapTempo = initTapTempo;
  window.gameRestarters.taptempo = function () { newRound(); };
  window.gameCleanups.taptempo = function () { finished = true; };
})();
