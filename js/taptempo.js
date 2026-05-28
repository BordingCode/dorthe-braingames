/* ===== Tap tempoet (tap the tempo of a well-known song) ===== */

(function () {
  const DIFFICULTIES = [
    { label: 'Let', value: 'easy' },
    { label: 'Medium', value: 'medium' },
    { label: 'Svær', value: 'hard' },
  ];
  const LABEL_MAP = { easy: 'Let', medium: 'Medium', hard: 'Svær' };

  // How far off (as a fraction) still counts as a win
  const TOLERANCE = { easy: 0.10, medium: 0.07, hard: 0.05 };

  // Evergreens / hits with their (widely-cited) tempo. The song is just a
  // familiar reference to tap along to; BPM only needs to be roughly right.
  const SONGS = [
    { title: 'What a Wonderful World', artist: 'Louis Armstrong', bpm: 52 },
    { title: 'Let It Be', artist: 'The Beatles', bpm: 72 },
    { title: 'Hey Jude', artist: 'The Beatles', bpm: 75 },
    { title: 'Imagine', artist: 'John Lennon', bpm: 76 },
    { title: 'Knowing Me, Knowing You', artist: 'ABBA', bpm: 78 },
    { title: 'We Will Rock You', artist: 'Queen', bpm: 81 },
    { title: 'Take Me Home, Country Roads', artist: 'John Denver', bpm: 82 },
    { title: 'Wonderwall', artist: 'Oasis', bpm: 87 },
    { title: 'Africa', artist: 'Toto', bpm: 93 },
    { title: 'Yesterday', artist: 'The Beatles', bpm: 96 },
    { title: 'Sweet Home Alabama', artist: 'Lynyrd Skynyrd', bpm: 98 },
    { title: 'Dancing Queen', artist: 'ABBA', bpm: 101 },
    { title: "Stayin' Alive", artist: 'Bee Gees', bpm: 104 },
    { title: 'Smoke on the Water', artist: 'Deep Purple', bpm: 112 },
    { title: 'I Will Survive', artist: 'Gloria Gaynor', bpm: 116 },
    { title: 'Billie Jean', artist: 'Michael Jackson', bpm: 117 },
    { title: 'Y.M.C.A.', artist: 'Village People', bpm: 127 },
    { title: 'Mamma Mia', artist: 'ABBA', bpm: 138 },
    { title: "Don't Stop Me Now", artist: 'Queen', bpm: 156 },
    { title: 'Wake Me Up Before You Go-Go', artist: 'Wham!', bpm: 167 },
    { title: 'Fernando', artist: 'ABBA', bpm: 74 },
    { title: 'Super Trouper', artist: 'ABBA', bpm: 115 },
    { title: 'SOS', artist: 'ABBA', bpm: 120 },
    { title: 'Waterloo', artist: 'ABBA', bpm: 140 },
    { title: 'Hotel California', artist: 'Eagles', bpm: 75 },
    { title: 'Help!', artist: 'The Beatles', bpm: 94 },
    { title: 'Twist and Shout', artist: 'The Beatles', bpm: 124 },
    { title: 'Here Comes the Sun', artist: 'The Beatles', bpm: 129 },
    { title: 'We Are the Champions', artist: 'Queen', bpm: 64 },
    { title: 'Another One Bites the Dust', artist: 'Queen', bpm: 110 },
    { title: 'Suspicious Minds', artist: 'Elvis Presley', bpm: 115 },
    { title: 'Jailhouse Rock', artist: 'Elvis Presley', bpm: 168 },
    { title: 'Night Fever', artist: 'Bee Gees', bpm: 109 },
    { title: 'Stand By Me', artist: 'Ben E. King', bpm: 118 },
    { title: 'Eye of the Tiger', artist: 'Survivor', bpm: 109 },
    { title: 'Daddy Cool', artist: 'Boney M.', bpm: 113 },
    { title: 'Sweet Dreams (Are Made of This)', artist: 'Eurythmics', bpm: 126 },
    { title: 'Uptown Girl', artist: 'Billy Joel', bpm: 128 },
    { title: "Livin' on a Prayer", artist: 'Bon Jovi', bpm: 123 },
    { title: 'The Final Countdown', artist: 'Europe', bpm: 117 },
    { title: 'Barbie Girl', artist: 'Aqua', bpm: 131 },
  ];

  const TAPS_NEEDED = 10;

  let level = 'easy';
  let song = SONGS[0];
  let target = song.bpm;
  let taps = [];
  let finished = false;
  let lastSong = null;
  let finishTimer = null;
  let previewTimer = null;
  let previewing = false;

  const countEl = document.getElementById('taptempo-count');
  const targetEl = document.getElementById('taptempo-target');
  const songEl = document.getElementById('taptempo-song');
  const padEl = document.getElementById('taptempo-pad');
  const hintEl = document.getElementById('taptempo-hint');
  const diffBtn = document.getElementById('taptempo-diff-btn');

  function pickSong() {
    let s;
    do {
      s = SONGS[Math.floor(Math.random() * SONGS.length)];
    } while (s === lastSong && SONGS.length > 1);
    lastSong = s;
    return s;
  }

  function initTapTempo() {
    level = getDifficulty('taptempo') || 'easy';
    diffBtn.textContent = LABEL_MAP[level] || 'Let';
    newRound();
  }

  function newRound() {
    stopPreview();
    if (finishTimer) { clearTimeout(finishTimer); finishTimer = null; }
    song = pickSong();
    target = song.bpm;
    taps = [];
    finished = false;
    songEl.textContent = '«' + song.title + '» – ' + song.artist;
    targetEl.textContent = target;
    countEl.textContent = '0/' + TAPS_NEEDED;
    padEl.textContent = 'TRYK';
    padEl.classList.remove('done');
    hintEl.textContent = 'Nynn melodien og tryk takten ' + TAPS_NEEDED + ' gange';
  }

  function handleTap() {
    if (finished) return;
    stopPreview();
    taps.push(performance.now());
    vibrate(15);

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

  // Average of the tap intervals, dropping the first (the first gap is often a
  // slow "settling" tap before the beat is steady). Falls back to all intervals
  // when there are too few to spare one.
  function computeBpm() {
    const intervals = [];
    for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1]);
    if (intervals.length === 0) return 0;
    const used = intervals.length > 2 ? intervals.slice(1) : intervals;
    const avg = used.reduce((a, b) => a + b, 0) / used.length;
    if (avg <= 0) return 0;
    return Math.round(60000 / avg);
  }

  function finish() {
    finished = true;
    stopPreview();
    padEl.textContent = '✓';
    padEl.classList.add('done');

    const bpm = computeBpm();
    if (!bpm) {
      hintEl.textContent = 'Tryk lidt langsommere næste gang.';
      newRound();
      return;
    }

    const fracOff = Math.abs(bpm - target) / target;
    const won = fracOff <= (TOLERANCE[level] || 0.10);
    const accuracy = Math.max(0, Math.round((1 - fracOff) * 100));

    Stats.record('taptempo', {
      won,
      time: 0,
      difficulty: level,
      extra: { bestAccuracy: Math.max(Stats.get('taptempo').bestAccuracy || 0, accuracy) },
    });

    const fasterSlower = bpm > target ? 'lidt for hurtigt' : (bpm < target ? 'lidt for langsomt' : 'helt perfekt');
    const statsHtml =
      '«' + song.title + '» spilles i <b>' + target + '</b> slag/min<br>' +
      'Du ramte: <b>' + bpm + '</b> slag/min<br>' +
      (won ? 'Flot ramt!' : 'Du var ' + fasterSlower) +
      '<br>Træfsikkerhed: <b>' + accuracy + '%</b>';

    finishTimer = setTimeout(() => {
      finishTimer = null;
      showResult(won, statsHtml, 'taptempo');
    }, 350);
  }

  // Optional, gentle metronome so the target tempo can be heard, not just read.
  // One soft sine "tick" per beat for a couple of bars, then stops on its own.
  function startPreview() {
    if (finished) return;
    if (previewing) { stopPreview(); return; }
    previewing = true;
    previewBtn.classList.add('playing');
    previewBtn.textContent = '⏸ Stop tempoet';
    const intervalMs = 60000 / target;
    let beat = 0;
    const tick = () => {
      if (!previewing) return;
      playTone(660, 70, 'sine');
      padEl.classList.remove('pulse');
      void padEl.offsetWidth;
      padEl.classList.add('pulse');
      beat++;
      if (beat >= 8) { stopPreview(); return; }
      previewTimer = setTimeout(tick, intervalMs);
    };
    tick();
  }

  function stopPreview() {
    previewing = false;
    if (previewTimer) { clearTimeout(previewTimer); previewTimer = null; }
    if (previewBtn) {
      previewBtn.classList.remove('playing');
      previewBtn.textContent = '🔊 Hør tempoet';
    }
  }

  const previewBtn = document.createElement('button');
  previewBtn.id = 'taptempo-preview';
  previewBtn.className = 'tt-preview';
  previewBtn.type = 'button';
  previewBtn.textContent = '🔊 Hør tempoet';
  previewBtn.addEventListener('click', startPreview);
  if (padEl && padEl.parentNode) padEl.parentNode.insertBefore(previewBtn, padEl);

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
  window.gameCleanups.taptempo = function () {
    finished = true;
    stopPreview();
    if (finishTimer) { clearTimeout(finishTimer); finishTimer = null; }
  };
})();
