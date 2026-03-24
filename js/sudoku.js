/* ===== Sudoku ===== */

(function () {
  const DIFFICULTIES = [
    { label: 'Let', value: 'easy' },
    { label: 'Medium', value: 'medium' },
    { label: 'Svær', value: 'hard' },
    { label: 'Ekspert', value: 'expert' },
    { label: 'Ond', value: 'evil' },
  ];

  const CONFIG = {
    easy:   { givens: 38, maxErrors: 5 },
    medium: { givens: 32, maxErrors: 3 },
    hard:   { givens: 26, maxErrors: 3 },
    expert: { givens: 22, maxErrors: 2 },
    evil:   { givens: 17, maxErrors: 1 },
  };

  const LABEL_MAP = { easy: 'Let', medium: 'Medium', hard: 'Svær', expert: 'Ekspert', evil: 'Ond' };

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
    {
      id: 'naked_pair',
      name: 'Nøgent par',
      icon: '\uD83D\uDC6F',
      desc: 'Når to celler i samme enhed kun kan indeholde de samme to tal, kan disse tal fjernes fra alle andre celler i enheden.',
      example: 'To celler i en række kan kun være 3 eller 7. Så kan 3 og 7 fjernes fra resten af rækken — og det afslører svaret!',
      level: 'Øvet',
    },
    {
      id: 'pointing_pair',
      name: 'Pegende par',
      icon: '\u261D\uFE0F',
      desc: 'Når et tal i en boks kun kan stå i én række eller kolonne, kan det fjernes fra resten af den række/kolonne.',
      example: 'I en boks kan tallet 4 kun stå i række 3. Så kan 4 fjernes fra resten af række 3 — og det afslører svaret!',
      level: 'Øvet',
    },
    {
      id: 'box_line',
      name: 'Boks-linje',
      icon: '\u2194\uFE0F',
      desc: 'Når et tal i en række/kolonne kun kan stå inden for én boks, kan det fjernes fra resten af den boks.',
      example: 'I række 5 kan tallet 8 kun stå i boks 6. Så kan 8 fjernes fra resten af boks 6 — og det afslører svaret!',
      level: 'Øvet',
    },
    {
      id: 'naked_triple',
      name: 'Nøgen triple',
      icon: '3\uFE0F\u20E3',
      desc: 'Tre celler i en enhed deler tilsammen kun 3 mulige tal. Disse tal kan fjernes fra alle andre celler i enheden.',
      example: 'Tre celler kan kun være 2, 5 eller 8. Så kan 2, 5 og 8 fjernes fra resten af rækken — og det afslører svaret!',
      level: 'Avanceret',
    },
    {
      id: 'hidden_pair',
      name: 'Skjult par',
      icon: '\uD83D\uDD75\uFE0F',
      desc: 'To tal kan kun stå i de samme to celler i en enhed. Alle andre kandidater kan fjernes fra de to celler.',
      example: 'Tallene 3 og 9 kan kun stå i to bestemte celler i en kolonne. Fjern alt andet fra de celler — og svaret afsløres!',
      level: 'Avanceret',
    },
    {
      id: 'x_wing',
      name: 'X-Wing',
      icon: '\u2716\uFE0F',
      desc: 'Et tal optræder i præcis 2 celler i 2 rækker, og disse celler er i de samme 2 kolonner. Tallet kan fjernes fra resten af de kolonner.',
      example: 'Tallet 6 kan kun stå i kolonne 2 og 7 i både række 1 og række 5. Så kan 6 fjernes fra resten af kolonne 2 og 7!',
      level: 'Avanceret',
    },
    {
      id: 'hidden_triple',
      name: 'Skjult triple',
      icon: '\uD83D\uDD76\uFE0F',
      desc: 'Tre tal kan kun stå i de samme tre celler i en enhed. Alle andre kandidater fjernes fra de tre celler.',
      example: 'Tallene 1, 4 og 7 kan kun stå i tre bestemte celler. Fjern alt andet fra dem — og svaret afsløres!',
      level: 'Ekspert',
    },
    {
      id: 'swordfish',
      name: 'Swordfish',
      icon: '\uD83D\uDC1F',
      desc: 'Som X-Wing men med 3 rækker og 3 kolonner. Et tal danner et mønster der tillader eliminering.',
      example: 'Tallet 5 danner et mønster over 3 rækker og 3 kolonner — så kan 5 fjernes fra resten af de kolonner!',
      level: 'Ekspert',
    },
    {
      id: 'xy_wing',
      name: 'XY-Wing',
      icon: '\uD83E\uDEB6',
      desc: 'Tre celler med 2 kandidater hver danner en kæde (AB, AC, BC). Tallet de deler kan fjernes fra celler der ser begge "vinger".',
      example: 'En celle har 3,7 — den ser en celle med 3,5 og en med 5,7. Tallet 5 kan fjernes fra celler der ser begge vinger!',
      level: 'Ekspert',
    },
    {
      id: 'naked_quad',
      name: 'Nøgen firer',
      icon: '4\uFE0F\u20E3',
      desc: 'Fire celler i en enhed deler tilsammen kun 4 mulige tal. Disse tal kan fjernes fra alle andre celler i enheden.',
      example: 'Fire celler i en boks kan kun indeholde 1, 3, 6 og 9. Fjern disse fra resten af boksen!',
      level: 'Ekspert',
    },
    {
      id: 'skyscraper',
      name: 'Skyscraper',
      icon: '\uD83C\uDFD9\uFE0F',
      desc: 'To rækker har et tal i præcis 2 celler. En af kolonnerne er ens — den anden er forskudt. Tallet kan fjernes fra celler der ser begge "toppe".',
      example: 'Tallet 3 står i kolonne 2 og 5 i række 1, og kolonne 2 og 8 i række 6. Kolonne 2 deles — fjern 3 fra celler der ser kolonne 5 OG 8!',
      level: 'Ekspert',
    },
    {
      id: 'simple_coloring',
      name: 'Simpel farvning',
      icon: '\uD83C\uDFA8',
      desc: 'Når et tal kun kan stå 2 steder i en enhed, danner det en kæde af "enten-eller". Hvis to celler med samme farve ser hinanden, er den farve falsk.',
      example: 'Tallet 7 danner en kæde: A eller B i række 1, B eller C i kolonne 3... Hvis to "blå" celler ser hinanden, er alle blå falske!',
      level: 'Ekspert',
    },
    {
      id: 'unique_rectangle',
      name: 'Unik rektangel',
      icon: '\u25AD',
      desc: 'Fire celler danner et rektangel over 2 bokse med de samme 2 kandidater. Da puzzlet kun har én løsning, må mønstret brydes.',
      example: 'Tre hjørner har kun 3 og 7. Det fjerde hjørne har 3, 7 og 5. Tallet 5 MÅ placeres der — ellers ville der være to løsninger!',
      level: 'Ekspert',
    },
    {
      id: 'two_string_kite',
      name: '2-strengs drage',
      icon: '\uD83E\uDE81',
      desc: 'Et tal har præcis 2 positioner i både en række og en kolonne. Hvis en position fra hver deler en boks, kan tallet elimineres fra cellen der ser de to andre.',
      example: 'Tallet 4 i række 2 og kolonne 5 deler en boks. Cellen der ser begge "ender" kan ikke indeholde 4!',
      level: 'Ekspert',
    },
    {
      id: 'w_wing',
      name: 'W-Wing',
      icon: 'W',
      desc: 'To identiske bivalue-celler forbundet af et stærkt link på en af deres kandidater. Den anden kandidat kan fjernes fra celler der ser begge.',
      example: 'To celler har begge 3,8. De er forbundet via et stærkt link på 3. Så 8 kan fjernes fra celler der ser dem begge!',
      level: 'Ekspert',
    },
    {
      id: 'xyz_wing',
      name: 'XYZ-Wing',
      icon: '\uD83E\uDEB6',
      desc: 'Som XY-Wing men pivot-cellen har 3 kandidater (XYZ). Det fælles tal Z kan fjernes fra celler der ser alle tre celler.',
      example: 'Pivot har 2,5,8. Vinger har 2,5 og 5,8. Tallet 5 fjernes fra celler der ser alle tre!',
      level: 'Ekspert',
    },
    {
      id: 'bug_plus_one',
      name: 'BUG+1',
      icon: '\uD83D\uDC1B',
      desc: 'Når alle celler undtagen én har præcis 2 kandidater, har den ene celle en ekstra kandidat. Den ekstra kandidat MÅ placeres.',
      example: 'Alle celler har 2 kandidater undtagen én med 3. Den tredje kandidat — den der optræder 3 gange i en enhed — er svaret!',
      level: 'Ekspert',
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
  let techniquesLearned = {};
  let selectedNumber = null;
  let numberFirstMode = false;
  let highlightCandidates = true;
  let tabletMode = false;
  let paused = false;

  // Load persisted settings
  try {
    techniquesLearned = JSON.parse(localStorage.getItem('bg_sudoku_techniques') || '{}');
  } catch (e) {
    techniquesLearned = {};
  }
  try {
    const s = JSON.parse(localStorage.getItem('bg_sudoku_settings') || '{}');
    if (s.highlightCandidates !== undefined) highlightCandidates = s.highlightCandidates;
    if (s.tabletMode !== undefined) tabletMode = s.tabletMode;
  } catch (e) { /* ignore */ }

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

  // ========================
  //  Init & Start
  // ========================

  function applyTabletMode() {
    document.getElementById('screen-sudoku').classList.toggle('tablet-mode', tabletMode);
  }

  function initSudoku() {
    applyTabletMode();
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
    paused = false;

    errorsEl.textContent = '0';
    maxErrorsEl.textContent = maxErrors;
    pencilBtn.classList.remove('active');
    document.getElementById('sudoku-pause-btn').textContent = '\u23F8';
    boardEl.classList.remove('su-paused');
    document.getElementById('sudoku-pause-overlay').classList.remove('active');
    numpadEl.style.pointerEvents = '';
    numpadEl.style.opacity = '';

    if (timer) timer.reset();
    timer = new GameTimer(timerEl);

    // Generate puzzle with technique-based difficulty grading
    const MAX_ATTEMPTS = 20;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      solution = generateSolved();
      board = solution.map(r => r.slice());
      given = Array.from({ length: 9 }, () => Array(9).fill(true));
      pencil = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
      hinted = Array.from({ length: 9 }, () => Array(9).fill(false));

      removeCells(81 - config.givens);

      const grade = gradePuzzle(board, solution);
      // Accept if tier matches target difficulty, or if we ran out of attempts
      if (grade.tier === diff || attempt === MAX_ATTEMPTS - 1) break;
      // For easy: also accept if puzzle is easier than target
      if (diff === 'easy' && TIER_ORDER.indexOf(grade.tier) <= TIER_ORDER.indexOf('easy')) break;
      // For evil: accept anything that requires guessing or expert techniques
      if (diff === 'evil' && TIER_ORDER.indexOf(grade.tier) >= TIER_ORDER.indexOf('expert')) break;
    }

    renderBoard();
    renderNumpad();
    renderToolbar();
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
      // MCV: find empty cell with fewest valid candidates
      let minCands = 10, bestR = -1, bestC = -1;
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
          if (copy[r][c] === 0) {
            let cnt = 0;
            for (let n = 1; n <= 9; n++)
              if (isValid(copy, r, c, n)) cnt++;
            if (cnt === 0) return; // dead end
            if (cnt < minCands) { minCands = cnt; bestR = r; bestC = c; }
          }
      if (bestR === -1) { count++; return; }
      for (let n = 1; n <= 9; n++) {
        if (isValid(copy, bestR, bestC, n)) {
          copy[bestR][bestC] = n;
          solve();
          copy[bestR][bestC] = 0;
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
  //  Difficulty Grading
  // ========================

  const TECHNIQUE_TIERS = {
    last_remaining: 'easy', naked_single: 'easy', hidden_single: 'easy',
    naked_pair: 'medium', pointing_pair: 'medium', box_line: 'medium',
    naked_triple: 'hard', hidden_pair: 'hard', x_wing: 'hard',
    hidden_triple: 'expert', swordfish: 'expert', xy_wing: 'expert',
    naked_quad: 'expert', skyscraper: 'expert', simple_coloring: 'expert',
    unique_rectangle: 'expert', two_string_kite: 'expert', w_wing: 'expert',
    xyz_wing: 'expert', bug_plus_one: 'expert',
    fallback: 'evil',
  };

  const TIER_ORDER = ['easy', 'medium', 'hard', 'expert', 'evil'];

  function gradePuzzle(puzzleBoard, solutionBoard) {
    // Temporarily swap board/solution so findHint() works on our copy
    const origBoard = board;
    const origSolution = solution;
    const origGiven = given;
    const origPencil = pencil;
    const origHinted = hinted;

    board = puzzleBoard.map(r => r.slice());
    solution = solutionBoard;
    given = board.map(r => r.map(v => v !== 0));
    pencil = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
    hinted = Array.from({ length: 9 }, () => Array(9).fill(false));

    let maxTier = 'easy';
    let solved = false;
    const maxSteps = 200;

    for (let step = 0; step < maxSteps; step++) {
      const hint = findHint();
      if (!hint) break;

      const tier = TECHNIQUE_TIERS[hint.type] || 'evil';
      if (TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(maxTier)) {
        maxTier = tier;
      }

      // Place the value
      board[hint.cell.r][hint.cell.c] = hint.value;

      // Check if solved
      let done = true;
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
          if (board[r][c] !== solutionBoard[r][c]) done = false;
      if (done) { solved = true; break; }
    }

    // Restore original state
    board = origBoard;
    solution = origSolution;
    given = origGiven;
    pencil = origPencil;
    hinted = origHinted;

    return { solved, tier: maxTier };
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
    hint = findNakedPairHint();
    if (hint) return hint;
    hint = findPointingPairHint();
    if (hint) return hint;
    hint = findBoxLineHint();
    if (hint) return hint;
    hint = findNakedTripleHint();
    if (hint) return hint;
    hint = findHiddenPairHint();
    if (hint) return hint;
    hint = findXWingHint();
    if (hint) return hint;
    hint = findHiddenTripleHint();
    if (hint) return hint;
    hint = findSwordfishHint();
    if (hint) return hint;
    hint = findXYWingHint();
    if (hint) return hint;
    hint = findNakedQuadHint();
    if (hint) return hint;
    hint = findSkyscraperHint();
    if (hint) return hint;
    hint = findSimpleColoringHint();
    if (hint) return hint;
    hint = findUniqueRectangleHint();
    if (hint) return hint;
    hint = findTwoStringKiteHint();
    if (hint) return hint;
    hint = findWWingHint();
    if (hint) return hint;
    hint = findXYZWingHint();
    if (hint) return hint;
    hint = findBugPlusOneHint();
    if (hint) return hint;
    return findFallback();
  }

  function getAllCandidates() {
    const cands = [];
    for (let r = 0; r < 9; r++) {
      cands[r] = [];
      for (let c = 0; c < 9; c++)
        cands[r][c] = getCandidates(r, c);
    }
    return cands;
  }

  function copyCands(cands) {
    return cands.map(r => r.map(c => new Set(c)));
  }

  // Find a cell revealed by elimination: naked single OR hidden single
  function findRevealedCell(cands) {
    // Check for naked singles (cell with 1 candidate)
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (cands[r][c].size === 1)
          return { r, c, val: cands[r][c].values().next().value };
    // Check for hidden singles (number with only 1 position in a unit)
    // Rows
    for (let r = 0; r < 9; r++)
      for (let num = 1; num <= 9; num++) {
        let count = 0, lastC = -1;
        for (let c = 0; c < 9; c++)
          if (cands[r][c].has(num)) { count++; lastC = c; }
        if (count === 1) return { r, c: lastC, val: num };
      }
    // Columns
    for (let c = 0; c < 9; c++)
      for (let num = 1; num <= 9; num++) {
        let count = 0, lastR = -1;
        for (let r = 0; r < 9; r++)
          if (cands[r][c].has(num)) { count++; lastR = r; }
        if (count === 1) return { r: lastR, c, val: num };
      }
    // Boxes
    for (let br = 0; br < 9; br += 3)
      for (let bc = 0; bc < 9; bc += 3)
        for (let num = 1; num <= 9; num++) {
          let count = 0, lastR = -1, lastC = -1;
          for (let dr = 0; dr < 3; dr++)
            for (let dc = 0; dc < 3; dc++)
              if (cands[br + dr][bc + dc].has(num)) { count++; lastR = br + dr; lastC = bc + dc; }
          if (count === 1) return { r: lastR, c: lastC, val: num };
        }
    return null;
  }

  function findNakedPairHint() {
    const cands = getAllCandidates();

    // Helper: check unit for naked pairs
    function checkUnit(cells, unitName) {
      // Find cells with exactly 2 candidates
      const pairs = [];
      for (const [r, c] of cells)
        if (cands[r][c].size === 2) pairs.push([r, c]);

      for (let i = 0; i < pairs.length; i++) {
        for (let j = i + 1; j < pairs.length; j++) {
          const [r1, c1] = pairs[i];
          const [r2, c2] = pairs[j];
          const s1 = cands[r1][c1];
          const s2 = cands[r2][c2];
          // Check same 2 candidates
          if (s1.size !== 2 || s2.size !== 2) continue;
          const vals = [...s1];
          if (!s2.has(vals[0]) || !s2.has(vals[1])) continue;

          // Try eliminating these values from other cells in the unit
          const copy = copyCands(cands);
          let eliminated = false;
          for (const [r, c] of cells) {
            if ((r === r1 && c === c1) || (r === r2 && c === c2)) continue;
            for (const v of vals) {
              if (copy[r][c].delete(v)) eliminated = true;
            }
          }
          if (!eliminated) continue;

          // Check if elimination created a single
          const single = findRevealedCell(copy);
          if (single && single.val === solution[single.r][single.c]) {
            const highlights = [
              { r: r1, c: c1, type: 'eliminator' },
              { r: r2, c: c2, type: 'eliminator' },
              { r: single.r, c: single.c, type: 'target' },
            ];
            for (const [r, c] of cells) highlights.push({ r, c, type: 'unit' });
            return {
              type: 'naked_pair', cell: { r: single.r, c: single.c }, value: single.val, highlights,
              technique: {
                name: 'Nøgent par', icon: '\uD83D\uDC6F',
                steps: [
                  'Cellerne (' + (r1+1) + ',' + (c1+1) + ') og (' + (r2+1) + ',' + (c2+1) + ') kan kun indeholde ' + vals[0] + ' og ' + vals[1] + '.',
                  'Derfor kan ' + vals[0] + ' og ' + vals[1] + ' fjernes fra andre celler i ' + unitName + '.',
                  'Nu kan cellen (' + (single.r+1) + ',' + (single.c+1) + ') kun indeholde ' + single.val + '!',
                ],
              },
            };
          }
        }
      }
      return null;
    }

    // Check all rows
    for (let r = 0; r < 9; r++) {
      const cells = [];
      for (let c = 0; c < 9; c++) if (board[r][c] === 0) cells.push([r, c]);
      const result = checkUnit(cells, 'række ' + (r+1));
      if (result) return result;
    }
    // Check all columns
    for (let c = 0; c < 9; c++) {
      const cells = [];
      for (let r = 0; r < 9; r++) if (board[r][c] === 0) cells.push([r, c]);
      const result = checkUnit(cells, 'kolonne ' + (c+1));
      if (result) return result;
    }
    // Check all boxes
    for (let br = 0; br < 9; br += 3)
      for (let bc = 0; bc < 9; bc += 3) {
        const cells = [];
        for (let dr = 0; dr < 3; dr++)
          for (let dc = 0; dc < 3; dc++)
            if (board[br+dr][bc+dc] === 0) cells.push([br+dr, bc+dc]);
        const boxNum = Math.floor(br/3)*3 + Math.floor(bc/3) + 1;
        const result = checkUnit(cells, 'boks ' + boxNum);
        if (result) return result;
      }
    return null;
  }

  function findPointingPairHint() {
    const cands = getAllCandidates();

    for (let br = 0; br < 9; br += 3) {
      for (let bc = 0; bc < 9; bc += 3) {
        for (let num = 1; num <= 9; num++) {
          // Find where num can go in this box
          const positions = [];
          for (let dr = 0; dr < 3; dr++)
            for (let dc = 0; dc < 3; dc++)
              if (cands[br+dr][bc+dc].has(num)) positions.push([br+dr, bc+dc]);
          if (positions.length < 2 || positions.length > 3) continue;

          // Check if all in same row
          const allSameRow = positions.every(p => p[0] === positions[0][0]);
          // Check if all in same col
          const allSameCol = positions.every(p => p[1] === positions[0][1]);

          if (!allSameRow && !allSameCol) continue;

          const copy = copyCands(cands);
          let eliminated = false;

          if (allSameRow) {
            const row = positions[0][0];
            for (let c = 0; c < 9; c++) {
              if (c >= bc && c < bc + 3) continue; // skip the box
              if (copy[row][c].delete(num)) eliminated = true;
            }
          } else {
            const col = positions[0][1];
            for (let r = 0; r < 9; r++) {
              if (r >= br && r < br + 3) continue;
              if (copy[r][col].delete(num)) eliminated = true;
            }
          }

          if (!eliminated) continue;
          const single = findRevealedCell(copy);
          if (single && single.val === solution[single.r][single.c]) {
            const boxNum = Math.floor(br/3)*3 + Math.floor(bc/3) + 1;
            const unitName = allSameRow ? 'række ' + (positions[0][0]+1) : 'kolonne ' + (positions[0][1]+1);
            const highlights = [{ r: single.r, c: single.c, type: 'target' }];
            for (const [r, c] of positions) highlights.push({ r, c, type: 'eliminator' });
            return {
              type: 'pointing_pair', cell: { r: single.r, c: single.c }, value: single.val, highlights,
              technique: {
                name: 'Pegende par', icon: '\u261D\uFE0F',
                steps: [
                  'I boks ' + boxNum + ' kan ' + num + ' kun stå i ' + unitName + '.',
                  'Derfor kan ' + num + ' fjernes fra resten af ' + unitName + '.',
                  'Nu kan cellen (' + (single.r+1) + ',' + (single.c+1) + ') kun indeholde ' + single.val + '!',
                ],
              },
            };
          }
        }
      }
    }
    return null;
  }

  function findBoxLineHint() {
    const cands = getAllCandidates();

    // Check rows
    for (let r = 0; r < 9; r++) {
      for (let num = 1; num <= 9; num++) {
        const positions = [];
        for (let c = 0; c < 9; c++)
          if (cands[r][c].has(num)) positions.push([r, c]);
        if (positions.length < 2 || positions.length > 3) continue;

        // Check if all in same box
        const br = Math.floor(positions[0][0] / 3) * 3;
        const bc = Math.floor(positions[0][1] / 3) * 3;
        if (!positions.every(p => Math.floor(p[1]/3)*3 === bc)) continue;

        const copy = copyCands(cands);
        let eliminated = false;
        for (let dr = 0; dr < 3; dr++)
          for (let dc = 0; dc < 3; dc++) {
            const rr = br + dr, cc = bc + dc;
            if (rr === r) continue; // skip the row itself
            if (copy[rr][cc].delete(num)) eliminated = true;
          }

        if (!eliminated) continue;
        const single = findRevealedCell(copy);
        if (single && single.val === solution[single.r][single.c]) {
          const boxNum = Math.floor(br/3)*3 + Math.floor(bc/3) + 1;
          const highlights = [{ r: single.r, c: single.c, type: 'target' }];
          for (const [pr, pc] of positions) highlights.push({ r: pr, c: pc, type: 'eliminator' });
          return {
            type: 'box_line', cell: { r: single.r, c: single.c }, value: single.val, highlights,
            technique: {
              name: 'Boks-linje', icon: '\u2194\uFE0F',
              steps: [
                'I række ' + (r+1) + ' kan ' + num + ' kun stå i boks ' + boxNum + '.',
                'Derfor kan ' + num + ' fjernes fra resten af boks ' + boxNum + '.',
                'Nu kan cellen (' + (single.r+1) + ',' + (single.c+1) + ') kun indeholde ' + single.val + '!',
              ],
            },
          };
        }
      }
    }
    // Check columns
    for (let c = 0; c < 9; c++) {
      for (let num = 1; num <= 9; num++) {
        const positions = [];
        for (let r = 0; r < 9; r++)
          if (cands[r][c].has(num)) positions.push([r, c]);
        if (positions.length < 2 || positions.length > 3) continue;

        const br = Math.floor(positions[0][0] / 3) * 3;
        const bc = Math.floor(positions[0][1] / 3) * 3;
        if (!positions.every(p => Math.floor(p[0]/3)*3 === br)) continue;

        const copy = copyCands(cands);
        let eliminated = false;
        for (let dr = 0; dr < 3; dr++)
          for (let dc = 0; dc < 3; dc++) {
            const rr = br + dr, cc = bc + dc;
            if (cc === c) continue;
            if (copy[rr][cc].delete(num)) eliminated = true;
          }

        if (!eliminated) continue;
        const single = findRevealedCell(copy);
        if (single && single.val === solution[single.r][single.c]) {
          const boxNum = Math.floor(br/3)*3 + Math.floor(bc/3) + 1;
          const highlights = [{ r: single.r, c: single.c, type: 'target' }];
          for (const [pr, pc] of positions) highlights.push({ r: pr, c: pc, type: 'eliminator' });
          return {
            type: 'box_line', cell: { r: single.r, c: single.c }, value: single.val, highlights,
            technique: {
              name: 'Boks-linje', icon: '\u2194\uFE0F',
              steps: [
                'I kolonne ' + (c+1) + ' kan ' + num + ' kun stå i boks ' + boxNum + '.',
                'Derfor kan ' + num + ' fjernes fra resten af boks ' + boxNum + '.',
                'Nu kan cellen (' + (single.r+1) + ',' + (single.c+1) + ') kun indeholde ' + single.val + '!',
              ],
            },
          };
        }
      }
    }
    return null;
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
        return {
          type: 'last_remaining', cell: { r, c }, value: val,
          highlights: [{ r, c, type: 'target' }],
          technique: {
            name: 'Sidste plads', icon: '1\uFE0F\u20E3',
            steps: ['Der er kun én tom plads i rækken.'],
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
        return {
          type: 'last_remaining', cell: { r, c }, value: val,
          highlights: [{ r, c, type: 'target' }],
          technique: {
            name: 'Sidste plads', icon: '1\uFE0F\u20E3',
            steps: ['Der er kun én tom plads i kolonnen.'],
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
          return {
            type: 'last_remaining', cell: { r, c }, value: val,
            highlights: [{ r, c, type: 'target' }],
            technique: {
              name: 'Sidste plads', icon: '1\uFE0F\u20E3',
              steps: ['Der er kun én tom plads i boksen.'],
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
          const steps = [
            'Alle andre tal findes allerede i rækken, kolonnen eller boksen.',
            'Det eneste tal der er tilbage er ' + val + '!',
          ];
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
          return {
            type: 'hidden_single', cell: { r, c }, value: num,
            highlights: [{ r, c, type: 'target' }],
            technique: {
              name: 'Skjult eneste', icon: '\uD83D\uDD0D',
              steps: [num + ' kan kun stå ét sted i denne række.'],
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
          return {
            type: 'hidden_single', cell: { r, c }, value: num,
            highlights: [{ r, c, type: 'target' }],
            technique: {
              name: 'Skjult eneste', icon: '\uD83D\uDD0D',
              steps: [num + ' kan kun stå ét sted i denne kolonne.'],
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
            return {
              type: 'hidden_single', cell: { r, c }, value: num,
              highlights: [{ r, c, type: 'target' }],
              technique: {
                name: 'Skjult eneste', icon: '\uD83D\uDD0D',
                steps: [num + ' kan kun stå ét sted i denne boks.'],
              },
            };
          }
        }
      }
    }
    return null;
  }

  function findNakedTripleHint() {
    const cands = getAllCandidates();

    function checkUnit(cells, unitName) {
      // Find cells with 2-3 candidates
      const small = cells.filter(([r, c]) => cands[r][c].size >= 2 && cands[r][c].size <= 3);
      if (small.length < 3) return null;

      for (let i = 0; i < small.length; i++)
        for (let j = i + 1; j < small.length; j++)
          for (let k = j + 1; k < small.length; k++) {
            const union = new Set([...cands[small[i][0]][small[i][1]], ...cands[small[j][0]][small[j][1]], ...cands[small[k][0]][small[k][1]]]);
            if (union.size !== 3) continue;

            const copy = copyCands(cands);
            let eliminated = false;
            const tripleVals = [...union];
            for (const [r, c] of cells) {
              if ((r === small[i][0] && c === small[i][1]) ||
                  (r === small[j][0] && c === small[j][1]) ||
                  (r === small[k][0] && c === small[k][1])) continue;
              for (const v of tripleVals)
                if (copy[r][c].delete(v)) eliminated = true;
            }
            if (!eliminated) continue;

            const single = findRevealedCell(copy);
            if (single && single.val === solution[single.r][single.c]) {
              const highlights = [
                { r: small[i][0], c: small[i][1], type: 'eliminator' },
                { r: small[j][0], c: small[j][1], type: 'eliminator' },
                { r: small[k][0], c: small[k][1], type: 'eliminator' },
                { r: single.r, c: single.c, type: 'target' },
              ];
              return {
                type: 'naked_triple', cell: { r: single.r, c: single.c }, value: single.val, highlights,
                technique: {
                  name: 'Nøgen triple', icon: '3\uFE0F\u20E3',
                  steps: [
                    'Tre celler i ' + unitName + ' kan tilsammen kun indeholde ' + tripleVals.join(', ') + '.',
                    'Derfor kan disse tal fjernes fra de andre celler.',
                    'Nu kan cellen (' + (single.r+1) + ',' + (single.c+1) + ') kun indeholde ' + single.val + '!',
                  ],
                },
              };
            }
          }
      return null;
    }

    for (let r = 0; r < 9; r++) {
      const cells = [];
      for (let c = 0; c < 9; c++) if (board[r][c] === 0) cells.push([r, c]);
      const result = checkUnit(cells, 'række ' + (r+1));
      if (result) return result;
    }
    for (let c = 0; c < 9; c++) {
      const cells = [];
      for (let r = 0; r < 9; r++) if (board[r][c] === 0) cells.push([r, c]);
      const result = checkUnit(cells, 'kolonne ' + (c+1));
      if (result) return result;
    }
    for (let br = 0; br < 9; br += 3)
      for (let bc = 0; bc < 9; bc += 3) {
        const cells = [];
        for (let dr = 0; dr < 3; dr++)
          for (let dc = 0; dc < 3; dc++)
            if (board[br+dr][bc+dc] === 0) cells.push([br+dr, bc+dc]);
        const boxNum = Math.floor(br/3)*3 + Math.floor(bc/3) + 1;
        const result = checkUnit(cells, 'boks ' + boxNum);
        if (result) return result;
      }
    return null;
  }

  function findHiddenPairHint() {
    const cands = getAllCandidates();

    function checkUnit(cells, unitName) {
      // For each pair of numbers 1-9, check if they appear in exactly 2 cells
      for (let n1 = 1; n1 <= 9; n1++) {
        for (let n2 = n1 + 1; n2 <= 9; n2++) {
          const cellsWithN1 = cells.filter(([r, c]) => cands[r][c].has(n1));
          const cellsWithN2 = cells.filter(([r, c]) => cands[r][c].has(n2));
          if (cellsWithN1.length !== 2 || cellsWithN2.length !== 2) continue;
          // Check same 2 cells
          if (cellsWithN1[0][0] !== cellsWithN2[0][0] || cellsWithN1[0][1] !== cellsWithN2[0][1]) continue;
          if (cellsWithN1[1][0] !== cellsWithN2[1][0] || cellsWithN1[1][1] !== cellsWithN2[1][1]) continue;

          const [r1, c1] = cellsWithN1[0];
          const [r2, c2] = cellsWithN1[1];
          // Only useful if these cells have MORE than just n1,n2
          if (cands[r1][c1].size <= 2 && cands[r2][c2].size <= 2) continue;

          const copy = copyCands(cands);
          copy[r1][c1] = new Set([n1, n2]);
          copy[r2][c2] = new Set([n1, n2]);

          const single = findRevealedCell(copy);
          if (single && single.val === solution[single.r][single.c]) {
            const highlights = [
              { r: r1, c: c1, type: 'eliminator' },
              { r: r2, c: c2, type: 'eliminator' },
              { r: single.r, c: single.c, type: 'target' },
            ];
            return {
              type: 'hidden_pair', cell: { r: single.r, c: single.c }, value: single.val, highlights,
              technique: {
                name: 'Skjult par', icon: '\uD83D\uDD75\uFE0F',
                steps: [
                  'I ' + unitName + ' kan ' + n1 + ' og ' + n2 + ' kun stå i cellerne (' + (r1+1) + ',' + (c1+1) + ') og (' + (r2+1) + ',' + (c2+1) + ').',
                  'Alle andre kandidater kan fjernes fra disse celler.',
                  'Nu kan cellen (' + (single.r+1) + ',' + (single.c+1) + ') kun indeholde ' + single.val + '!',
                ],
              },
            };
          }
        }
      }
      return null;
    }

    for (let r = 0; r < 9; r++) {
      const cells = [];
      for (let c = 0; c < 9; c++) if (board[r][c] === 0) cells.push([r, c]);
      const result = checkUnit(cells, 'række ' + (r+1));
      if (result) return result;
    }
    for (let c = 0; c < 9; c++) {
      const cells = [];
      for (let r = 0; r < 9; r++) if (board[r][c] === 0) cells.push([r, c]);
      const result = checkUnit(cells, 'kolonne ' + (c+1));
      if (result) return result;
    }
    for (let br = 0; br < 9; br += 3)
      for (let bc = 0; bc < 9; bc += 3) {
        const cells = [];
        for (let dr = 0; dr < 3; dr++)
          for (let dc = 0; dc < 3; dc++)
            if (board[br+dr][bc+dc] === 0) cells.push([br+dr, bc+dc]);
        const boxNum = Math.floor(br/3)*3 + Math.floor(bc/3) + 1;
        const result = checkUnit(cells, 'boks ' + boxNum);
        if (result) return result;
      }
    return null;
  }

  function findXWingHint() {
    const cands = getAllCandidates();

    // Check rows: find num that appears in exactly 2 cols in 2 different rows
    for (let num = 1; num <= 9; num++) {
      // Collect rows where num appears in exactly 2 cells
      const rowPairs = [];
      for (let r = 0; r < 9; r++) {
        const cols = [];
        for (let c = 0; c < 9; c++)
          if (cands[r][c].has(num)) cols.push(c);
        if (cols.length === 2) rowPairs.push({ r, cols });
      }

      for (let i = 0; i < rowPairs.length; i++) {
        for (let j = i + 1; j < rowPairs.length; j++) {
          if (rowPairs[i].cols[0] !== rowPairs[j].cols[0] ||
              rowPairs[i].cols[1] !== rowPairs[j].cols[1]) continue;

          const r1 = rowPairs[i].r, r2 = rowPairs[j].r;
          const c1 = rowPairs[i].cols[0], c2 = rowPairs[i].cols[1];

          // Eliminate num from the 2 columns (outside the 2 rows)
          const copy = copyCands(cands);
          let eliminated = false;
          for (let r = 0; r < 9; r++) {
            if (r === r1 || r === r2) continue;
            if (copy[r][c1].delete(num)) eliminated = true;
            if (copy[r][c2].delete(num)) eliminated = true;
          }
          if (!eliminated) continue;

          const single = findRevealedCell(copy);
          if (single && single.val === solution[single.r][single.c]) {
            const highlights = [
              { r: r1, c: c1, type: 'eliminator' }, { r: r1, c: c2, type: 'eliminator' },
              { r: r2, c: c1, type: 'eliminator' }, { r: r2, c: c2, type: 'eliminator' },
              { r: single.r, c: single.c, type: 'target' },
            ];
            return {
              type: 'x_wing', cell: { r: single.r, c: single.c }, value: single.val, highlights,
              technique: {
                name: 'X-Wing', icon: '\u2716\uFE0F',
                steps: [
                  num + ' kan kun stå i kolonne ' + (c1+1) + ' og ' + (c2+1) + ' i både række ' + (r1+1) + ' og ' + (r2+1) + '.',
                  'Derfor kan ' + num + ' fjernes fra resten af kolonne ' + (c1+1) + ' og ' + (c2+1) + '.',
                  'Nu kan cellen (' + (single.r+1) + ',' + (single.c+1) + ') kun indeholde ' + single.val + '!',
                ],
              },
            };
          }
        }
      }

      // Check columns: num in exactly 2 rows in 2 different cols
      const colPairs = [];
      for (let c = 0; c < 9; c++) {
        const rows = [];
        for (let r = 0; r < 9; r++)
          if (cands[r][c].has(num)) rows.push(r);
        if (rows.length === 2) colPairs.push({ c, rows });
      }

      for (let i = 0; i < colPairs.length; i++) {
        for (let j = i + 1; j < colPairs.length; j++) {
          if (colPairs[i].rows[0] !== colPairs[j].rows[0] ||
              colPairs[i].rows[1] !== colPairs[j].rows[1]) continue;

          const c1 = colPairs[i].c, c2 = colPairs[j].c;
          const r1 = colPairs[i].rows[0], r2 = colPairs[i].rows[1];

          const copy = copyCands(cands);
          let eliminated = false;
          for (let c = 0; c < 9; c++) {
            if (c === c1 || c === c2) continue;
            if (copy[r1][c].delete(num)) eliminated = true;
            if (copy[r2][c].delete(num)) eliminated = true;
          }
          if (!eliminated) continue;

          const single = findRevealedCell(copy);
          if (single && single.val === solution[single.r][single.c]) {
            const highlights = [
              { r: r1, c: c1, type: 'eliminator' }, { r: r2, c: c1, type: 'eliminator' },
              { r: r1, c: c2, type: 'eliminator' }, { r: r2, c: c2, type: 'eliminator' },
              { r: single.r, c: single.c, type: 'target' },
            ];
            return {
              type: 'x_wing', cell: { r: single.r, c: single.c }, value: single.val, highlights,
              technique: {
                name: 'X-Wing', icon: '\u2716\uFE0F',
                steps: [
                  num + ' kan kun stå i række ' + (r1+1) + ' og ' + (r2+1) + ' i både kolonne ' + (c1+1) + ' og ' + (c2+1) + '.',
                  'Derfor kan ' + num + ' fjernes fra resten af række ' + (r1+1) + ' og ' + (r2+1) + '.',
                  'Nu kan cellen (' + (single.r+1) + ',' + (single.c+1) + ') kun indeholde ' + single.val + '!',
                ],
              },
            };
          }
        }
      }
    }
    return null;
  }

  function findHiddenTripleHint() {
    const cands = getAllCandidates();

    function checkUnit(cells, unitName) {
      if (cells.length < 3) return null;
      for (let n1 = 1; n1 <= 7; n1++)
        for (let n2 = n1 + 1; n2 <= 8; n2++)
          for (let n3 = n2 + 1; n3 <= 9; n3++) {
            const nums = [n1, n2, n3];
            // Find cells that contain at least one of these numbers
            const containing = cells.filter(([r, c]) =>
              nums.some(n => cands[r][c].has(n)));
            if (containing.length !== 3) continue;
            // Each number must appear in at least one of the 3 cells
            if (!nums.every(n => containing.some(([r, c]) => cands[r][c].has(n)))) continue;
            // Only useful if at least one cell has candidates beyond the triple
            const hasExtra = containing.some(([r, c]) => {
              for (const v of cands[r][c]) if (!nums.includes(v)) return true;
              return false;
            });
            if (!hasExtra) continue;

            const copy = copyCands(cands);
            for (const [r, c] of containing) {
              for (const v of [...copy[r][c]])
                if (!nums.includes(v)) copy[r][c].delete(v);
            }

            const single = findRevealedCell(copy);
            if (single && single.val === solution[single.r][single.c]) {
              const highlights = containing.map(([r, c]) => ({ r, c, type: 'eliminator' }));
              highlights.push({ r: single.r, c: single.c, type: 'target' });
              return {
                type: 'hidden_triple', cell: { r: single.r, c: single.c }, value: single.val, highlights,
                technique: {
                  name: 'Skjult triple', icon: '\uD83D\uDD76\uFE0F',
                  steps: [
                    'I ' + unitName + ' kan ' + nums.join(', ') + ' kun stå i tre bestemte celler.',
                    'Alle andre kandidater fjernes fra disse celler.',
                    'Nu kan cellen (' + (single.r+1) + ',' + (single.c+1) + ') kun indeholde ' + single.val + '!',
                  ],
                },
              };
            }
          }
      return null;
    }

    for (let r = 0; r < 9; r++) {
      const cells = []; for (let c = 0; c < 9; c++) if (board[r][c] === 0) cells.push([r, c]);
      const result = checkUnit(cells, 'række ' + (r+1)); if (result) return result;
    }
    for (let c = 0; c < 9; c++) {
      const cells = []; for (let r = 0; r < 9; r++) if (board[r][c] === 0) cells.push([r, c]);
      const result = checkUnit(cells, 'kolonne ' + (c+1)); if (result) return result;
    }
    for (let br = 0; br < 9; br += 3)
      for (let bc = 0; bc < 9; bc += 3) {
        const cells = [];
        for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++)
          if (board[br+dr][bc+dc] === 0) cells.push([br+dr, bc+dc]);
        const result = checkUnit(cells, 'boks ' + (Math.floor(br/3)*3 + Math.floor(bc/3) + 1));
        if (result) return result;
      }
    return null;
  }

  function findSwordfishHint() {
    const cands = getAllCandidates();

    for (let num = 1; num <= 9; num++) {
      // Rows: find rows where num appears in 2-3 columns
      const rowData = [];
      for (let r = 0; r < 9; r++) {
        const cols = [];
        for (let c = 0; c < 9; c++) if (cands[r][c].has(num)) cols.push(c);
        if (cols.length >= 2 && cols.length <= 3) rowData.push({ r, cols });
      }

      for (let i = 0; i < rowData.length; i++)
        for (let j = i + 1; j < rowData.length; j++)
          for (let k = j + 1; k < rowData.length; k++) {
            const allCols = new Set([...rowData[i].cols, ...rowData[j].cols, ...rowData[k].cols]);
            if (allCols.size !== 3) continue;
            const targetCols = [...allCols];
            const rows = [rowData[i].r, rowData[j].r, rowData[k].r];

            const copy = copyCands(cands);
            let eliminated = false;
            for (const c of targetCols)
              for (let r = 0; r < 9; r++) {
                if (rows.includes(r)) continue;
                if (copy[r][c].delete(num)) eliminated = true;
              }
            if (!eliminated) continue;

            const single = findRevealedCell(copy);
            if (single && single.val === solution[single.r][single.c]) {
              const highlights = [{ r: single.r, c: single.c, type: 'target' }];
              for (const r of rows) for (const c of targetCols)
                if (cands[r][c].has(num)) highlights.push({ r, c, type: 'eliminator' });
              return {
                type: 'swordfish', cell: { r: single.r, c: single.c }, value: single.val, highlights,
                technique: {
                  name: 'Swordfish', icon: '\uD83D\uDC1F',
                  steps: [
                    num + ' danner et mønster over række ' + rows.map(r => r+1).join(', ') + ' og kolonne ' + targetCols.map(c => c+1).join(', ') + '.',
                    'Derfor kan ' + num + ' fjernes fra resten af disse kolonner.',
                    'Nu kan cellen (' + (single.r+1) + ',' + (single.c+1) + ') kun indeholde ' + single.val + '!',
                  ],
                },
              };
            }
          }

      // Columns version
      const colData = [];
      for (let c = 0; c < 9; c++) {
        const rows = [];
        for (let r = 0; r < 9; r++) if (cands[r][c].has(num)) rows.push(r);
        if (rows.length >= 2 && rows.length <= 3) colData.push({ c, rows });
      }

      for (let i = 0; i < colData.length; i++)
        for (let j = i + 1; j < colData.length; j++)
          for (let k = j + 1; k < colData.length; k++) {
            const allRows = new Set([...colData[i].rows, ...colData[j].rows, ...colData[k].rows]);
            if (allRows.size !== 3) continue;
            const targetRows = [...allRows];
            const cols = [colData[i].c, colData[j].c, colData[k].c];

            const copy = copyCands(cands);
            let eliminated = false;
            for (const r of targetRows)
              for (let c = 0; c < 9; c++) {
                if (cols.includes(c)) continue;
                if (copy[r][c].delete(num)) eliminated = true;
              }
            if (!eliminated) continue;

            const single = findRevealedCell(copy);
            if (single && single.val === solution[single.r][single.c]) {
              const highlights = [{ r: single.r, c: single.c, type: 'target' }];
              for (const c of cols) for (const r of targetRows)
                if (cands[r][c].has(num)) highlights.push({ r, c, type: 'eliminator' });
              return {
                type: 'swordfish', cell: { r: single.r, c: single.c }, value: single.val, highlights,
                technique: {
                  name: 'Swordfish', icon: '\uD83D\uDC1F',
                  steps: [
                    num + ' danner et mønster over kolonne ' + cols.map(c => c+1).join(', ') + ' og række ' + targetRows.map(r => r+1).join(', ') + '.',
                    'Derfor kan ' + num + ' fjernes fra resten af disse rækker.',
                    'Nu kan cellen (' + (single.r+1) + ',' + (single.c+1) + ') kun indeholde ' + single.val + '!',
                  ],
                },
              };
            }
          }
    }
    return null;
  }

  function findXYWingHint() {
    const cands = getAllCandidates();

    // Find all cells with exactly 2 candidates
    const bivalue = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (cands[r][c].size === 2) bivalue.push({ r, c, vals: [...cands[r][c]] });

    function sees(a, b) {
      return a.r === b.r || a.c === b.c ||
        (Math.floor(a.r/3) === Math.floor(b.r/3) && Math.floor(a.c/3) === Math.floor(b.c/3));
    }

    for (const pivot of bivalue) {
      const [x, y] = pivot.vals;
      // Find wing1 that shares one value with pivot and has a different second value
      for (const w1 of bivalue) {
        if (w1.r === pivot.r && w1.c === pivot.c) continue;
        if (!sees(pivot, w1)) continue;
        let shared1, other1;
        if (w1.vals.includes(x) && !w1.vals.includes(y)) {
          shared1 = x; other1 = w1.vals.find(v => v !== x);
        } else if (w1.vals.includes(y) && !w1.vals.includes(x)) {
          shared1 = y; other1 = w1.vals.find(v => v !== y);
        } else continue;

        const shared2 = (shared1 === x) ? y : x;

        // Find wing2 that shares the other value with pivot and has other1 as second value
        for (const w2 of bivalue) {
          if (w2.r === w1.r && w2.c === w1.c) continue;
          if (w2.r === pivot.r && w2.c === pivot.c) continue;
          if (!sees(pivot, w2)) continue;
          if (!w2.vals.includes(shared2) || !w2.vals.includes(other1)) continue;

          // XY-Wing found! Eliminate other1 from cells that see both wings
          const copy = copyCands(cands);
          let eliminated = false;
          for (let r = 0; r < 9; r++)
            for (let c = 0; c < 9; c++) {
              if (r === pivot.r && c === pivot.c) continue;
              if (r === w1.r && c === w1.c) continue;
              if (r === w2.r && c === w2.c) continue;
              if (!sees({ r, c }, w1) || !sees({ r, c }, w2)) continue;
              if (copy[r][c].delete(other1)) eliminated = true;
            }
          if (!eliminated) continue;

          const single = findRevealedCell(copy);
          if (single && single.val === solution[single.r][single.c]) {
            const highlights = [
              { r: pivot.r, c: pivot.c, type: 'eliminator' },
              { r: w1.r, c: w1.c, type: 'eliminator' },
              { r: w2.r, c: w2.c, type: 'eliminator' },
              { r: single.r, c: single.c, type: 'target' },
            ];
            return {
              type: 'xy_wing', cell: { r: single.r, c: single.c }, value: single.val, highlights,
              technique: {
                name: 'XY-Wing', icon: '\uD83E\uDEB6',
                steps: [
                  'Cellen (' + (pivot.r+1) + ',' + (pivot.c+1) + ') har ' + x + ' og ' + y + '.',
                  'Den ser to "vinger" med ' + shared1 + '/' + other1 + ' og ' + shared2 + '/' + other1 + '.',
                  other1 + ' kan fjernes fra celler der ser begge vinger. Nu kan (' + (single.r+1) + ',' + (single.c+1) + ') kun være ' + single.val + '!',
                ],
              },
            };
          }
        }
      }
    }
    return null;
  }

  function findNakedQuadHint() {
    const cands = getAllCandidates();

    function checkUnit(cells, unitName) {
      const small = cells.filter(([r, c]) => cands[r][c].size >= 2 && cands[r][c].size <= 4);
      if (small.length < 4) return null;

      for (let i = 0; i < small.length; i++)
        for (let j = i+1; j < small.length; j++)
          for (let k = j+1; k < small.length; k++)
            for (let l = k+1; l < small.length; l++) {
              const quad = [small[i], small[j], small[k], small[l]];
              const union = new Set();
              for (const [r, c] of quad) for (const v of cands[r][c]) union.add(v);
              if (union.size !== 4) continue;

              const copy = copyCands(cands);
              let eliminated = false;
              const quadVals = [...union];
              for (const [r, c] of cells) {
                if (quad.some(q => q[0] === r && q[1] === c)) continue;
                for (const v of quadVals)
                  if (copy[r][c].delete(v)) eliminated = true;
              }
              if (!eliminated) continue;

              const single = findRevealedCell(copy);
              if (single && single.val === solution[single.r][single.c]) {
                const highlights = quad.map(([r, c]) => ({ r, c, type: 'eliminator' }));
                highlights.push({ r: single.r, c: single.c, type: 'target' });
                return {
                  type: 'naked_quad', cell: { r: single.r, c: single.c }, value: single.val, highlights,
                  technique: {
                    name: 'Nøgen firer', icon: '4\uFE0F\u20E3',
                    steps: [
                      'Fire celler i ' + unitName + ' kan tilsammen kun indeholde ' + quadVals.join(', ') + '.',
                      'Disse tal fjernes fra de andre celler.',
                      'Nu kan cellen (' + (single.r+1) + ',' + (single.c+1) + ') kun indeholde ' + single.val + '!',
                    ],
                  },
                };
              }
            }
      return null;
    }

    for (let r = 0; r < 9; r++) {
      const cells = []; for (let c = 0; c < 9; c++) if (board[r][c] === 0) cells.push([r, c]);
      const result = checkUnit(cells, 'række ' + (r+1)); if (result) return result;
    }
    for (let c = 0; c < 9; c++) {
      const cells = []; for (let r = 0; r < 9; r++) if (board[r][c] === 0) cells.push([r, c]);
      const result = checkUnit(cells, 'kolonne ' + (c+1)); if (result) return result;
    }
    for (let br = 0; br < 9; br += 3)
      for (let bc = 0; bc < 9; bc += 3) {
        const cells = [];
        for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++)
          if (board[br+dr][bc+dc] === 0) cells.push([br+dr, bc+dc]);
        const result = checkUnit(cells, 'boks ' + (Math.floor(br/3)*3 + Math.floor(bc/3) + 1));
        if (result) return result;
      }
    return null;
  }

  function findSkyscraperHint() {
    const cands = getAllCandidates();

    function sees(a, b) {
      return a.r === b.r || a.c === b.c ||
        (Math.floor(a.r/3) === Math.floor(b.r/3) && Math.floor(a.c/3) === Math.floor(b.c/3));
    }

    for (let num = 1; num <= 9; num++) {
      // Find rows with exactly 2 positions for num
      const rowPairs = [];
      for (let r = 0; r < 9; r++) {
        const cols = [];
        for (let c = 0; c < 9; c++) if (cands[r][c].has(num)) cols.push(c);
        if (cols.length === 2) rowPairs.push({ r, c1: cols[0], c2: cols[1] });
      }

      for (let i = 0; i < rowPairs.length; i++)
        for (let j = i+1; j < rowPairs.length; j++) {
          const a = rowPairs[i], b = rowPairs[j];
          // One column must match (the "base"), the other differs (the "tops")
          let baseCol, topA, topB;
          if (a.c1 === b.c1) { baseCol = a.c1; topA = { r: a.r, c: a.c2 }; topB = { r: b.r, c: b.c2 }; }
          else if (a.c1 === b.c2) { baseCol = a.c1; topA = { r: a.r, c: a.c2 }; topB = { r: b.r, c: b.c1 }; }
          else if (a.c2 === b.c1) { baseCol = a.c2; topA = { r: a.r, c: a.c1 }; topB = { r: b.r, c: b.c1 }; }
          else if (a.c2 === b.c2) { baseCol = a.c2; topA = { r: a.r, c: a.c1 }; topB = { r: b.r, c: b.c2 }; }
          else continue;

          if (topA.c === topB.c) continue; // that would be X-Wing

          const copy = copyCands(cands);
          let eliminated = false;
          for (let r = 0; r < 9; r++)
            for (let c = 0; c < 9; c++) {
              if ((r === a.r && (c === a.c1 || c === a.c2)) || (r === b.r && (c === b.c1 || c === b.c2))) continue;
              if (!sees({ r, c }, topA) || !sees({ r, c }, topB)) continue;
              if (copy[r][c].delete(num)) eliminated = true;
            }
          if (!eliminated) continue;

          const single = findRevealedCell(copy);
          if (single && single.val === solution[single.r][single.c]) {
            const highlights = [
              { r: a.r, c: a.c1, type: 'eliminator' }, { r: a.r, c: a.c2, type: 'eliminator' },
              { r: b.r, c: b.c1, type: 'eliminator' }, { r: b.r, c: b.c2, type: 'eliminator' },
              { r: single.r, c: single.c, type: 'target' },
            ];
            return {
              type: 'skyscraper', cell: { r: single.r, c: single.c }, value: single.val, highlights,
              technique: {
                name: 'Skyscraper', icon: '\uD83C\uDFD9\uFE0F',
                steps: [
                  num + ' kan kun stå 2 steder i både række ' + (a.r+1) + ' og ' + (b.r+1) + '.',
                  'De deler kolonne ' + (baseCol+1) + ' som "base" — toppene er kolonne ' + (topA.c+1) + ' og ' + (topB.c+1) + '.',
                  num + ' fjernes fra celler der ser begge toppe. Nu kan (' + (single.r+1) + ',' + (single.c+1) + ') kun være ' + single.val + '!',
                ],
              },
            };
          }
        }

      // Column-based skyscrapers
      const colPairs = [];
      for (let c = 0; c < 9; c++) {
        const rows = [];
        for (let r = 0; r < 9; r++) if (cands[r][c].has(num)) rows.push(r);
        if (rows.length === 2) colPairs.push({ c, r1: rows[0], r2: rows[1] });
      }

      for (let i = 0; i < colPairs.length; i++)
        for (let j = i+1; j < colPairs.length; j++) {
          const a = colPairs[i], b = colPairs[j];
          let baseRow, topA, topB;
          if (a.r1 === b.r1) { baseRow = a.r1; topA = { r: a.r2, c: a.c }; topB = { r: b.r2, c: b.c }; }
          else if (a.r1 === b.r2) { baseRow = a.r1; topA = { r: a.r2, c: a.c }; topB = { r: b.r1, c: b.c }; }
          else if (a.r2 === b.r1) { baseRow = a.r2; topA = { r: a.r1, c: a.c }; topB = { r: b.r1, c: b.c }; }
          else if (a.r2 === b.r2) { baseRow = a.r2; topA = { r: a.r1, c: a.c }; topB = { r: b.r1, c: b.c }; }
          else continue;

          if (topA.r === topB.r) continue;

          const copy = copyCands(cands);
          let eliminated = false;
          for (let r = 0; r < 9; r++)
            for (let c = 0; c < 9; c++) {
              if ((c === a.c && (r === a.r1 || r === a.r2)) || (c === b.c && (r === b.r1 || r === b.r2))) continue;
              if (!sees({ r, c }, topA) || !sees({ r, c }, topB)) continue;
              if (copy[r][c].delete(num)) eliminated = true;
            }
          if (!eliminated) continue;

          const single = findRevealedCell(copy);
          if (single && single.val === solution[single.r][single.c]) {
            const highlights = [
              { r: a.r1, c: a.c, type: 'eliminator' }, { r: a.r2, c: a.c, type: 'eliminator' },
              { r: b.r1, c: b.c, type: 'eliminator' }, { r: b.r2, c: b.c, type: 'eliminator' },
              { r: single.r, c: single.c, type: 'target' },
            ];
            return {
              type: 'skyscraper', cell: { r: single.r, c: single.c }, value: single.val, highlights,
              technique: {
                name: 'Skyscraper', icon: '\uD83C\uDFD9\uFE0F',
                steps: [
                  num + ' kan kun stå 2 steder i både kolonne ' + (a.c+1) + ' og ' + (b.c+1) + '.',
                  'De deler række ' + (baseRow+1) + ' som "base" — toppene er række ' + (topA.r+1) + ' og ' + (topB.r+1) + '.',
                  num + ' fjernes fra celler der ser begge toppe. Nu kan (' + (single.r+1) + ',' + (single.c+1) + ') kun være ' + single.val + '!',
                ],
              },
            };
          }
        }
    }
    return null;
  }

  function findSimpleColoringHint() {
    const cands = getAllCandidates();

    function sees(a, b) {
      return a[0] === b[0] || a[1] === b[1] ||
        (Math.floor(a[0]/3) === Math.floor(b[0]/3) && Math.floor(a[1]/3) === Math.floor(b[1]/3));
    }

    for (let num = 1; num <= 9; num++) {
      // Build conjugate pairs: cells in a unit where num appears exactly twice
      const links = new Map(); // "r,c" -> Set of "r,c" it's linked to
      function key(r, c) { return r + ',' + c; }

      // Row conjugates
      for (let r = 0; r < 9; r++) {
        const cols = [];
        for (let c = 0; c < 9; c++) if (cands[r][c].has(num)) cols.push(c);
        if (cols.length === 2) {
          const a = key(r, cols[0]), b = key(r, cols[1]);
          if (!links.has(a)) links.set(a, new Set());
          if (!links.has(b)) links.set(b, new Set());
          links.get(a).add(b);
          links.get(b).add(a);
        }
      }
      // Column conjugates
      for (let c = 0; c < 9; c++) {
        const rows = [];
        for (let r = 0; r < 9; r++) if (cands[r][c].has(num)) rows.push(r);
        if (rows.length === 2) {
          const a = key(rows[0], c), b = key(rows[1], c);
          if (!links.has(a)) links.set(a, new Set());
          if (!links.has(b)) links.set(b, new Set());
          links.get(a).add(b);
          links.get(b).add(a);
        }
      }
      // Box conjugates
      for (let br = 0; br < 9; br += 3)
        for (let bc = 0; bc < 9; bc += 3) {
          const pos = [];
          for (let dr = 0; dr < 3; dr++)
            for (let dc = 0; dc < 3; dc++)
              if (cands[br+dr][bc+dc].has(num)) pos.push([br+dr, bc+dc]);
          if (pos.length === 2) {
            const a = key(pos[0][0], pos[0][1]), b = key(pos[1][0], pos[1][1]);
            if (!links.has(a)) links.set(a, new Set());
            if (!links.has(b)) links.set(b, new Set());
            links.get(a).add(b);
            links.get(b).add(a);
          }
        }

      if (links.size < 4) continue;

      // BFS to color the chain
      const visited = new Map();
      for (const startKey of links.keys()) {
        if (visited.has(startKey)) continue;
        const queue = [[startKey, 0]];
        const chain = new Map();
        let conflict = -1;

        while (queue.length > 0) {
          const [ck, color] = queue.shift();
          if (chain.has(ck)) {
            if (chain.get(ck) !== color) conflict = color;
            continue;
          }
          chain.set(ck, color);
          const neighbors = links.get(ck);
          if (neighbors) for (const nk of neighbors) {
            if (!chain.has(nk)) queue.push([nk, 1 - color]);
          }
        }

        if (chain.size < 4) continue;

        // Rule 1: Two same-color cells see each other → that color is false
        const colors = [[], []];
        for (const [ck, color] of chain) {
          const [r, c] = ck.split(',').map(Number);
          colors[color].push([r, c]);
        }

        for (let col = 0; col < 2; col++) {
          const group = colors[col];
          let sameColorConflict = false;
          for (let i = 0; i < group.length && !sameColorConflict; i++)
            for (let j = i+1; j < group.length && !sameColorConflict; j++)
              if (sees(group[i], group[j])) sameColorConflict = true;

          if (!sameColorConflict) continue;

          // This color is false — eliminate num from all cells in this color
          const copy = copyCands(cands);
          for (const [r, c] of group) copy[r][c].delete(num);

          const single = findRevealedCell(copy);
          if (single && single.val === solution[single.r][single.c]) {
            const highlights = group.map(([r, c]) => ({ r, c, type: 'eliminator' }));
            highlights.push({ r: single.r, c: single.c, type: 'target' });
            return {
              type: 'simple_coloring', cell: { r: single.r, c: single.c }, value: single.val, highlights,
              technique: {
                name: 'Simpel farvning', icon: '\uD83C\uDFA8',
                steps: [
                  num + ' danner en kæde af "enten-eller" forbindelser.',
                  'To celler med samme farve kan se hinanden — den farve er falsk.',
                  num + ' fjernes fra de forkerte celler. Nu kan (' + (single.r+1) + ',' + (single.c+1) + ') kun være ' + single.val + '!',
                ],
              },
            };
          }
        }

        // Rule 2: A cell sees both colors → eliminate num from it
        const copy = copyCands(cands);
        let eliminated = false;
        for (let r = 0; r < 9; r++)
          for (let c = 0; c < 9; c++) {
            if (chain.has(key(r, c))) continue;
            if (!cands[r][c].has(num)) continue;
            const seesColor0 = colors[0].some(p => sees([r, c], p));
            const seesColor1 = colors[1].some(p => sees([r, c], p));
            if (seesColor0 && seesColor1) {
              if (copy[r][c].delete(num)) eliminated = true;
            }
          }

        if (!eliminated) continue;
        const single = findRevealedCell(copy);
        if (single && single.val === solution[single.r][single.c]) {
          const allChain = [...chain.keys()].map(k => { const [r, c] = k.split(',').map(Number); return { r, c }; });
          const highlights = allChain.map(p => ({ ...p, type: 'eliminator' }));
          highlights.push({ r: single.r, c: single.c, type: 'target' });
          return {
            type: 'simple_coloring', cell: { r: single.r, c: single.c }, value: single.val, highlights,
            technique: {
              name: 'Simpel farvning', icon: '\uD83C\uDFA8',
              steps: [
                num + ' danner en kæde af "enten-eller" forbindelser.',
                'En celle kan se begge farver — så ' + num + ' kan ikke stå der.',
                'Nu kan cellen (' + (single.r+1) + ',' + (single.c+1) + ') kun indeholde ' + single.val + '!',
              ],
            },
          };
        }
      }
    }
    return null;
  }

  function findUniqueRectangleHint() {
    const cands = getAllCandidates();
    // Type 1: 3 corners are bivalue with same 2 candidates, 4th corner has those 2 + extras
    for (let r1 = 0; r1 < 9; r1++)
      for (let r2 = r1 + 1; r2 < 9; r2++)
        for (let c1 = 0; c1 < 9; c1++)
          for (let c2 = c1 + 1; c2 < 9; c2++) {
            // Must span exactly 2 boxes
            const b1 = Math.floor(r1/3)*3 + Math.floor(c1/3);
            const b2 = Math.floor(r1/3)*3 + Math.floor(c2/3);
            const b3 = Math.floor(r2/3)*3 + Math.floor(c1/3);
            const b4 = Math.floor(r2/3)*3 + Math.floor(c2/3);
            const boxes = new Set([b1, b2, b3, b4]);
            if (boxes.size !== 2) continue;

            const corners = [[r1,c1],[r1,c2],[r2,c1],[r2,c2]];
            if (corners.some(([r,c]) => board[r][c] !== 0)) continue;

            // Find which corners are bivalue with same candidates
            const bivalueCorners = corners.filter(([r,c]) => cands[r][c].size === 2);
            if (bivalueCorners.length !== 3) continue;

            const refVals = [...cands[bivalueCorners[0][0]][bivalueCorners[0][1]]];
            if (!bivalueCorners.every(([r,c]) => {
              const s = cands[r][c];
              return s.size === 2 && s.has(refVals[0]) && s.has(refVals[1]);
            })) continue;

            // Find the non-bivalue corner
            const extraCorner = corners.find(([r,c]) => cands[r][c].size > 2);
            if (!extraCorner) continue;
            const extraCands = cands[extraCorner[0]][extraCorner[1]];
            if (!extraCands.has(refVals[0]) || !extraCands.has(refVals[1])) continue;

            // The extra candidates (not refVals) must be placed to break the deadly pattern
            const extras = [...extraCands].filter(v => !refVals.includes(v));
            if (extras.length !== 1) continue;

            const val = extras[0];
            if (val !== solution[extraCorner[0]][extraCorner[1]]) continue;

            const highlights = corners.map(([r,c]) => ({
              r, c, type: (r === extraCorner[0] && c === extraCorner[1]) ? 'target' : 'eliminator',
            }));
            return {
              type: 'unique_rectangle', cell: { r: extraCorner[0], c: extraCorner[1] }, value: val, highlights,
              technique: {
                name: 'Unik rektangel', icon: '\u25AD',
                steps: [
                  'Fire celler danner et rektangel med kandidaterne ' + refVals[0] + ' og ' + refVals[1] + '.',
                  'Tre hjørner har kun disse to tal. Det ville give to løsninger!',
                  'Det fjerde hjørne MÅ bruge sit ekstra tal ' + val + ' for at bryde mønstret!',
                ],
              },
            };
          }
    return null;
  }

  function findTwoStringKiteHint() {
    const cands = getAllCandidates();

    function sees(a, b) {
      return a[0] === b[0] || a[1] === b[1] ||
        (Math.floor(a[0]/3) === Math.floor(b[0]/3) && Math.floor(a[1]/3) === Math.floor(b[1]/3));
    }

    for (let num = 1; num <= 9; num++) {
      // Find rows with exactly 2 positions
      const rowPairs = [];
      for (let r = 0; r < 9; r++) {
        const cols = [];
        for (let c = 0; c < 9; c++) if (cands[r][c].has(num)) cols.push(c);
        if (cols.length === 2) rowPairs.push({ r, cols });
      }
      // Find cols with exactly 2 positions
      const colPairs = [];
      for (let c = 0; c < 9; c++) {
        const rows = [];
        for (let r = 0; r < 9; r++) if (cands[r][c].has(num)) rows.push(r);
        if (rows.length === 2) colPairs.push({ c, rows });
      }

      for (const rp of rowPairs)
        for (const cp of colPairs) {
          // One end of the row and one end of the col must share a box
          for (let ri = 0; ri < 2; ri++)
            for (let ci = 0; ci < 2; ci++) {
              const shared = [rp.r, rp.cols[ri]];
              const colEnd = [cp.rows[ci], cp.c];
              if (shared[0] === colEnd[0] && shared[1] === colEnd[1]) continue;
              if (Math.floor(shared[0]/3) !== Math.floor(colEnd[0]/3) ||
                  Math.floor(shared[1]/3) !== Math.floor(colEnd[1]/3)) continue;

              // The other ends
              const rowEnd = [rp.r, rp.cols[1 - ri]];
              const colOther = [cp.rows[1 - ci], cp.c];

              // Eliminate num from cells that see both endpoints
              const copy = copyCands(cands);
              let eliminated = false;
              for (let r = 0; r < 9; r++)
                for (let c = 0; c < 9; c++) {
                  if ((r === rowEnd[0] && c === rowEnd[1]) || (r === colOther[0] && c === colOther[1])) continue;
                  if ((r === shared[0] && c === shared[1]) || (r === colEnd[0] && c === colEnd[1])) continue;
                  if (sees([r, c], rowEnd) && sees([r, c], colOther))
                    if (copy[r][c].delete(num)) eliminated = true;
                }
              if (!eliminated) continue;

              const single = findRevealedCell(copy);
              if (single && single.val === solution[single.r][single.c]) {
                const highlights = [
                  { r: rp.r, c: rp.cols[0], type: 'eliminator' },
                  { r: rp.r, c: rp.cols[1], type: 'eliminator' },
                  { r: cp.rows[0], c: cp.c, type: 'eliminator' },
                  { r: cp.rows[1], c: cp.c, type: 'eliminator' },
                  { r: single.r, c: single.c, type: 'target' },
                ];
                return {
                  type: 'two_string_kite', cell: { r: single.r, c: single.c }, value: single.val, highlights,
                  technique: {
                    name: '2-strengs drage', icon: '\uD83E\uDE81',
                    steps: [
                      num + ' har præcis 2 pladser i række ' + (rp.r+1) + ' og kolonne ' + (cp.c+1) + '.',
                      'En position fra hver deler boks — de er forbundet.',
                      num + ' fjernes fra cellen der ser begge ender. Nu kan (' + (single.r+1) + ',' + (single.c+1) + ') kun være ' + single.val + '!',
                    ],
                  },
                };
              }
            }
        }
    }
    return null;
  }

  function findWWingHint() {
    const cands = getAllCandidates();

    function sees(a, b) {
      return a[0] === b[0] || a[1] === b[1] ||
        (Math.floor(a[0]/3) === Math.floor(b[0]/3) && Math.floor(a[1]/3) === Math.floor(b[1]/3));
    }

    // Find all bivalue cells
    const bivalue = [];
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (cands[r][c].size === 2) bivalue.push([r, c, [...cands[r][c]]]);

    for (let i = 0; i < bivalue.length; i++)
      for (let j = i + 1; j < bivalue.length; j++) {
        const [r1, c1, v1] = bivalue[i];
        const [r2, c2, v2] = bivalue[j];
        if (v1[0] !== v2[0] || v1[1] !== v2[1]) continue; // must be identical
        if (sees([r1, c1], [r2, c2])) continue; // must NOT share a unit

        // Try each candidate as the strong link value
        for (let vi = 0; vi < 2; vi++) {
          const linkVal = v1[vi];
          const elimVal = v1[1 - vi];

          // Find a strong link on linkVal that connects to both cells
          // (a unit where linkVal appears exactly twice, with one end seeing cell1 and other seeing cell2)
          // Check rows
          for (let r = 0; r < 9; r++) {
            const cols = [];
            for (let c = 0; c < 9; c++) if (cands[r][c].has(linkVal)) cols.push(c);
            if (cols.length !== 2) continue;
            const endA = [r, cols[0]], endB = [r, cols[1]];
            if ((sees(endA, [r1, c1]) && sees(endB, [r2, c2])) ||
                (sees(endA, [r2, c2]) && sees(endB, [r1, c1]))) {
              const copy = copyCands(cands);
              let eliminated = false;
              for (let rr = 0; rr < 9; rr++)
                for (let cc = 0; cc < 9; cc++) {
                  if (rr === r1 && cc === c1) continue;
                  if (rr === r2 && cc === c2) continue;
                  if (sees([rr, cc], [r1, c1]) && sees([rr, cc], [r2, c2]))
                    if (copy[rr][cc].delete(elimVal)) eliminated = true;
                }
              if (!eliminated) continue;
              const single = findRevealedCell(copy);
              if (single && single.val === solution[single.r][single.c]) {
                return {
                  type: 'w_wing', cell: { r: single.r, c: single.c }, value: single.val,
                  highlights: [
                    { r: r1, c: c1, type: 'eliminator' }, { r: r2, c: c2, type: 'eliminator' },
                    { r, c: cols[0], type: 'unit' }, { r, c: cols[1], type: 'unit' },
                    { r: single.r, c: single.c, type: 'target' },
                  ],
                  technique: {
                    name: 'W-Wing', icon: 'W',
                    steps: [
                      'Cellerne (' + (r1+1) + ',' + (c1+1) + ') og (' + (r2+1) + ',' + (c2+1) + ') har begge ' + v1.join(' og ') + '.',
                      'De er forbundet via et stærkt link på ' + linkVal + ' i række ' + (r+1) + '.',
                      elimVal + ' fjernes fra celler der ser dem begge. Nu kan (' + (single.r+1) + ',' + (single.c+1) + ') kun være ' + single.val + '!',
                    ],
                  },
                };
              }
            }
          }
          // Check columns for strong link
          for (let c = 0; c < 9; c++) {
            const rows = [];
            for (let r = 0; r < 9; r++) if (cands[r][c].has(linkVal)) rows.push(r);
            if (rows.length !== 2) continue;
            const endA = [rows[0], c], endB = [rows[1], c];
            if ((sees(endA, [r1, c1]) && sees(endB, [r2, c2])) ||
                (sees(endA, [r2, c2]) && sees(endB, [r1, c1]))) {
              const copy = copyCands(cands);
              let eliminated = false;
              for (let rr = 0; rr < 9; rr++)
                for (let cc = 0; cc < 9; cc++) {
                  if (rr === r1 && cc === c1) continue;
                  if (rr === r2 && cc === c2) continue;
                  if (sees([rr, cc], [r1, c1]) && sees([rr, cc], [r2, c2]))
                    if (copy[rr][cc].delete(elimVal)) eliminated = true;
                }
              if (!eliminated) continue;
              const single = findRevealedCell(copy);
              if (single && single.val === solution[single.r][single.c]) {
                return {
                  type: 'w_wing', cell: { r: single.r, c: single.c }, value: single.val,
                  highlights: [
                    { r: r1, c: c1, type: 'eliminator' }, { r: r2, c: c2, type: 'eliminator' },
                    { r: rows[0], c, type: 'unit' }, { r: rows[1], c, type: 'unit' },
                    { r: single.r, c: single.c, type: 'target' },
                  ],
                  technique: {
                    name: 'W-Wing', icon: 'W',
                    steps: [
                      'Cellerne (' + (r1+1) + ',' + (c1+1) + ') og (' + (r2+1) + ',' + (c2+1) + ') har begge ' + v1.join(' og ') + '.',
                      'De er forbundet via et stærkt link på ' + linkVal + ' i kolonne ' + (c+1) + '.',
                      elimVal + ' fjernes fra celler der ser dem begge. Nu kan (' + (single.r+1) + ',' + (single.c+1) + ') kun være ' + single.val + '!',
                    ],
                  },
                };
              }
            }
          }
        }
      }
    return null;
  }

  function findXYZWingHint() {
    const cands = getAllCandidates();

    function sees(a, b) {
      return a[0] === b[0] || a[1] === b[1] ||
        (Math.floor(a[0]/3) === Math.floor(b[0]/3) && Math.floor(a[1]/3) === Math.floor(b[1]/3));
    }

    // Pivot has 3 candidates (XYZ), pincers have 2 each (XZ, YZ)
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) {
        if (cands[r][c].size !== 3) continue;
        const xyz = [...cands[r][c]];

        // Find pairs of pincers
        for (let pi = 0; pi < 3; pi++) {
          const z = xyz[pi]; // the common candidate
          const x = xyz[(pi+1) % 3], y = xyz[(pi+2) % 3];

          // Find pincer1 with {x, z}
          for (let r1 = 0; r1 < 9; r1++)
            for (let c1 = 0; c1 < 9; c1++) {
              if (r1 === r && c1 === c) continue;
              if (!sees([r, c], [r1, c1])) continue;
              if (cands[r1][c1].size !== 2 || !cands[r1][c1].has(x) || !cands[r1][c1].has(z)) continue;

              // Find pincer2 with {y, z}
              for (let r2 = 0; r2 < 9; r2++)
                for (let c2 = 0; c2 < 9; c2++) {
                  if ((r2 === r && c2 === c) || (r2 === r1 && c2 === c1)) continue;
                  if (!sees([r, c], [r2, c2])) continue;
                  if (cands[r2][c2].size !== 2 || !cands[r2][c2].has(y) || !cands[r2][c2].has(z)) continue;

                  // Eliminate z from cells seeing all three
                  const copy = copyCands(cands);
                  let eliminated = false;
                  for (let rr = 0; rr < 9; rr++)
                    for (let cc = 0; cc < 9; cc++) {
                      if ((rr === r && cc === c) || (rr === r1 && cc === c1) || (rr === r2 && cc === c2)) continue;
                      if (sees([rr, cc], [r, c]) && sees([rr, cc], [r1, c1]) && sees([rr, cc], [r2, c2]))
                        if (copy[rr][cc].delete(z)) eliminated = true;
                    }
                  if (!eliminated) continue;

                  const single = findRevealedCell(copy);
                  if (single && single.val === solution[single.r][single.c]) {
                    return {
                      type: 'xyz_wing', cell: { r: single.r, c: single.c }, value: single.val,
                      highlights: [
                        { r, c, type: 'eliminator' }, { r: r1, c: c1, type: 'eliminator' },
                        { r: r2, c: c2, type: 'eliminator' }, { r: single.r, c: single.c, type: 'target' },
                      ],
                      technique: {
                        name: 'XYZ-Wing', icon: '\uD83E\uDEB6',
                        steps: [
                          'Pivot (' + (r+1) + ',' + (c+1) + ') har ' + xyz.join(', ') + '.',
                          'Vinger har ' + x + ',' + z + ' og ' + y + ',' + z + '. Fælles tal er ' + z + '.',
                          z + ' fjernes fra celler der ser alle tre. Nu kan (' + (single.r+1) + ',' + (single.c+1) + ') kun være ' + single.val + '!',
                        ],
                      },
                    };
                  }
                }
            }
        }
      }
    return null;
  }

  function findBugPlusOneHint() {
    const cands = getAllCandidates();
    // Check if all unsolved cells except one have exactly 2 candidates
    let nonBivalue = null;
    let count = 0;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== 0) continue;
        if (cands[r][c].size === 2) continue;
        if (cands[r][c].size > 2) {
          count++;
          nonBivalue = { r, c };
        } else return null; // size 0 or 1, not a BUG state
      }
    if (count !== 1 || !nonBivalue) return null;

    // The extra candidate (appearing 3 times in a unit) must be placed
    const { r, c } = nonBivalue;
    const cellCands = [...cands[r][c]];
    for (const val of cellCands) {
      // Count how many times val appears in this cell's row, col, and box
      let rowCount = 0, colCount = 0, boxCount = 0;
      const br = Math.floor(r/3)*3, bc = Math.floor(c/3)*3;
      for (let i = 0; i < 9; i++) {
        if (cands[r][i].has(val)) rowCount++;
        if (cands[i][c].has(val)) colCount++;
      }
      for (let dr = 0; dr < 3; dr++)
        for (let dc = 0; dc < 3; dc++)
          if (cands[br+dr][bc+dc].has(val)) boxCount++;

      // In a BUG, each candidate appears exactly twice in each unit.
      // The extra candidate appears 3 times in at least one unit.
      if (rowCount === 3 || colCount === 3 || boxCount === 3) {
        if (val === solution[r][c]) {
          return {
            type: 'bug_plus_one', cell: { r, c }, value: val,
            highlights: [{ r, c, type: 'target' }],
            technique: {
              name: 'BUG+1', icon: '\uD83D\uDC1B',
              steps: [
                'Alle uløste celler har præcis 2 kandidater — undtagen denne.',
                'Uden den ekstra kandidat ville puzzlet have flere løsninger.',
                'Tallet ' + val + ' MÅ placeres her for at sikre én unik løsning!',
              ],
            },
          };
        }
      }
    }
    return null;
  }

  function findFallback() {
    // Find the empty cell with fewest candidates — easiest to reason about
    let bestR = -1, bestC = -1, bestSize = 10;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board[r][c] === 0) {
          const size = getCandidates(r, c).size;
          if (size > 0 && size < bestSize) { bestSize = size; bestR = r; bestC = c; }
        }
    if (bestR === -1) return null;
    const r = bestR, c = bestC;
    const cands = getCandidates(r, c);
    const val = solution[r][c];
    const candList = [...cands].sort((a, b) => a - b).join(' eller ');
    const steps = [];
    if (cands.size <= 3) {
      steps.push('Denne celle kan kun være ' + candList + '.');
      steps.push('Kig på rækken, kolonnen og boksen for at finde svaret.');
    } else {
      steps.push('Prøv at kigge på denne celle.');
      steps.push('Den kan være ' + candList + '.');
    }
    steps.push('Svaret er ' + val + '.');
    return {
      type: 'fallback', cell: { r, c }, value: val,
      highlights: [{ r, c, type: 'target' }],
      technique: { name: 'Hjælp', icon: '\uD83D\uDCA1', steps },
    };
  }

  // ========================
  //  Rendering
  // ========================

  function updateProgress() {
    let filled = 0;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board[r][c] !== 0) filled++;
    document.getElementById('sudoku-progress').textContent = filled;
  }

  function renderBoard() {
    boardEl.innerHTML = '';

    // Determine which number to highlight across the board
    const activeNum = (selectedNumber && selectedNumber !== 'erase') ? selectedNumber
      : (selectedCell ? board[selectedCell.r][selectedCell.c] || null : null);

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
          btn.classList.add(hinted[r][c] ? 'hint-placed' : 'user-filled');
          if (activeNum && board[r][c] === activeNum && !hinted[r][c]) {
            btn.classList.add('active-num');
          }
          btn.textContent = board[r][c];
        } else if (pencil[r][c].size > 0) {
          const marks = document.createElement('div');
          marks.className = 'pencil-marks';
          for (let n = 1; n <= 9; n++) {
            const s = document.createElement('span');
            if (pencil[r][c].has(n)) {
              s.textContent = n;
              if (activeNum && activeNum === n) {
                s.classList.add('pm-active');
              }
            }
            marks.appendChild(s);
          }
          btn.appendChild(marks);
        }

        // Highlight all cells with the active number
        if (activeNum && board[r][c] === activeNum) {
          btn.classList.add('same-num');
        }

        // Selection highlights
        if (selectedNumber) {
          // Number-first mode: highlight candidates
          if (selectedNumber !== 'erase' && highlightCandidates && board[r][c] === 0 && !given[r][c] && getCandidates(r, c).has(selectedNumber)) {
            btn.classList.add('num-candidate');
          }
          if (selectedCell && r === selectedCell.r && c === selectedCell.c) {
            btn.classList.add('selected');
          }
        } else if (selectedCell) {
          // Cell-first mode: highlight row/col/box
          if (r === selectedCell.r && c === selectedCell.c) {
            btn.classList.add('selected');
          } else if (r === selectedCell.r || c === selectedCell.c ||
            (Math.floor(r / 3) === Math.floor(selectedCell.r / 3) &&
             Math.floor(c / 3) === Math.floor(selectedCell.c / 3))) {
            btn.classList.add('row-col-highlight');
          }
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
    updateProgress();
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

  function togglePause() {
    if (gameOver) return;
    paused = !paused;
    const pauseBtn = document.getElementById('sudoku-pause-btn');
    const overlay = document.getElementById('sudoku-pause-overlay');
    if (paused) {
      timer.stop();
      pauseBtn.textContent = '\u25B6';
      boardEl.classList.add('su-paused');
      overlay.classList.add('active');
      numpadEl.style.pointerEvents = 'none';
      numpadEl.style.opacity = '0.3';
    } else {
      timer.start();
      pauseBtn.textContent = '\u23F8';
      boardEl.classList.remove('su-paused');
      overlay.classList.remove('active');
      numpadEl.style.pointerEvents = '';
      numpadEl.style.opacity = '';
    }
  }

  // ========================
  //  Interaction
  // ========================

  function selectCell(r, c) {
    if (gameOver || paused) return;
    activeHint = null;

    // Number-first mode: place selected number directly
    if (numberFirstMode && selectedNumber && !given[r][c]) {
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
    if (gameOver || paused) return;

    if (numberFirstMode) {
      // In number-first mode: toggle the selected number
      if (selectedNumber === n) {
        selectedNumber = null;
      } else {
        selectedNumber = n;
      }
      renderBoard();
      renderNumpad();
    } else {
      // Cell-first mode
      if (!selectedCell) {
        // No cell selected — toggle highlight only
        if (selectedNumber === n) {
          selectedNumber = null;
        } else {
          selectedNumber = n;
        }
        renderBoard();
        renderNumpad();
        return;
      }
      selectedNumber = null;
      if (n === 'erase') {
        handleErase();
      } else {
        handleNumberInput(n);
      }
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem('bg_sudoku_settings', JSON.stringify({
        highlightCandidates,
        tabletMode,
      }));
    } catch (e) { /* storage full */ }
  }

  function autoAdvanceNumber() {
    if (!numberFirstMode || !selectedNumber || selectedNumber === 'erase') return;
    let count = 0;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board[r][c] === selectedNumber) count++;
    if (count < 9) return;
    for (let i = 1; i <= 9; i++) {
      const next = ((selectedNumber - 1 + i) % 9) + 1;
      let nc = 0;
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
          if (board[r][c] === next) nc++;
      if (nc < 9) { selectedNumber = next; return; }
    }
    selectedNumber = null;
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
        // Only allow if the number is a valid candidate
        if (!getCandidates(r, c).has(num) && board[r][c] === 0) return;
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
      autoAdvanceNumber();
      renderBoard();
      renderNumpad();
      renderToolbar();
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
    if (gameOver || paused || moveHistory.length === 0) return;
    const move = moveHistory.pop();
    board[move.r][move.c] = move.prevValue;
    pencil[move.r][move.c] = new Set(move.prevPencil);
    hinted[move.r][move.c] = move.prevHinted || false;
    selectedCell = { r: move.r, c: move.c };
    vibrate(10);
    renderBoard();
    renderNumpad();
    renderToolbar();


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
    if (gameOver || paused) return;
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
    const title = document.getElementById('su-hint-title');
    const stepsEl = document.getElementById('su-hint-steps');
    const answer = document.getElementById('su-hint-answer');

    answer.textContent = 'Skriv ' + hint.value;
    title.textContent = hint.technique.name;

    stepsEl.innerHTML = '';
    hint.technique.steps.forEach((step, i) => {
      const div = document.createElement('div');
      div.className = 'su-hint-step';
      div.innerHTML = '<span class="su-hint-step-num">' + (i + 1) + '</span><span>' + step + '</span>';
      stepsEl.appendChild(div);
    });

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
      trackTechnique(hint.type);
      closeHintModal();
      placeHint(hint);
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
        selectedCell,
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

    // P for pause
    if (e.key === 'p' || e.key === 'P') {
      togglePause();
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
  document.getElementById('sudoku-pause-btn').onclick = togglePause;
  hintBtn.onclick = showHint;
  document.getElementById('su-techniques-close').onclick = closeTechniqueLibrary;

  // Settings modal
  const settingsModal = document.getElementById('sudoku-settings-modal');
  const setNumfirst = document.getElementById('su-set-numfirst');
  const setHighlights = document.getElementById('su-set-highlights');
  const setTablet = document.getElementById('su-set-tablet');

  document.getElementById('sudoku-settings-btn').onclick = function () {
    setNumfirst.checked = numberFirstMode;
    setHighlights.checked = highlightCandidates;
    setTablet.checked = tabletMode;
    settingsModal.classList.add('active');
  };
  settingsModal.onclick = function (e) {
    if (e.target === settingsModal) settingsModal.classList.remove('active');
  };
  setNumfirst.onchange = function () {
    numberFirstMode = setNumfirst.checked;
    if (!numberFirstMode) selectedNumber = null;
    saveSettings();
    renderBoard();
    renderNumpad();
  };
  setHighlights.onchange = function () {
    highlightCandidates = setHighlights.checked;
    saveSettings();
    renderBoard();
  };
  setTablet.onchange = function () {
    tabletMode = setTablet.checked;
    saveSettings();
    applyTabletMode();
  };
  document.getElementById('su-set-autonote').onclick = function () {
    settingsModal.classList.remove('active');
    autoFillPencilMarks();
  };
  document.getElementById('su-set-learn').onclick = function () {
    settingsModal.classList.remove('active');
    showTechniqueLibrary();
  };

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
