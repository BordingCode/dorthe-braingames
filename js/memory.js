/* ===== Memory / Vendespil ===== */

(function () {
  const SYMBOLS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🌻', '🌸', '🦋', '🐝', '🐞',
                   '🌈', '⭐', '🎵', '🏠', '🌲', '🐱', '🐶', '🦊', '🐸', '🌺'];

  const DIFFICULTIES = [
    { label: 'Let (3×4)', value: 'easy' },
    { label: 'Medium (4×4)', value: 'medium' },
    { label: 'Svær (4×5)', value: 'hard' },
  ];

  const CONFIG = {
    easy: { cols: 3, rows: 4, pairs: 6 },
    medium: { cols: 4, rows: 4, pairs: 8 },
    hard: { cols: 4, rows: 5, pairs: 10 },
  };

  let cards = [];
  let flipped = [];
  let matchedCount = 0;
  let totalPairs = 0;
  let moves = 0;
  let locked = false;
  let peeking = false;
  let peekTimer = null;
  let timer = null;
  let currentCols = 3;

  const board = document.getElementById('memory-board');
  const movesEl = document.getElementById('memory-moves');
  const pairsEl = document.getElementById('memory-pairs');
  const timerEl = document.getElementById('memory-timer');
  const diffBtn = document.getElementById('memory-diff-btn');

  const LABEL_MAP = { easy: 'Let', medium: 'Medium', hard: 'Svær' };

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function initMemory() {
    const diff = getDifficulty('memory');
    diffBtn.textContent = LABEL_MAP[diff] || 'Let';
    startGame();
  }

  function startGame() {
    const diff = getDifficulty('memory');
    const config = CONFIG[diff] || CONFIG.easy;
    totalPairs = config.pairs;
    currentCols = config.cols;
    matchedCount = 0;
    moves = 0;
    locked = true; // Lock during peek
    flipped = [];

    movesEl.textContent = '0';
    pairsEl.textContent = '0/' + totalPairs;

    if (timer) timer.reset();
    timer = new GameTimer(timerEl);

    const chosen = shuffle([...SYMBOLS]).slice(0, totalPairs);
    cards = shuffle([...chosen, ...chosen].map((symbol, i) => ({
      id: i,
      symbol: symbol,
      flipped: false,
      matched: false,
    })));

    renderBoard(config.cols);

    // Brief peek: show all cards for 1.2s then flip back
    peeking = true;
    board.querySelectorAll('.mem-card').forEach((el) => el.classList.add('peek'));

    peekTimer = setTimeout(() => endPeek(), 1200);

    // Handle tab becoming hidden during peek
    document.addEventListener('visibilitychange', onVisibilityDuringPeek);
  }

  function endPeek() {
    if (!peeking) return;
    peeking = false;
    clearTimeout(peekTimer);
    document.removeEventListener('visibilitychange', onVisibilityDuringPeek);
    board.querySelectorAll('.mem-card').forEach((el) => el.classList.remove('peek'));
    locked = false;
    timer.start();
  }

  function onVisibilityDuringPeek() {
    if (document.hidden && peeking) {
      endPeek();
    }
  }

  function renderBoard(cols) {
    board.innerHTML = '';
    board.className = 'cols-' + cols;

    cards.forEach((card, idx) => {
      const el = document.createElement('div');
      el.className = 'mem-card' + (card.flipped ? ' flipped' : '') + (card.matched ? ' matched' : '');
      el.innerHTML =
        '<div class="mem-card-inner">' +
        '<div class="mem-card-back"></div>' +
        '<div class="mem-card-front">' + card.symbol + '</div>' +
        '</div>';
      el.onclick = () => handleTap(idx);
      board.appendChild(el);
    });
  }

  function handleTap(idx) {
    if (locked || peeking) return;
    const card = cards[idx];
    if (card.flipped || card.matched) return;
    if (flipped.length >= 2) return;

    card.flipped = true;
    flipped.push(idx);
    vibrate(10);
    updateCard(idx);

    if (flipped.length === 2) {
      moves++;
      movesEl.textContent = moves;
      locked = true;

      const [a, b] = flipped;
      if (cards[a].symbol === cards[b].symbol) {
        cards[a].matched = true;
        cards[b].matched = true;
        matchedCount++;
        pairsEl.textContent = matchedCount + '/' + totalPairs;
        flipped = [];

        // Delay unlock briefly so match animation plays
        setTimeout(() => {
          updateCard(a);
          updateCard(b);
          locked = false;

          if (matchedCount === totalPairs) {
            locked = true;
            timer.stop();
            Stats.save('memory', {
              played: (Stats.get('memory').played || 0) + 1,
              won: (Stats.get('memory').won || 0) + 1,
            });
            setTimeout(() => {
              showResult(true, 'Træk: ' + moves + '<br>Tid: ' + timer.getFormatted(), 'memory');
            }, 300);
          }
        }, 200);
      } else {
        setTimeout(() => {
          cards[a].flipped = false;
          cards[b].flipped = false;
          updateCard(a);
          updateCard(b);
          flipped = [];
          locked = false;
        }, 900);
      }
    }
  }

  function updateCard(idx) {
    const el = board.children[idx];
    if (!el) return;
    const card = cards[idx];
    el.className = 'mem-card' + (card.flipped ? ' flipped' : '') + (card.matched ? ' matched' : '');
  }

  diffBtn.onclick = () => {
    showDifficultyModal('memory', DIFFICULTIES, (val) => {
      diffBtn.textContent = LABEL_MAP[val] || 'Let';
      startGame();
    });
  };

  window.initMemory = initMemory;
  window.gameRestarters.memory = startGame;
})();
