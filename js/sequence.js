/* ===== Husk rækkefølgen (Simon-style spatial sequence) ===== */

(function () {
  const DIFFICULTIES = [
    { label: 'Let (3×3)', value: 'easy' },
    { label: 'Medium (4×4)', value: 'medium' },
    { label: 'Svær (5×5)', value: 'hard' },
  ];
  const SIZE_MAP = { easy: 3, medium: 4, hard: 5 };
  const LABEL_MAP = { easy: 'Let', medium: 'Medium', hard: 'Svær' };

  // C/A major-pentatonic palette (A3 → A5). Any subset/order sounds consonant.
  const PALETTE = [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];

  let size = 3;
  let sequence = [];
  let inputIndex = 0;
  let cleared = 0;
  let best = 0;
  let playing = false;   // sequence is being shown — ignore taps
  let stopped = false;   // screen left — abort everything
  let timers = [];

  const board = document.getElementById('sequence-board');
  const levelEl = document.getElementById('sequence-level');
  const bestEl = document.getElementById('sequence-best');
  const statusEl = document.getElementById('sequence-status');
  const startBtn = document.getElementById('sequence-start');
  const diffBtn = document.getElementById('sequence-diff-btn');

  function later(fn, ms) {
    const id = setTimeout(() => {
      if (!stopped) fn();
    }, ms);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function toneFor(tile) {
    return PALETTE[tile % PALETTE.length];
  }

  function renderBoard() {
    board.innerHTML = '';
    board.className = 'seq-board grid-' + size;
    for (let i = 0; i < size * size; i++) {
      const btn = document.createElement('button');
      btn.className = 'seq-tile';
      btn.dataset.idx = i;
      // hue spread so tiles read as distinct, warm pastels on the green theme
      btn.style.setProperty('--h', Math.round((i / (size * size)) * 320) + '');
      btn.setAttribute('aria-label', 'Felt ' + (i + 1));
      btn.addEventListener('click', () => handleTap(i));
      board.appendChild(btn);
    }
  }

  function flashTile(i, dur) {
    const tile = board.children[i];
    if (!tile) return;
    tile.classList.add('lit');
    playTone(toneFor(i), dur, 'sine');
    later(() => tile.classList.remove('lit'), dur);
  }

  function initSequence() {
    const diff = getDifficulty('sequence');
    size = SIZE_MAP[diff] || 3;
    diffBtn.textContent = LABEL_MAP[diff] || 'Let';
    best = Stats.get('sequence').bestStreak || 0;
    stopped = false;
    clearTimers();
    renderBoard();
    cleared = 0;
    sequence = [];
    playing = false;
    levelEl.textContent = '0';
    bestEl.textContent = best;
    statusEl.textContent = 'Tryk Start';
    statusEl.className = 'seq-status';
    startBtn.style.display = '';
    board.classList.remove('disabled');
  }

  function startGame() {
    stopped = false;
    clearTimers();
    cleared = 0;
    sequence = [];
    inputIndex = 0;
    best = Stats.get('sequence').bestStreak || 0;
    bestEl.textContent = best;
    startBtn.style.display = 'none';
    nextRound();
  }

  function nextRound() {
    sequence.push(Math.floor(Math.random() * size * size));
    inputIndex = 0;
    levelEl.textContent = sequence.length;
    playSequence();
  }

  function playSequence() {
    playing = true;
    board.classList.add('disabled');
    statusEl.textContent = 'Se godt efter…';
    statusEl.className = 'seq-status watching';

    // a touch faster as it grows, but never frantic
    const onMs = Math.max(300, 470 - sequence.length * 8);
    const gapMs = Math.max(120, 200 - sequence.length * 4);
    let t = 420;
    sequence.forEach((tile) => {
      later(() => flashTile(tile, onMs), t);
      t += onMs + gapMs;
    });
    later(() => {
      playing = false;
      board.classList.remove('disabled');
      statusEl.textContent = 'Din tur!';
      statusEl.className = 'seq-status your-turn';
    }, t);
  }

  function handleTap(i) {
    if (playing || stopped || startBtn.style.display !== 'none') return;

    const correct = i === sequence[inputIndex];
    const tile = board.children[i];

    if (correct) {
      tile.classList.remove('lit');
      void tile.offsetWidth;
      tile.classList.add('lit');
      playTone(toneFor(i), 240, 'sine');
      vibrate(12);
      later(() => tile.classList.remove('lit'), 220);

      inputIndex++;
      if (inputIndex >= sequence.length) {
        cleared++;
        playing = true; // lock during the gap before next round
        board.classList.add('disabled');
        statusEl.textContent = 'Flot! ✓';
        statusEl.className = 'seq-status your-turn';
        if (cleared > best) {
          best = cleared;
          bestEl.textContent = best;
        }
        later(nextRound, 850);
      }
    } else {
      gameOver(i);
    }
  }

  function gameOver(wrongTile) {
    playing = true;
    board.classList.add('disabled');
    statusEl.textContent = 'Av!';
    statusEl.className = 'seq-status wrong';

    const tile = board.children[wrongTile];
    if (tile) tile.classList.add('wrong');
    // gentle descending "aww"
    playTone(196.00, 200, 'sine');
    later(() => playTone(146.83, 300, 'sine'), 170);
    vibrate([40, 60, 40]);

    const prevBest = Stats.get('sequence').bestStreak || 0;
    const won = cleared > 0 && cleared >= prevBest;
    Stats.record('sequence', {
      won,
      time: 0,
      difficulty: getDifficulty('sequence'),
      extra: { bestStreak: Math.max(prevBest, cleared) },
    });

    const statsHtml =
      'Rigtige i træk: <b>' + cleared + '</b><br>' +
      'Rekord: <b>' + Math.max(prevBest, cleared) + '</b>';

    later(() => showResult(won, statsHtml, 'sequence'), 700);
  }

  startBtn.addEventListener('click', startGame);

  diffBtn.onclick = () => {
    showDifficultyModal('sequence', DIFFICULTIES, (val) => {
      size = SIZE_MAP[val] || 3;
      diffBtn.textContent = LABEL_MAP[val] || 'Let';
      initSequence();
    });
  };

  window.initSequence = initSequence;
  window.gameRestarters.sequence = startGame;
  window.gameCleanups.sequence = function () {
    stopped = true;
    playing = false;
    clearTimers();
  };
})();
