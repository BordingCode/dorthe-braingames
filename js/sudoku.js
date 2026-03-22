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

  const TECHNIQUE_INFO = [
    {
      id: 'last_remaining',
      name: 'Sidste plads',
      icon: '1\uFE0F\u20E3',
      desc: 'Når der kun er én tom plads tilbage i en række, kolonne eller boks, kan der kun være ét tal.',
      example: 'Hvis en række har tallene 1, 2, 3, 4, 5, 6, 7, 8 — så må den tomme plads være 9!',
      level: 'Nybegynder',
    },
    {
      id: 'naked_single',
      name: 'Eneste mulighed',
      icon: '\uD83C\uDFAF',
      desc: 'Når en celle kun har én mulig kandidat, fordi alle andre tal allerede findes i dens række, kolonne eller boks.',
      example: 'Rækken har 1, 3, 5 — kolonnen har 2, 7 — boksen har 4, 8. Kun 6 og 9 er mulige. Hvis 6 også er udelukket, må det være 9!',
      level: 'Nybegynder',
    },
    {
      id: 'hidden_single',
      name: 'Skjult eneste',
      icon: '\uD83D\uDD0D',
      desc: 'Når et bestemt tal kun kan placeres ét sted i en række, kolonne eller boks — selvom den celle har andre muligheder.',
      example: 'Tallet 5 skal stå i denne række. Kig på alle tomme celler: kun én af dem kan indeholde 5!',
      level: 'Let øvet',
    },
  ];

  // --- State ---
  let board = [];
  let solution = [];
  let given = [];
  let pencil = [];
  let hinted = [];
  let errors = 0;
  let maxErrors = 5;
  let selectedCell = null;
  let pencilMode = false;
  let timer = null;
  let gameOver = false;
  let moveHistory = [];
  let hintCount = 0;
  let activeHint = null;
  let milestoneShown = {};
  let techniquesLearned = {};
  let initialEmpty = 0;
  let selectedNumber = null;  // number-first mode

  try {
    techniquesLearned = JSON.parse(localStorage.getItem('bg_sudoku_techniques') || '{}');
  } catch (e) {
    techniquesLearned = {};
  }

  // --- DOM ---
  const boardEl = document.getElementById('sudoku-board');
  const numpadEl = document.getElementById('sudoku-numpad');
  const errorsEl = document.getElementById('sudoku-errors');
  const maxErrorsEl = document.getElementById('sudoku-max-errors');
  const timerEl = document.getElementById('sudoku-timer');
  const diffBtn = document.getElementById('sudoku-diff-btn');
  const pencilBtn = document.getElementById('sudoku-pencil-btn');
  const undoBtn = document.getElementById('sudoku-undo-btn');
  const hintBtn = document.getElementById('sudoku-hint-btn');
  const autonoteBtn = document.getElementById('sudoku-autonote-btn');
  const learnBtn = document.getElementById('sudoku-learn-btn');
  const progressFill = document.getElementById('sudoku-progress-fill');
  const progressText = document.getElementById('sudoku-progress-text');

  // ========================
  //  Init & Start
  // ========================

  function initSudoku() {
    const diff = getDifficulty('sudoku');
    diffBtn.textContent = LABEL_MAP[diff] || 'Let';

    const saved = localStorage.getItem('bg_sudoku_save');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.difficulty === diff) {
          loadGame(state);
          return;
        }
      } catch (e) { /* corrupted save */ }
    }
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
    selectedNumber = null;
    moveHistory = [];
    hintCount = 0;
    activeHint = null;
    milestoneShown = {};

    errorsEl.textContent = '0';
    maxErrorsEl.textContent = maxErrors;
    pencilBtn.classList.remove('active');

    if (timer) timer.reset();
    timer = new GameTimer(timerEl);

    solution = generateSolved();
    board = solution.map(r => r.slice());
    given = Array.from({ length: 9 }, () => Array(9).fill(true));
    pencil = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
    hinted = Array.from({ length: 9 }, () => Array(9).fill(false));

    removeCells(81 - config.givens);

    initialEmpty = 0;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board[r][c] === 0) initialEmpty++;

    renderBoard();
    renderNumpad();
    renderToolbar();
    updateProgress();
    timer.start();
    clearSave();
  }

  // ========================
  //  Puzzle Generation
  // ========================

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
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (grid[r][c] === 0) return [r, c];
    return null;
  }

  function isValid(grid, row, col, num) {
    for (let c = 0; c < 9; c++)
      if (grid[row][c] === num) return false;
    for (let r = 0; r < 9; r++)
      if (grid[r][col] === num) return false;
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let r = br; r < br + 3; r++)
      for (let c = bc; c < bc + 3; c++)
        if (grid[r][c] === num) return false;
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
      if (countSolutions(board, 2) === 1) {
        given[r][c] = false;
        removed++;
      } else {
        board[r][c] = val;
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

  // ========================
  //  Candidate Analysis
  // ========================

  function getCandidates(r, c) {
    if (board[r][c] !== 0) return new Set();
    const cands = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (let i = 0; i < 9; i++) {
      if (board[r][i] !== 0) cands.delete(board[r][i]);
      if (board[i][c] !== 0) cands.delete(board[i][c]);
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++)
      for (let dc = 0; dc < 3; dc++)
        if (board[br + dr][bc + dc] !== 0) cands.delete(board[br + dr][bc + dc]);
    return cands;
  }

  // ========================
  //  Technique Detection
  // ========================

  function findHint() {
    let hint = findLastRemaining();
    if (hint) return hint;
    hint = findNakedSingle();
    if (hint) return hint;
    hint = findHiddenSingle();
    if (hint) return hint;
    return findFallback();
  }

  function findLastRemaining() {
    // Rows
    for (let r = 0; r < 9; r++) {
      const empties = [];
      for (let c = 0; c < 9; c++)
        if (board[r][c] === 0) empties.push(c);
      if (empties.length === 1) {
        const c = empties[0];
        const val = solution[r][c];
        const highlights = [];
        for (let cc = 0; cc < 9; cc++)
          highlights.push({ r, c: cc, type: cc === c ? 'target' : 'unit' });
        return {
          type: 'last_remaining', cell: { r, c }, value: val, highlights,
          technique: {
            name: 'Sidste plads', icon: '1\uFE0F\u20E3',
            steps: [
              'Kig på række ' + (r + 1) + ' — der er kun én tom plads.',
              'Tallene 1\u20139 skal alle være der.',
              'Tallet ' + val + ' mangler — så det skal stå her!',
            ],
          },
        };
      }
    }
    // Columns
    for (let c = 0; c < 9; c++) {
      const empties = [];
      for (let r = 0; r < 9; r++)
        if (board[r][c] === 0) empties.push(r);
      if (empties.length === 1) {
        const r = empties[0];
        const val = solution[r][c];
        const highlights = [];
        for (let rr = 0; rr < 9; rr++)
          highlights.push({ r: rr, c, type: rr === r ? 'target' : 'unit' });
        return {
          type: 'last_remaining', cell: { r, c }, value: val, highlights,
          technique: {
            name: 'Sidste plads', icon: '1\uFE0F\u20E3',
            steps: [
              'Kig på kolonne ' + (c + 1) + ' — der er kun én tom plads.',
              'Tallene 1\u20139 skal alle være der.',
              'Tallet ' + val + ' mangler — så det skal stå her!',
            ],
          },
        };
      }
    }
    // Boxes
    for (let br = 0; br < 9; br += 3) {
      for (let bc = 0; bc < 9; bc += 3) {
        const empties = [];
        for (let dr = 0; dr < 3; dr++)
          for (let dc = 0; dc < 3; dc++)
            if (board[br + dr][bc + dc] === 0) empties.push([br + dr, bc + dc]);
        if (empties.length === 1) {
          const [r, c] = empties[0];
          const val = solution[r][c];
          const highlights = [];
          for (let dr = 0; dr < 3; dr++)
            for (let dc = 0; dc < 3; dc++) {
              const rr = br + dr, cc = bc + dc;
              highlights.push({ r: rr, c: cc, type: (rr === r && cc === c) ? 'target' : 'unit' });
            }
          const boxNum = Math.floor(br / 3) * 3 + Math.floor(bc / 3) + 1;
          return {
            type: 'last_remaining', cell: { r, c }, value: val, highlights,
            technique: {
              name: 'Sidste plads', icon: '1\uFE0F\u20E3',
              steps: [
                'Kig på boks ' + boxNum + ' — der er kun én tom plads.',
                'Tallene 1\u20139 skal alle være der.',
                'Tallet ' + val + ' mangler — så det skal stå her!',
              ],
            },
          };
        }
      }
    }
    return null;
  }

  function findNakedSingle() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== 0) continue;
        const cands = getCandidates(r, c);
        if (cands.size === 1) {
          const val = cands.values().next().value;
          const highlights = [{ r, c, type: 'target' }];
          const rowNums = [], colNums = [], boxNums = [];
          for (let i = 0; i < 9; i++) {
            if (board[r][i] !== 0 && i !== c) {
              rowNums.push(board[r][i]);
              highlights.push({ r, c: i, type: 'eliminator' });
            }
            if (board[i][c] !== 0 && i !== r) {
              colNums.push(board[i][c]);
              highlights.push({ r: i, c, type: 'eliminator' });
            }
          }
          const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
          for (let dr = 0; dr < 3; dr++)
            for (let dc = 0; dc < 3; dc++) {
              const rr = br + dr, cc = bc + dc;
              if (board[rr][cc] !== 0 && !(rr === r && cc === c)) {
                if (!rowNums.includes(board[rr][cc]) && !colNums.includes(board[rr][cc]))
                  boxNums.push(board[rr][cc]);
                highlights.push({ r: rr, c: cc, type: 'eliminator' });
              }
            }
          const steps = ['Kig på cellen i række ' + (r + 1) + ', kolonne ' + (c + 1) + '.'];
          if (rowNums.length > 0) steps.push('Rækken har allerede: ' + rowNums.sort((a, b) => a - b).join(', '));
          if (colNums.length > 0) steps.push('Kolonnen har allerede: ' + colNums.sort((a, b) => a - b).join(', '));
          if (boxNums.length > 0) steps.push('Boksen har også: ' + boxNums.sort((a, b) => a - b).join(', '));
          steps.push('Det eneste tal der er tilbage er ' + val + '!');
          return {
            type: 'naked_single', cell: { r, c }, value: val, highlights,
            technique: { name: 'Eneste mulighed', icon: '\uD83C\uDFAF', steps },
          };
        }
      }
    }
    return null;
  }

  function findHiddenSingle() {
    // Rows
    for (let r = 0; r < 9; r++) {
      for (let num = 1; num <= 9; num++) {
        let placed = false;
        for (let c = 0; c < 9; c++) if (board[r][c] === num) { placed = true; break; }
        if (placed) continue;
        const possible = [];
        for (let c = 0; c < 9; c++)
          if (board[r][c] === 0 && getCandidates(r, c).has(num)) possible.push(c);
        if (possible.length === 1) {
          const c = possible[0];
          const highlights = [];
          for (let cc = 0; cc < 9; cc++)
            highlights.push({ r, c: cc, type: cc === c ? 'target' : 'unit' });
          return {
            type: 'hidden_single', cell: { r, c }, value: num, highlights,
            technique: {
              name: 'Skjult eneste', icon: '\uD83D\uDD0D',
              steps: [
                'Hvor kan ' + num + ' stå i række ' + (r + 1) + '?',
                'Kig på alle tomme celler i rækken.',
                'Der er kun ét sted ' + num + ' kan være — her!',
              ],
            },
          };
        }
      }
    }
    // Columns
    for (let c = 0; c < 9; c++) {
      for (let num = 1; num <= 9; num++) {
        let placed = false;
        for (let r = 0; r < 9; r++) if (board[r][c] === num) { placed = true; break; }
        if (placed) continue;
        const possible = [];
        for (let r = 0; r < 9; r++)
          if (board[r][c] === 0 && getCandidates(r, c).has(num)) possible.push(r);
        if (possible.length === 1) {
          const r = possible[0];
          const highlights = [];
          for (let rr = 0; rr < 9; rr++)
            highlights.push({ r: rr, c, type: rr === r ? 'target' : 'unit' });
          return {
            type: 'hidden_single', cell: { r, c }, value: num, highlights,
            technique: {
              name: 'Skjult eneste', icon: '\uD83D\uDD0D',
              steps: [
                'Hvor kan ' + num + ' stå i kolonne ' + (c + 1) + '?',
                'Kig på alle tomme celler i kolonnen.',
                'Der er kun ét sted ' + num + ' kan være — her!',
              ],
            },
          };
        }
      }
    }
    // Boxes
    for (let br = 0; br < 9; br += 3) {
      for (let bc = 0; bc < 9; bc += 3) {
        for (let num = 1; num <= 9; num++) {
          let placed = false;
          for (let dr = 0; dr < 3; dr++) {
            for (let dc = 0; dc < 3; dc++)
              if (board[br + dr][bc + dc] === num) { placed = true; break; }
            if (placed) break;
          }
          if (placed) continue;
          const possible = [];
          for (let dr = 0; dr < 3; dr++)
            for (let dc = 0; dc < 3; dc++) {
              const r = br + dr, c = bc + dc;
              if (board[r][c] === 0 && getCandidates(r, c).has(num)) possible.push([r, c]);
            }
          if (possible.length === 1) {
            const [r, c] = possible[0];
            const highlights = [];
            for (let dr = 0; dr < 3; dr++)
              for (let dc = 0; dc < 3; dc++) {
                const rr = br + dr, cc = bc + dc;
                highlights.push({ r: rr, c: cc, type: (rr === r && cc === c) ? 'target' : 'unit' });
              }
            const boxNum = Math.floor(br / 3) * 3 + Math.floor(bc / 3) + 1;
            return {
              type: 'hidden_single', cell: { r, c }, value: num, highlights,
              technique: {
                name: 'Skjult eneste', icon: '\uD83D\uDD0D',
                steps: [
                  'Hvor kan ' + num + ' stå i boks ' + boxNum + '?',
                  'Kig på alle tomme celler i boksen.',
                  'Der er kun ét sted ' + num + ' kan være — her!',
                ],
              },
            };
          }
        }
      }
    }
    return null;
  }

  function findFallback() {
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board[r][c] === 0)
          return {
            type: 'fallback', cell: { r, c }, value: solution[r][c],
            highlights: [{ r, c, type: 'target' }],
            technique: {
              name: 'Hjælp', icon: '\uD83D\uDCA1',
              steps: ['Dette er et svært trin.', 'Svaret er ' + solution[r][c] + '.'],
            },
          };
    return null;
  }

  // ========================
  //  Rendering
  // ========================

  function renderBoard() {
    boardEl.innerHTML = '';
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const btn = document.createElement('button');
        btn.className = 'su-cell';
        btn.dataset.row = r;
        btn.dataset.col = c;

        // Alternating 3x3 box
        const boxIdx = Math.floor(r / 3) * 3 + Math.floor(c / 3);
        if (boxIdx % 2 === 1) btn.classList.add('alt-box');

        if (given[r][c]) {
          btn.classList.add('given');
          btn.textContent = board[r][c];
        } else if (board[r][c] !== 0) {
          btn.classList.add(hinted[r][c] ? 'hint-placed' : 'user-filled');
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

        // Selection highlights
        if (selectedCell) {
          if (r === selectedCell.r && c === selectedCell.c) {
            btn.classList.add('selected');
          } else if (r === selectedCell.r || c === selectedCell.c ||
            (Math.floor(r / 3) === Math.floor(selectedCell.r / 3) &&
             Math.floor(c / 3) === Math.floor(selectedCell.c / 3))) {
            btn.classList.add('row-col-highlight');
          }
          const selVal = board[selectedCell.r][selectedCell.c];
          if (selVal !== 0 && board[r][c] === selVal &&
              !(r === selectedCell.r && c === selectedCell.c)) {
            btn.classList.add('same-num');
          }
        }

        // Number-first mode: highlight candidate cells
        if (selectedNumber && board[r][c] === 0 && !given[r][c]) {
          if (getCandidates(r, c).has(selectedNumber)) {
            btn.classList.add('num-candidate');
          }
        }
        // Highlight same number as selectedNumber
        if (selectedNumber && board[r][c] === selectedNumber) {
          btn.classList.add('same-num');
        }

        // Hint highlights
        if (activeHint) {
          for (const h of activeHint.highlights) {
            if (h.r === r && h.c === c) btn.classList.add('su-hint-' + h.type);
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
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board[r][c] !== 0) counts[board[r][c]]++;

    for (let n = 1; n <= 9; n++) {
      const btn = document.createElement('button');
      btn.className = 'su-num-btn';
      const remaining = 9 - counts[n];
      if (remaining <= 0) {
        btn.classList.add('completed');
        btn.textContent = n;
      } else {
        btn.textContent = n;
        const badge = document.createElement('span');
        badge.className = 'su-num-remaining';
        badge.textContent = remaining;
        btn.appendChild(badge);
      }
      // Number-first mode: highlight selected number
      if (selectedNumber === n) btn.classList.add('num-selected');
      btn.onclick = () => handleNumpadClick(n);
      numpadEl.appendChild(btn);
    }

    // Eraser
    const eraser = document.createElement('button');
    eraser.className = 'su-num-btn eraser';
    eraser.textContent = '\u232B';
    if (selectedNumber === 'erase') eraser.classList.add('num-selected');
    eraser.onclick = () => handleNumpadClick('erase');
    numpadEl.appendChild(eraser);
  }

  function renderToolbar() {
    undoBtn.disabled = moveHistory.length === 0 || gameOver;
    hintBtn.disabled = gameOver;
  }

  function updateProgress() {
    let filled = 0;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board[r][c] !== 0) filled++;

    const pct = Math.round((filled / 81) * 100);
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressText) progressText.textContent = filled + '/81';

    if (initialEmpty > 0) {
      const totalFilled = filled - (81 - initialEmpty);
      const pctDone = totalFilled / initialEmpty;
      if (pctDone >= 0.25 && !milestoneShown[25]) {
        milestoneShown[25] = true;
        showMilestone('Godt i gang! \uD83D\uDCAA');
      } else if (pctDone >= 0.5 && !milestoneShown[50]) {
        milestoneShown[50] = true;
        showMilestone('Halvvejs! \u2B50');
      } else if (pctDone >= 0.75 && !milestoneShown[75]) {
        milestoneShown[75] = true;
        showMilestone('Næsten der! \uD83D\uDD25');
      }
    }
  }

  function showMilestone(text) {
    const toast = document.createElement('div');
    toast.className = 'su-milestone-toast';
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1600);
  }

  // ========================
  //  Interaction
  // ========================

  function selectCell(r, c) {
    if (gameOver) return;
    activeHint = null;  // Bug fix: clear hint highlights

    // Number-first mode: place selected number directly
    if (selectedNumber && !given[r][c]) {
      selectedCell = { r, c };
      if (selectedNumber === 'erase') {
        handleErase();
      } else {
        handleNumberInput(selectedNumber);
      }
      return;
    }

    selectedCell = { r, c };
    vibrate(10);
    renderBoard();
  }

  function handleNumpadClick(n) {
    if (gameOver) return;

    // Toggle number-first selection
    if (selectedNumber === n) {
      // Deselect
      selectedNumber = null;
      renderBoard();
      renderNumpad();
      return;
    }

    // If a cell is selected and no number-first mode active, place directly (cell-first)
    if (selectedCell && selectedNumber === null) {
      if (n === 'erase') {
        handleErase();
      } else {
        handleNumberInput(n);
      }
      return;
    }

    // Enter or switch number-first mode
    selectedNumber = n;
    renderBoard();
    renderNumpad();
  }

  function handleNumberInput(num) {
    if (gameOver || !selectedCell) return;
    const { r, c } = selectedCell;
    if (given[r][c]) return;

    moveHistory.push({
      r, c,
      prevValue: board[r][c],
      prevPencil: new Set(pencil[r][c]),
      prevHinted: hinted[r][c],
    });

    if (pencilMode) {
      if (pencil[r][c].has(num)) {
        pencil[r][c].delete(num);
      } else {
        pencil[r][c].add(num);
      }
      board[r][c] = 0;
      hinted[r][c] = false;
      vibrate(10);
      renderBoard();
      renderToolbar();
      saveGame();
      return;
    }

    pencil[r][c].clear();

    if (num === solution[r][c]) {
      board[r][c] = num;
      hinted[r][c] = false;
      vibrate(10);
      clearPencilMarks(r, c, num);
      renderBoard();
      renderNumpad();
      renderToolbar();
      updateProgress();
      flashCompletions(r, c);
      saveGame();
      checkWin();
    } else {
      board[r][c] = num;
      hinted[r][c] = false;
      errors++;
      errorsEl.textContent = errors;
      vibrate([30, 20, 30]);
      renderBoard();
      renderToolbar();

      const idx = r * 9 + c;
      const cell = boardEl.children[idx];
      if (cell) {
        cell.classList.add('error-flash');
        cell.classList.add('user-filled');
        cell.style.color = 'var(--danger)';
      }

      setTimeout(() => {
        board[r][c] = 0;
        renderBoard();
        renderNumpad();
        updateProgress();
        saveGame();
      }, 600);

      if (errors >= maxErrors) {
        gameOver = true;
        timer.stop();
        clearSave();
        Stats.record('sudoku', {
          won: false,
          time: timer.getElapsed(),
          difficulty: getDifficulty('sudoku'),
          extra: { hints: hintCount },
        });
        setTimeout(() => {
          showResult(false, 'For mange fejl!<br>Fejl: ' + errors + '/' + maxErrors + '<br>Tid: ' + timer.getFormatted() + '<br>Tips brugt: ' + hintCount, 'sudoku');
        }, 800);
      } else {
        saveGame();
      }
    }
  }

  function handleErase() {
    if (gameOver || !selectedCell) return;
    const { r, c } = selectedCell;
    if (given[r][c]) return;
    if (board[r][c] === 0 && pencil[r][c].size === 0) return;

    moveHistory.push({
      r, c,
      prevValue: board[r][c],
      prevPencil: new Set(pencil[r][c]),
      prevHinted: hinted[r][c],
    });

    board[r][c] = 0;
    pencil[r][c].clear();
    hinted[r][c] = false;
    vibrate(10);
    renderBoard();
    renderNumpad();
    renderToolbar();
    updateProgress();
    saveGame();
  }

  function clearPencilMarks(row, col, num) {
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    for (let i = 0; i < 9; i++) {
      pencil[row][i].delete(num);
      pencil[i][col].delete(num);
    }
    for (let r = br; r < br + 3; r++)
      for (let c = bc; c < bc + 3; c++)
        pencil[r][c].delete(num);
  }

  function flashCompletions(row, col) {
    const cells = [];
    if (Array.from({ length: 9 }, (_, c) => board[row][c]).every(v => v !== 0))
      for (let c = 0; c < 9; c++) cells.push(row * 9 + c);
    if (Array.from({ length: 9 }, (_, r) => board[r][col]).every(v => v !== 0))
      for (let r = 0; r < 9; r++) cells.push(r * 9 + col);
    const br = Math.floor(row / 3) * 3;
    const bc = Math.floor(col / 3) * 3;
    let boxComplete = true;
    for (let r = br; r < br + 3; r++)
      for (let c = bc; c < bc + 3; c++)
        if (board[r][c] === 0) boxComplete = false;
    if (boxComplete)
      for (let r = br; r < br + 3; r++)
        for (let c = bc; c < bc + 3; c++) cells.push(r * 9 + c);
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
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board[r][c] !== solution[r][c]) return;
    gameOver = true;
    timer.stop();
    clearSave();
    Stats.record('sudoku', {
      won: true,
      time: timer.getElapsed(),
      difficulty: getDifficulty('sudoku'),
      extra: { hints: hintCount },
    });
    setTimeout(() => {
      showResult(true, 'Tid: ' + timer.getFormatted() + '<br>Fejl: ' + errors + '/' + maxErrors + '<br>Tips brugt: ' + hintCount, 'sudoku');
    }, 400);
  }

  // ========================
  //  Undo
  // ========================

  function undoMove() {
    if (gameOver || moveHistory.length === 0) return;
    const move = moveHistory.pop();
    board[move.r][move.c] = move.prevValue;
    pencil[move.r][move.c] = new Set(move.prevPencil);
    hinted[move.r][move.c] = move.prevHinted || false;
    selectedCell = { r: move.r, c: move.c };
    vibrate(10);
    renderBoard();
    renderNumpad();
    renderToolbar();
    updateProgress();

    // Flash the undone cell
    const idx = move.r * 9 + move.c;
    const cell = boardEl.children[idx];
    if (cell) {
      cell.classList.add('undo-flash');
      setTimeout(() => cell.classList.remove('undo-flash'), 500);
    }

    saveGame();
  }

  // ========================
  //  Hint System
  // ========================

  function showHint() {
    if (gameOver) return;
    activeHint = null;

    let hint = null;
    if (selectedCell && !given[selectedCell.r][selectedCell.c] &&
        board[selectedCell.r][selectedCell.c] === 0) {
      const fullHint = findHint();
      if (fullHint && fullHint.cell.r === selectedCell.r && fullHint.cell.c === selectedCell.c)
        hint = fullHint;
    }
    if (!hint) hint = findHint();
    if (!hint) return;

    activeHint = hint;
    renderBoard();
    showHintModal(hint);
  }

  function showHintModal(hint) {
    const modal = document.getElementById('sudoku-hint-modal');
    const badge = document.getElementById('su-hint-badge');
    const title = document.getElementById('su-hint-title');
    const stepsEl = document.getElementById('su-hint-steps');
    const answer = document.getElementById('su-hint-answer');

    badge.textContent = hint.technique.icon;
    title.textContent = hint.technique.name;

    stepsEl.innerHTML = '';
    hint.technique.steps.forEach((step, i) => {
      const div = document.createElement('div');
      div.className = 'su-hint-step';
      div.innerHTML = '<span class="su-hint-step-num">' + (i + 1) + '</span><span>' + step + '</span>';
      stepsEl.appendChild(div);
    });

    // Hide the answer initially
    answer.textContent = 'Svaret er: ' + hint.value;
    answer.classList.add('hidden');

    document.getElementById('su-hint-try-btn').onclick = function () {
      closeHintModal();
      trackTechnique(hint.type);
      selectedCell = { r: hint.cell.r, c: hint.cell.c };
      renderBoard();
      setTimeout(() => {
        activeHint = null;
        renderBoard();
      }, 3000);
    };

    document.getElementById('su-hint-show-btn').onclick = function () {
      // Show the answer first, then place it
      answer.classList.remove('hidden');
      trackTechnique(hint.type);
      // Small delay so user sees the answer before modal closes
      setTimeout(() => {
        closeHintModal();
        placeHint(hint);
      }, 600);
    };

    // Backdrop click to close
    modal.querySelector('.su-hint-backdrop').onclick = function () {
      closeHintModal();
      activeHint = null;
      renderBoard();
    };

    modal.classList.add('active');
  }

  function closeHintModal() {
    document.getElementById('sudoku-hint-modal').classList.remove('active');
  }

  function placeHint(hint) {
    const { r, c } = hint.cell;
    const val = hint.value;

    moveHistory.push({
      r, c,
      prevValue: board[r][c],
      prevPencil: new Set(pencil[r][c]),
      prevHinted: hinted[r][c],
    });

    board[r][c] = val;
    pencil[r][c].clear();
    hinted[r][c] = true;
    hintCount++;
    clearPencilMarks(r, c, val);
    activeHint = null;
    selectedCell = { r, c };
    vibrate(10);

    renderBoard();
    renderNumpad();
    renderToolbar();
    updateProgress();

    const idx = r * 9 + c;
    const cell = boardEl.children[idx];
    if (cell) {
      cell.classList.add('hint-flash');
      setTimeout(() => cell.classList.remove('hint-flash'), 800);
    }

    saveGame();
    flashCompletions(r, c);
    checkWin();
  }

  function trackTechnique(type) {
    techniquesLearned[type] = (techniquesLearned[type] || 0) + 1;
    try {
      localStorage.setItem('bg_sudoku_techniques', JSON.stringify(techniquesLearned));
    } catch (e) { /* storage full */ }
  }

  // ========================
  //  Auto-fill Pencil Marks
  // ========================

  function autoFillPencilMarks() {
    if (gameOver) return;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board[r][c] === 0)
          pencil[r][c] = getCandidates(r, c);
    vibrate(10);
    renderBoard();
    saveGame();
  }

  // ========================
  //  Technique Library
  // ========================

  function showTechniqueLibrary() {
    const overlay = document.getElementById('sudoku-techniques-overlay');
    const list = document.getElementById('su-techniques-list');
    list.innerHTML = '';

    TECHNIQUE_INFO.forEach(tech => {
      const card = document.createElement('div');
      card.className = 'su-technique-card';

      const header = document.createElement('div');
      header.className = 'tech-header';
      header.innerHTML = '<span class="tech-icon">' + tech.icon + '</span><span class="tech-name">' + tech.name + '</span>';
      card.appendChild(header);

      const level = document.createElement('div');
      level.className = 'tech-level';
      level.textContent = tech.level;
      card.appendChild(level);

      const desc = document.createElement('div');
      desc.className = 'tech-desc';
      desc.textContent = tech.desc;
      card.appendChild(desc);

      const example = document.createElement('div');
      example.className = 'tech-example';
      example.textContent = tech.example;
      card.appendChild(example);

      const count = techniquesLearned[tech.id] || 0;
      if (count > 0) {
        const badge = document.createElement('div');
        badge.className = 'su-technique-badge';
        if (count >= 3) {
          badge.textContent = '\u2713 Lært! (brugt ' + count + ' gange)';
        } else {
          badge.textContent = 'Brugt ' + count + ' gang' + (count > 1 ? 'e' : '') + ' (' + (3 - count) + ' mere for at lære)';
          badge.style.color = 'var(--text-muted)';
        }
        card.appendChild(badge);
      }

      list.appendChild(card);
    });

    overlay.classList.add('active');
  }

  function closeTechniqueLibrary() {
    document.getElementById('sudoku-techniques-overlay').classList.remove('active');
  }

  // ========================
  //  Save / Resume
  // ========================

  function saveGame() {
    if (gameOver) { clearSave(); return; }
    try {
      const state = {
        board: board.map(r => r.slice()),
        solution: solution.map(r => r.slice()),
        given: given.map(r => r.slice()),
        pencil: pencil.map(r => r.map(c => [...c])),
        hinted: hinted.map(r => r.slice()),
        errors, maxErrors, hintCount,
        difficulty: getDifficulty('sudoku'),
        elapsed: timer ? timer.getElapsed() : 0,
        selectedCell, initialEmpty, milestoneShown,
        moveHistory: moveHistory.map(m => ({
          r: m.r, c: m.c,
          prevValue: m.prevValue,
          prevPencil: [...m.prevPencil],
          prevHinted: m.prevHinted || false,
        })),
      };
      localStorage.setItem('bg_sudoku_save', JSON.stringify(state));
    } catch (e) { /* storage full */ }
  }

  function loadGame(state) {
    try {
      board = state.board;
      solution = state.solution;
      given = state.given;
      pencil = state.pencil.map(r => r.map(c => new Set(c)));
      hinted = state.hinted || Array.from({ length: 9 }, () => Array(9).fill(false));
    } catch (e) {
      // Corrupted save — start fresh
      startGame();
      return;
    }
    errors = state.errors;
    maxErrors = state.maxErrors;
    hintCount = state.hintCount || 0;
    selectedCell = state.selectedCell;
    selectedNumber = null;
    gameOver = false;
    pencilMode = false;
    activeHint = null;
    initialEmpty = state.initialEmpty || 0;
    milestoneShown = state.milestoneShown || {};
    moveHistory = (state.moveHistory || []).map(m => ({
      r: m.r, c: m.c,
      prevValue: m.prevValue,
      prevPencil: new Set(m.prevPencil),
      prevHinted: m.prevHinted || false,
    }));

    errorsEl.textContent = errors;
    maxErrorsEl.textContent = maxErrors;
    pencilBtn.classList.remove('active');

    if (timer) timer.reset();
    timer = new GameTimer(timerEl);
    timer.elapsed = state.elapsed || 0;
    timer.start();

    renderBoard();
    renderNumpad();
    renderToolbar();
    updateProgress();
  }

  function clearSave() {
    localStorage.removeItem('bg_sudoku_save');
  }

  // ========================
  //  Keyboard Support
  // ========================

  function handleKeydown(e) {
    // Only when sudoku screen is active
    const screen = document.getElementById('screen-sudoku');
    if (!screen || !screen.classList.contains('active')) return;
    if (gameOver) return;

    // Close modals on Escape
    if (e.key === 'Escape') {
      const hintModal = document.getElementById('sudoku-hint-modal');
      if (hintModal.classList.contains('active')) {
        closeHintModal();
        activeHint = null;
        renderBoard();
        e.preventDefault();
        return;
      }
      const techOverlay = document.getElementById('sudoku-techniques-overlay');
      if (techOverlay.classList.contains('active')) {
        closeTechniqueLibrary();
        e.preventDefault();
        return;
      }
      // Deselect number-first mode
      if (selectedNumber !== null) {
        selectedNumber = null;
        renderBoard();
        renderNumpad();
        e.preventDefault();
        return;
      }
      return;
    }

    // Number keys 1-9
    if (e.key >= '1' && e.key <= '9') {
      const num = parseInt(e.key);
      handleNumpadClick(num);
      e.preventDefault();
      return;
    }

    // Backspace / Delete to erase
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (selectedCell) handleErase();
      e.preventDefault();
      return;
    }

    // Arrow keys to navigate
    if (e.key.startsWith('Arrow') && selectedCell) {
      let { r, c } = selectedCell;
      if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
      else if (e.key === 'ArrowDown') r = Math.min(8, r + 1);
      else if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
      else if (e.key === 'ArrowRight') c = Math.min(8, c + 1);
      selectedCell = { r, c };
      activeHint = null;
      renderBoard();
      e.preventDefault();
      return;
    }

    // H for hint
    if (e.key === 'h' || e.key === 'H') {
      showHint();
      e.preventDefault();
      return;
    }

    // Z for undo
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
      undoMove();
      e.preventDefault();
      return;
    }
  }

  document.addEventListener('keydown', handleKeydown);

  // ========================
  //  Event Wiring
  // ========================

  pencilBtn.onclick = () => {
    pencilMode = !pencilMode;
    pencilBtn.classList.toggle('active', pencilMode);
  };

  undoBtn.onclick = undoMove;
  hintBtn.onclick = showHint;
  autonoteBtn.onclick = autoFillPencilMarks;
  learnBtn.onclick = showTechniqueLibrary;
  document.getElementById('su-techniques-close').onclick = closeTechniqueLibrary;

  diffBtn.onclick = () => {
    showDifficultyModal('sudoku', DIFFICULTIES, (val) => {
      diffBtn.textContent = LABEL_MAP[val] || 'Let';
      clearSave();
      startGame();
    });
  };

  window.initSudoku = initSudoku;
  window.gameRestarters.sudoku = function () {
    clearSave();
    startGame();
  };
  window.gameCleanups.sudoku = function () {
    gameOver = true;
    selectedNumber = null;
    activeHint = null;
    if (timer) timer.reset();
    closeHintModal();
    closeTechniqueLibrary();
  };
})();
