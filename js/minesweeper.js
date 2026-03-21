/* ===== Minesweeper / Minerydder ===== */

(function () {
  const DIFFICULTIES = [
    { label: 'Let (8×8, 10 miner)', value: 'easy' },
    { label: 'Medium (10×10, 20 miner)', value: 'medium' },
    { label: 'Svær (12×12, 35 miner)', value: 'hard' },
  ];

  const CONFIG = {
    easy: { rows: 8, cols: 8, mines: 10 },
    medium: { rows: 10, cols: 10, mines: 20 },
    hard: { rows: 12, cols: 12, mines: 35 },
  };

  const LABEL_MAP = { easy: 'Let', medium: 'Medium', hard: 'Svær' };
  const LONG_PRESS_MS = 400;

  let board = [];
  let rows = 8, cols = 8, mineCount = 10;
  let gameOver = false;
  let firstClick = true;
  let flagMode = false;
  let flagsPlaced = 0;
  let revealedCount = 0;
  let timer = null;
  let longPressTimer = null;
  let longPressTriggered = false;

  const boardEl = document.getElementById('minesweeper-board');
  const minesEl = document.getElementById('minesweeper-mines');
  const timerEl = document.getElementById('minesweeper-timer');
  const diffBtn = document.getElementById('minesweeper-diff-btn');
  const flagBtn = document.getElementById('minesweeper-flag-btn');

  function initMinesweeper() {
    const diff = getDifficulty('minesweeper');
    diffBtn.textContent = LABEL_MAP[diff] || 'Let';
    startGame();
  }

  function startGame() {
    const diff = getDifficulty('minesweeper');
    const config = CONFIG[diff] || CONFIG.easy;
    rows = config.rows;
    cols = config.cols;
    mineCount = config.mines;
    gameOver = false;
    firstClick = true;
    flagMode = false;
    flagsPlaced = 0;
    revealedCount = 0;

    flagBtn.classList.remove('active');
    flagBtn.textContent = '🚩 Flag';
    minesEl.textContent = mineCount;

    if (timer) timer.reset();
    timer = new GameTimer(timerEl);

    board = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({
        mine: false, revealed: false, flagged: false, adjacent: 0,
      }))
    );

    renderBoard();
  }

  function placeMines(safeRow, safeCol) {
    let placed = 0;
    while (placed < mineCount) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (board[r][c].mine) continue;
      if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue;
      board[r][c].mine = true;
      placed++;
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].mine) continue;
        let count = 0;
        forNeighbors(r, c, (nr, nc) => { if (board[nr][nc].mine) count++; });
        board[r][c].adjacent = count;
      }
    }
  }

  function forNeighbors(r, c, fn) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) fn(nr, nc);
      }
    }
  }

  function reveal(r, c) {
    const cell = board[r][c];
    if (cell.revealed || cell.flagged) return;
    cell.revealed = true;
    revealedCount++;
    if (cell.mine) return;
    if (cell.adjacent === 0) {
      forNeighbors(r, c, (nr, nc) => reveal(nr, nc));
    }
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    boardEl.className = 'cols-' + cols;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = board[r][c];
        const btn = document.createElement('button');

        if (cell.revealed) {
          if (cell.mine) {
            btn.className = 'ms-cell mine';
            btn.textContent = '💣';
          } else {
            btn.className = 'ms-cell revealed';
            if (cell.adjacent > 0) {
              btn.textContent = cell.adjacent;
              btn.setAttribute('data-num', cell.adjacent);
            }
          }
        } else if (cell.flagged) {
          btn.className = 'ms-cell flagged';
          btn.textContent = '🚩';
        } else {
          btn.className = 'ms-cell hidden';
        }

        // Long-press to flag support
        btn.addEventListener('pointerdown', (e) => onCellDown(r, c, e));
        btn.addEventListener('pointerup', (e) => onCellUp(r, c, e));
        btn.addEventListener('pointerleave', cancelLongPress);
        btn.addEventListener('contextmenu', (e) => e.preventDefault());

        boardEl.appendChild(btn);
      }
    }
  }

  let longPressCell = null;

  function onCellDown(r, c, e) {
    longPressTriggered = false;
    // Add pressing visual feedback
    const idx = r * cols + c;
    const btn = boardEl.children[idx];
    if (btn && btn.classList.contains('hidden')) {
      btn.classList.add('pressing');
      longPressCell = btn;
    }
    longPressTimer = setTimeout(() => {
      longPressTriggered = true;
      clearPressing();
      toggleFlag(r, c);
    }, LONG_PRESS_MS);
  }

  function onCellUp(r, c, e) {
    clearTimeout(longPressTimer);
    clearPressing();
    if (longPressTriggered) return; // Long press already handled
    handleTap(r, c);
  }

  function cancelLongPress() {
    clearTimeout(longPressTimer);
    clearPressing();
  }

  function clearPressing() {
    if (longPressCell) {
      longPressCell.classList.remove('pressing');
      longPressCell = null;
    }
  }

  function toggleFlag(r, c) {
    if (gameOver) return;
    const cell = board[r][c];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    flagsPlaced += cell.flagged ? 1 : -1;
    minesEl.textContent = Math.max(0, mineCount - flagsPlaced);
    vibrate(20);
    renderBoard();
  }

  function handleTap(r, c) {
    if (gameOver) return;
    const cell = board[r][c];

    if (flagMode) {
      toggleFlag(r, c);
      return;
    }

    if (cell.flagged || cell.revealed) return;

    if (firstClick) {
      firstClick = false;
      placeMines(r, c);
      timer.start();
    }

    if (cell.mine) {
      cell.revealed = true;
      gameOver = true;
      timer.stop();
      vibrate([50, 30, 100]);

      board.forEach((row) => row.forEach((cl) => { if (cl.mine) cl.revealed = true; }));
      renderBoard();

      const idx = r * cols + c;
      if (boardEl.children[idx]) boardEl.children[idx].className = 'ms-cell mine-hit';

      Stats.record('minesweeper', {
        won: false,
        time: timer.getElapsed(),
        difficulty: getDifficulty('minesweeper'),
      });

      setTimeout(() => {
        showResult(false, 'Du ramte en mine!<br>Tid: ' + timer.getFormatted(), 'minesweeper');
      }, 600);
      return;
    }

    reveal(r, c);
    vibrate(10);
    renderBoard();

    const totalSafe = rows * cols - mineCount;
    if (revealedCount >= totalSafe) {
      gameOver = true;
      timer.stop();

      Stats.record('minesweeper', {
        won: true,
        time: timer.getElapsed(),
        difficulty: getDifficulty('minesweeper'),
      });

      setTimeout(() => {
        showResult(true, 'Tid: ' + timer.getFormatted(), 'minesweeper');
      }, 300);
    }
  }

  flagBtn.onclick = () => {
    flagMode = !flagMode;
    flagBtn.classList.toggle('active', flagMode);
    flagBtn.textContent = flagMode ? '🚩 Flag ON' : '🚩 Flag';
  };

  diffBtn.onclick = () => {
    showDifficultyModal('minesweeper', DIFFICULTIES, (val) => {
      diffBtn.textContent = LABEL_MAP[val] || 'Let';
      startGame();
    });
  };

  window.initMinesweeper = initMinesweeper;
  window.gameRestarters.minesweeper = startGame;
})();
