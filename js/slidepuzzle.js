/* ===== Skydepuslespil (sliding number puzzle) ===== */

(function () {
  const L = SlidePuzzle; // pure logic (slidepuzzle-logic.js, loaded first)

  const DIFFICULTIES = [
    { label: 'Let (3×3)', value: 'easy' },
    { label: 'Medium (4×4)', value: 'medium' },
    { label: 'Svær (5×5)', value: 'hard' },
  ];
  const SIZE_MAP = { easy: 3, medium: 4, hard: 5 };
  const LABEL_MAP = { easy: 'Let', medium: 'Medium', hard: 'Svær' };
  // consonant scale so repeated slides sound pleasant (see audio-web-audio.md)
  const PENTA = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

  let n = 3;
  let board = [];
  let blank = 0;
  let moves = 0;
  let done = false;
  let stopped = false;
  let timer = null;
  let timers = [];
  let tilesByValue = {};

  const boardEl = document.getElementById('slidepuzzle-board');
  const movesEl = document.getElementById('slidepuzzle-moves');
  const timerEl = document.getElementById('slidepuzzle-timer');
  const bestEl = document.getElementById('slidepuzzle-best');
  const statusEl = document.getElementById('slidepuzzle-status');
  const diffBtn = document.getElementById('slidepuzzle-diff-btn');

  const later = (fn, ms) => { const id = setTimeout(() => { if (!stopped) fn(); }, Math.max(0, ms)); timers.push(id); return id; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  function showBest() {
    const b = Stats.get('slidepuzzle').bestMoves;
    bestEl.textContent = b ? '🏆 ' + b : '🏆 –';
  }

  function rc(i) { return { r: Math.floor(i / n), c: i % n }; }

  function placeTile(el, i) {
    const { r, c } = rc(i);
    el.style.setProperty('--r', r);
    el.style.setProperty('--c', c);
  }

  function render() {
    boardEl.innerHTML = '';
    boardEl.style.setProperty('--n', n);
    boardEl.className = 'sp-board';
    tilesByValue = {};
    board.forEach((v, i) => {
      if (v === 0) return; // blank = empty space
      const t = document.createElement('button');
      t.className = 'sp-tile';
      t.textContent = v;
      t.setAttribute('aria-label', 'Brik ' + v);
      placeTile(t, i);
      t.addEventListener('click', () => handleTap(v));
      boardEl.appendChild(t);
      tilesByValue[v] = t;
    });
  }

  function initSlidePuzzle() {
    const diff = getDifficulty('slidepuzzle');
    n = SIZE_MAP[diff] || 3;
    diffBtn.textContent = LABEL_MAP[diff] || 'Let';
    stopped = false;
    clearTimers();
    showBest();
    startGame();
  }

  function startGame() {
    stopped = false;
    clearTimers();
    if (timer) timer.reset();
    timer = new GameTimer(timerEl);
    board = L.scramble(n);                 // generate-from-solved → always solvable
    blank = L.blankIndex(board);
    moves = 0;
    done = false;
    movesEl.textContent = '0';
    statusEl.textContent = 'Skub tallene på plads';
    statusEl.className = 'sp-status';
    render();
    timer.start();
  }

  function handleTap(v) {
    if (done || stopped) return;
    const idx = board.indexOf(v);
    if (!L.legalMoves(board, n).includes(idx)) return; // not next to the gap — ignore
    const dest = blank;                    // tile slides into the old blank cell
    board = L.applyMove(board, idx, n);
    blank = idx;
    placeTile(tilesByValue[v], dest);      // CSS transition animates the slide
    moves++;
    movesEl.textContent = moves;
    playTone(PENTA[dest % PENTA.length], 110, 'sine');
    vibrate(10);
    if (L.isSolved(board)) win();
  }

  function win() {
    done = true;
    const timeStr = timer.getFormatted();
    timer.stop();
    statusEl.textContent = 'Løst! 🎉';
    statusEl.className = 'sp-status win';

    // gentle win cascade
    const tiles = boardEl.querySelectorAll('.sp-tile');
    tiles.forEach((t, i) => later(() => t.classList.add('win'), i * 45));
    [523, 659, 784].forEach((f, i) => later(() => playTone(f, 240, 'sine'), i * 130));

    const prevBest = Stats.get('slidepuzzle').bestMoves || Infinity;
    const newRecord = moves < prevBest;
    Stats.record('slidepuzzle', {
      won: true,
      time: timer.getElapsed(),
      difficulty: getDifficulty('slidepuzzle'),
      extra: { bestMoves: Math.min(prevBest, moves) },
    });
    showBest();

    const statsHtml =
      'Løst på <b>' + moves + '</b> træk<br>Tid: <b>' + timeStr + '</b>' +
      (newRecord && isFinite(prevBest) ? '<br>🏆 Ny rekord — færrest træk!' : '');
    later(() => showResult(true, statsHtml, 'slidepuzzle'), tiles.length * 45 + 350);
  }

  diffBtn.onclick = () => {
    showDifficultyModal('slidepuzzle', DIFFICULTIES, (val) => {
      n = SIZE_MAP[val] || 3;
      diffBtn.textContent = LABEL_MAP[val] || 'Let';
      initSlidePuzzle();
    });
  };

  window.initSlidePuzzle = initSlidePuzzle;
  window.gameRestarters.slidepuzzle = startGame;
  window.gameCleanups.slidepuzzle = function () {
    stopped = true;
    done = true;
    if (timer) timer.reset();
    clearTimers();
  };
})();
