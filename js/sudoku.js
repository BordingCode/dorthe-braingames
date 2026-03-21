/* ===== Sudoku ===== */

(function () {
  const DIFFICULTIES = [
    { label: 'Let (38 tal)', value: 'easy' },
    { label: 'Medium (30 tal)', value: 'medium' },
    { label: 'Svær (24 tal)', value: 'hard' },
  ];

  const CONFIG = {
    easy:   { givens: 38, maxErrors: 5 },
    medium: { givens: 30, maxErrors: 3 },
    hard:   { givens: 24, maxErrors: 3 },
  };

  const LABEL_MAP = { easy: 'Let', medium: 'Medium', hard: 'Svær' };

  let board = [];       // current board (0 = empty)
  let solution = [];    // solved board
  let given = [];       // true if cell was pre-filled
  let pencil = [];      // pencil marks: pencil[r][c] = Set of numbers
  let errors = 0;
  let maxErrors = 5;
  let selectedCell = null; // {r, c}
  let pencilMode = false;
  let timer = null;
  let gameOver = false;

  const boardEl = document.getElementById('sudoku-board');
  const numpadEl = document.getElementById('sudoku-numpad');
  const errorsEl = document.getElementById('sudoku-errors');
  const maxErrorsEl = document.getElementById('sudoku-max-errors');
  const timerEl = document.getElementById('sudoku-timer');
  const diffBtn = document.getElementById('sudoku-diff-btn');
  const pencilBtn = document.getElementById('sudoku-pencil-btn');

  function initSudoku() {
    const diff = getDifficulty('sudoku');
    diffBtn.textContent = LABEL_MAP[diff] || 'Let';
    startGame();
  }

  function startGame() {
    const diff = getDifficulty('sudoku');
    const config = CONFIG[diff] || CONFIG.easy;
    maxErrors = config.maxErrors;
    errors = 0;
    gameOver = false;
    pencilMode = false;
    selectedCell = null;

    errorsEl.textContent = '0';
    maxErrorsEl.textContent = maxErrors;
    pencilBtn.classList.remove('active');

    if (timer) timer.reset();
    timer = new GameTimer(timerEl);

    // Generate puzzle
    solution = generateSolved();
    board = solution.map(r => r.slice());
    given = Array.from({ length: 9 }, () => Array(9).fill(true));
    pencil = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));

    // Remove cells
    removeCells(81 - config.givens);

    renderBoard();
    renderNumpad();
    timer.start();
  }

  // --- Puzzle Generation ---

  function generateSolved() {
    const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
    fillGrid(grid);
    return grid;
  }

  function fillGrid(grid) {
    const empty = findEmpty(grid);
    if (!empty) return true;
    const [r, c] = empty;
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const n of nums) {
      if (isValid(grid, r, c, n)) {
        grid[r][c] = n;
        if (fillGrid(grid)) return true;
        grid[r][c] = 0;
      }
    }
    return false;
  }

  function findEmpty(grid) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) return [r, c];
      }
    }
    return null;
  }

  function isValid(grid, row, col, num) {
    // Row
    for (let c = 0; c < 9; c++) {
      if (grid[row][c] === num) return false;
    }
    // Column
    for (let r = 0; r < 9; r++) {
      if (grid[r][col] === num) return false;
    }
    // 3x3 box
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        if (grid[r][c] === num) return false;
      }
    }
    return true;
  }

  function removeCells(count) {
    const positions = shuffle(
      Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9])
    );
    let removed = 0;
    for (const [r, c] of positions) {
      if (removed >= count) break;
      const val = board[r][c];
      board[r][c] = 0;

      // Check unique solution
      if (countSolutions(board, 2) === 1) {
        given[r][c] = false;
        removed++;
      } else {
        board[r][c] = val; // restore
      }
    }
  }

  function countSolutions(grid, limit) {
    const copy = grid.map(r => r.slice());
    let count = 0;

    function solve() {
      if (count >= limit) return;
      const empty = findEmpty(copy);
      if (!empty) { count++; return; }
      const [r, c] = empty;
      for (let n = 1; n <= 9; n++) {
        if (isValid(copy, r, c, n)) {
          copy[r][c] = n;
          solve();
          copy[r][c] = 0;
        }
      }
    }

    solve();
    return count;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // --- Rendering ---

  function renderBoard() {
    boardEl.innerHTML = '';
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const btn = document.createElement('button');
        btn.className = 'su-cell';
        btn.dataset.row = r;
        btn.dataset.col = c;

        if (given[r][c]) {
          btn.classList.add('given');
          btn.textContent = board[r][c];
        } else if (board[r][c] !== 0) {
          btn.classList.add('user-filled');
          btn.textContent = board[r][c];
        } else if (pencil[r][c].size > 0) {
          const marks = document.createElement('div');
          marks.className = 'pencil-marks';
          for (let n = 1; n <= 9; n++) {
            const s = document.createElement('span');
            s.textContent = pencil[r][c].has(n) ? n : '';
            marks.appendChild(s);
          }
          btn.appendChild(marks);
        }

        // Highlights
        if (selectedCell) {
          if (r === selectedCell.r && c === selectedCell.c) {
            btn.classList.add('selected');
          } else if (r === selectedCell.r || c === selectedCell.c ||
            (Math.floor(r / 3) === Math.floor(selectedCell.r / 3) &&
             Math.floor(c / 3) === Math.floor(selectedCell.c / 3))) {
            btn.classList.add('row-col-highlight');
          }
          // Highlight same number
          const selVal = board[selectedCell.r][selectedCell.c];
          if (selVal !== 0 && board[r][c] === selVal &&
              !(r === selectedCell.r && c === selectedCell.c)) {
            btn.classList.add('same-num');
          }
        }

        btn.onclick = () => selectCell(r, c);
        boardEl.appendChild(btn);
      }
    }
  }

  function renderNumpad() {
    numpadEl.innerHTML = '';
    const counts = Array(10).fill(0);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== 0) counts[board[r][c]]++;
      }
    }

    for (let n = 1; n <= 9; n++) {
      const btn = document.createElement('button');
      btn.className = 'su-num-btn';
      btn.textContent = n;
      if (counts[n] >= 9) btn.classList.add('completed');
      btn.onclick = () => handleNumberInput(n);
      numpadEl.appendChild(btn);
    }

    // Eraser
    const eraser = document.createElement('button');
    eraser.className = 'su-num-btn eraser';
    eraser.textContent = '⌫';
    eraser.onclick = () => handleErase();
    numpadEl.appendChild(eraser);
  }

  // --- Interaction ---

  function selectCell(r, c) {
    if (gameOver) return;
    selectedCell = { r, c };
    vibrate(10);
    renderBoard();
  }

  function handleNumberInput(num) {
    if (gameOver || !selectedCell) return;
    const { r, c } = selectedCell;
    if (given[r][c]) return;

    if (pencilMode) {
      // Toggle pencil mark
      if (pencil[r][c].has(num)) {
        pencil[r][c].delete(num);
      } else {
        pencil[r][c].add(num);
      }
      board[r][c] = 0; // clear value if setting pencil
      vibrate(10);
      renderBoard();
      return;
    }

    // Normal mode
    pencil[r][c].clear();

    if (num === solution[r][c]) {
      // Correct
      board[r][c] = num;
      vibrate(10);

      // Remove this number from pencil marks in same row/col/box
      clearPencilMarks(r, c, num);

      renderBoard();
      renderNumpad();

      // Check if row/col/box complete
      flashCompletions(r, c);

      checkWin();
    } else {
      // Wrong
      board[r][c] = num;
      errors++;
      errorsEl.textContent = errors;
      vibrate([30, 20, 30]);

      renderBoard();

      // Flash error
      const idx = r * 9 + c;
      const cell = boardEl.children[idx];
      if (cell) {
        cell.classList.add('error-flash');
        cell.classList.add('user-filled');
        cell.style.color = 'var(--danger)';
      }

      // Clear the wrong number after a moment
      setTimeout(() => {
        board[r][c] = 0;
        renderBoard();
        renderNumpad();
      }, 600);

      if (errors >= maxErrors) {
        gameOver = true;
        timer.stop();
        Stats.record('sudoku', {
          won: false,
          time: timer.getElapsed(),
          difficulty: getDifficulty('sudoku'),
        });
        setTimeout(() => {
          showResult(false, 'For mange fejl!<br>Fejl: ' + errors + '/' + maxErrors + '<br>Tid: ' + timer.getFormatted(), 'sudoku');
        }, 800);
      }
    }
  }

  function handleErase() {
    if (gameOver || !selectedCell) return;
    const { r, c } = selectedCell;
    if (given[r][c]) return;
    board[r][c] = 0;
    pencil[r][c].clear();
    vibrate(10);
    renderBoard();
    renderNumpad();
  }

  function clearPencilMarks(row, col, num) {
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let i = 0; i < 9; i++) {
      pencil[row][i].delete(num);
      pencil[i][col].delete(num);
    }
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        pencil[r][c].delete(num);
      }
    }
  }

  function flashCompletions(row, col) {
    const cells = [];

    // Check row complete
    if (Array.from({ length: 9 }, (_, c) => board[row][c]).every(v => v !== 0)) {
      for (let c = 0; c < 9; c++) cells.push(row * 9 + c);
    }
    // Check col complete
    if (Array.from({ length: 9 }, (_, r) => board[r][col]).every(v => v !== 0)) {
      for (let r = 0; r < 9; r++) cells.push(r * 9 + col);
    }
    // Check box complete
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    let boxComplete = true;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        if (board[r][c] === 0) boxComplete = false;
      }
    }
    if (boxComplete) {
      for (let r = br; r < br + 3; r++) {
        for (let c = bc; c < bc + 3; c++) cells.push(r * 9 + c);
      }
    }

    // Flash unique cells
    const unique = [...new Set(cells)];
    unique.forEach(idx => {
      const el = boardEl.children[idx];
      if (el) {
        el.classList.add('complete-flash');
        setTimeout(() => el.classList.remove('complete-flash'), 500);
      }
    });
  }

  function checkWin() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== solution[r][c]) return;
      }
    }
    gameOver = true;
    timer.stop();
    Stats.record('sudoku', {
      won: true,
      time: timer.getElapsed(),
      difficulty: getDifficulty('sudoku'),
    });
    setTimeout(() => {
      showResult(true, 'Tid: ' + timer.getFormatted() + '<br>Fejl: ' + errors + '/' + maxErrors, 'sudoku');
    }, 400);
  }

  // Pencil mode toggle
  pencilBtn.onclick = () => {
    pencilMode = !pencilMode;
    pencilBtn.classList.toggle('active', pencilMode);
  };

  // Difficulty
  diffBtn.onclick = () => {
    showDifficultyModal('sudoku', DIFFICULTIES, (val) => {
      diffBtn.textContent = LABEL_MAP[val] || 'Let';
      startGame();
    });
  };

  window.initSudoku = initSudoku;
  window.gameRestarters.sudoku = startGame;
  window.gameCleanups.sudoku = function () {
    gameOver = true;
    if (timer) timer.reset();
  };
})();
