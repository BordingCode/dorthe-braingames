/* ===== Lights Out ===== */

(function () {
  let grid = [];
  let size = 4;
  let moves = 0;
  let gameOver = false;
  let timer = null;

  const board = document.getElementById('lightsout-board');
  const movesEl = document.getElementById('lightsout-moves');
  const timerEl = document.getElementById('lightsout-timer');
  const diffBtn = document.getElementById('lightsout-diff-btn');

  const DIFFICULTIES = [
    { label: 'Let (3×3)', value: 'easy' },
    { label: 'Medium (4×4)', value: 'medium' },
    { label: 'Svær (5×5)', value: 'hard' },
  ];

  const SIZE_MAP = { easy: 3, medium: 4, hard: 5 };
  const LABEL_MAP = { easy: 'Let', medium: 'Medium', hard: 'Svær' };

  function initLightsOut() {
    const diff = getDifficulty('lightsout');
    size = SIZE_MAP[diff] || 4;
    diffBtn.textContent = LABEL_MAP[diff] || 'Medium';
    startGame();
  }

  function startGame() {
    moves = 0;
    gameOver = false;
    movesEl.textContent = '0';

    if (timer) timer.reset();
    timer = new GameTimer(timerEl);

    grid = Array.from({ length: size }, () => Array(size).fill(false));

    // Apply random toggles from solved state — guarantees solvability
    const toggleCount = size * size + Math.floor(Math.random() * size);
    for (let i = 0; i < toggleCount; i++) {
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);
      applyToggle(r, c, true);
    }

    // Ensure at least some lights are on
    let litCount = grid.flat().filter(Boolean).length;
    while (litCount < Math.ceil(size * size * 0.3)) {
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);
      applyToggle(r, c, true);
      litCount = grid.flat().filter(Boolean).length;
    }

    renderBoard();
    timer.start();
  }

  function applyToggle(row, col, silent) {
    const neighbors = [
      [row, col], [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1],
    ];
    neighbors.forEach(([r, c]) => {
      if (r >= 0 && r < size && c >= 0 && c < size) {
        grid[r][c] = !grid[r][c];
      }
    });
    if (!silent) {
      moves++;
      movesEl.textContent = moves;
    }
  }

  function isSolved() {
    return grid.every((row) => row.every((cell) => !cell));
  }

  function renderBoard() {
    board.innerHTML = '';
    board.className = 'grid-' + size;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const btn = document.createElement('button');
        btn.className = 'lo-cell ' + (grid[r][c] ? 'on' : 'off');
        btn.setAttribute('aria-label', (grid[r][c] ? 'Tændt' : 'Slukket') + ' felt ' + (r + 1) + ',' + (c + 1));
        btn.onclick = () => handleTap(r, c);
        board.appendChild(btn);
      }
    }
  }

  function animateToggle(row, col) {
    // Pulse the toggled cell and neighbors
    const neighbors = [
      [row, col], [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1],
    ];
    neighbors.forEach(([r, c]) => {
      if (r >= 0 && r < size && c >= 0 && c < size) {
        const idx = r * size + c;
        const cell = board.children[idx];
        if (cell) {
          cell.classList.remove('pulse');
          void cell.offsetWidth; // trigger reflow
          cell.classList.add('pulse');
        }
      }
    });
  }

  function handleTap(row, col) {
    if (gameOver) return;

    applyToggle(row, col, false);
    vibrate(15);

    // Update cell states without full re-render for smoother animation
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const idx = r * size + c;
        const cell = board.children[idx];
        if (cell) {
          cell.className = 'lo-cell ' + (grid[r][c] ? 'on' : 'off');
        }
      }
    }
    animateToggle(row, col);

    if (isSolved()) {
      gameOver = true;
      const timeStr = timer.getFormatted();
      timer.stop();

      // Win cascade animation
      const cells = board.querySelectorAll('.lo-cell');
      cells.forEach((cell, i) => {
        setTimeout(() => {
          cell.classList.add('win-flash');
        }, i * 60);
      });

      Stats.save('lightsout', {
        played: (Stats.get('lightsout').played || 0) + 1,
        won: (Stats.get('lightsout').won || 0) + 1,
      });

      setTimeout(() => {
        showResult(true, 'Træk: ' + moves + '<br>Tid: ' + timeStr, 'lightsout');
      }, cells.length * 60 + 400);
    }
  }

  diffBtn.onclick = () => {
    showDifficultyModal('lightsout', DIFFICULTIES, (val) => {
      size = SIZE_MAP[val] || 4;
      diffBtn.textContent = LABEL_MAP[val] || 'Medium';
      startGame();
    });
  };

  window.initLightsOut = initLightsOut;
  window.gameRestarters.lightsout = startGame;
})();
