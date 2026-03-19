/* ===== Word Search / Ordsjagt ===== */

(function () {
  const WORD_BANK = {
    dyr: ['hund', 'kat', 'hest', 'fugl', 'fisk', 'mus', 'ko', 'gris', 'and', 'ugle',
          'hare', 'ravn', 'lam', 'gedde', 'ørn', 'bjørn', 'ulv', 'ræv', 'hjort', 'frø'],
    mad: ['brød', 'smør', 'ost', 'æble', 'kage', 'suppe', 'salat', 'fløde', 'mel', 'ris',
          'pære', 'frugt', 'grød', 'saft', 'pølse', 'skinke', 'tomat', 'gulerod', 'løg'],
    natur: ['sol', 'regn', 'skov', 'blomst', 'hav', 'sø', 'bakke', 'mark', 'eng',
            'sky', 'vind', 'sne', 'jord', 'sten', 'træ', 'blad', 'rose', 'mos'],
    farver: ['rød', 'blå', 'grøn', 'gul', 'hvid', 'sort', 'lilla', 'pink', 'brun', 'grå',
             'guld', 'sølv', 'orange'],
    familie: ['mor', 'far', 'søn', 'datter', 'barn', 'hjem', 'hus', 'kram', 'glæde', 'fest',
              'gave', 'sang', 'dans', 'smil', 'ven', 'hygge', 'lykke', 'latter', 'leg'],
  };

  const DIFFICULTIES = [
    { label: 'Let (8×8, 5 ord)', value: 'easy' },
    { label: 'Medium (10×10, 7 ord)', value: 'medium' },
    { label: 'Svær (12×12, 9 ord)', value: 'hard' },
  ];

  const CONFIG = {
    easy: { size: 8, wordCount: 5, allowDiagonal: false, allowReverse: false },
    medium: { size: 10, wordCount: 7, allowDiagonal: true, allowReverse: false },
    hard: { size: 12, wordCount: 9, allowDiagonal: true, allowReverse: true },
  };

  const LABEL_MAP = { easy: 'Let', medium: 'Medium', hard: 'Svær' };
  const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  const LETTER_WEIGHTS = 'eeeeaaaarrrnnnoooiiisstttdddlllggkkmmbbffhhppvvjjuuyyccwwzxæøå';

  let grid = [];
  let gridSize = 8;
  let words = [];
  let foundWords = new Set();
  let selecting = false;
  let selStart = null;
  let selCells = [];
  let timer = null;
  let listenersAdded = false;

  const boardEl = document.getElementById('wordsearch-board');
  const wordlistEl = document.getElementById('wordsearch-wordlist');
  const foundEl = document.getElementById('wordsearch-found');
  const timerEl = document.getElementById('wordsearch-timer');
  const diffBtn = document.getElementById('wordsearch-diff-btn');

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function randomLetter() {
    return LETTER_WEIGHTS[Math.floor(Math.random() * LETTER_WEIGHTS.length)];
  }

  function initWordSearch() {
    const diff = getDifficulty('wordsearch');
    diffBtn.textContent = LABEL_MAP[diff] || 'Let';
    startGame();
  }

  function startGame() {
    const diff = getDifficulty('wordsearch');
    const config = CONFIG[diff] || CONFIG.easy;
    gridSize = config.size;
    foundWords = new Set();
    listenersAdded = false;

    if (timer) timer.reset();
    timer = new GameTimer(timerEl);

    let allWords = [];
    Object.values(WORD_BANK).forEach((cat) => {
      cat.forEach((w) => {
        if (w.length <= gridSize && w.length >= 3) allWords.push(w);
      });
    });
    allWords = shuffle([...new Set(allWords)]);

    let placed = [];
    let attempts = 0;

    while (placed.length < config.wordCount && attempts < 50) {
      placed = [];
      grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(''));

      for (const word of allWords) {
        if (placed.length >= config.wordCount) break;
        if (tryPlaceWord(word, config)) {
          placed.push(word);
        }
      }
      if (placed.length < config.wordCount) {
        allWords = shuffle(allWords);
      }
      attempts++;
    }

    words = placed.map((w) => ({ word: w, cells: getWordCells(w), found: false }));

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (!grid[r][c]) grid[r][c] = randomLetter();
      }
    }

    foundEl.textContent = '0/' + words.length;
    renderBoard();
    renderWordList();
    timer.start();
  }

  function tryPlaceWord(word, config) {
    let dirs = [DIRECTIONS[0], DIRECTIONS[1]];
    if (config.allowDiagonal) dirs = [...DIRECTIONS];
    shuffle(dirs);

    for (const [dr, dc] of dirs) {
      const variants = [word];
      if (config.allowReverse) variants.push(word.split('').reverse().join(''));

      for (const variant of variants) {
        const positions = [];
        for (let r = 0; r < gridSize; r++) {
          for (let c = 0; c < gridSize; c++) {
            positions.push([r, c]);
          }
        }
        shuffle(positions);

        for (const [startR, startC] of positions) {
          if (canPlace(variant, startR, startC, dr, dc)) {
            placeWord(variant, startR, startC, dr, dc);
            return true;
          }
        }
      }
    }
    return false;
  }

  function canPlace(word, r, c, dr, dc) {
    for (let i = 0; i < word.length; i++) {
      const nr = r + dr * i, nc = c + dc * i;
      if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) return false;
      if (grid[nr][nc] && grid[nr][nc] !== word[i]) return false;
    }
    return true;
  }

  function placeWord(word, r, c, dr, dc) {
    for (let i = 0; i < word.length; i++) {
      grid[r + dr * i][c + dc * i] = word[i];
    }
  }

  function getWordCells(word) {
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        for (const [dr, dc] of DIRECTIONS) {
          if (matchAt(word, r, c, dr, dc)) {
            return Array.from({ length: word.length }, (_, i) => [r + dr * i, c + dc * i]);
          }
          const rev = word.split('').reverse().join('');
          if (matchAt(rev, r, c, dr, dc)) {
            return Array.from({ length: rev.length }, (_, i) => [r + dr * i, c + dc * i]);
          }
        }
      }
    }
    return [];
  }

  function matchAt(word, r, c, dr, dc) {
    for (let i = 0; i < word.length; i++) {
      const nr = r + dr * i, nc = c + dc * i;
      if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) return false;
      if (grid[nr][nc] !== word[i]) return false;
    }
    return true;
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    boardEl.className = 'cols-' + gridSize;

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const cell = document.createElement('div');
        cell.className = 'ws-cell';
        cell.textContent = grid[r][c];
        cell.dataset.r = r;
        cell.dataset.c = c;

        words.forEach((w, wi) => {
          if (w.found) {
            w.cells.forEach(([wr, wc]) => {
              if (wr === r && wc === c) {
                cell.classList.add('found', 'found-' + (wi % 10));
              }
            });
          }
        });

        boardEl.appendChild(cell);
      }
    }

    if (!listenersAdded) {
      boardEl.addEventListener('pointerdown', onPointerDown);
      boardEl.addEventListener('pointermove', onPointerMove);
      boardEl.addEventListener('pointerup', onPointerUp);
      boardEl.addEventListener('pointerleave', onPointerUp);
      listenersAdded = true;
    }
  }

  function getCellFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    if (el && el.classList.contains('ws-cell')) {
      return { r: parseInt(el.dataset.r), c: parseInt(el.dataset.c) };
    }
    return null;
  }

  function getLineCells(start, end) {
    const dr = Math.sign(end.r - start.r);
    const dc = Math.sign(end.c - start.c);
    const dist = Math.max(Math.abs(end.r - start.r), Math.abs(end.c - start.c));

    if (end.r - start.r !== 0 && end.c - start.c !== 0 &&
        Math.abs(end.r - start.r) !== Math.abs(end.c - start.c)) {
      return [start];
    }

    const cells = [];
    for (let i = 0; i <= dist; i++) {
      cells.push({ r: start.r + dr * i, c: start.c + dc * i });
    }
    return cells;
  }

  function onPointerDown(e) {
    e.preventDefault();
    const cell = getCellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    selecting = true;
    selStart = cell;
    selCells = [cell];
    updateSelectionHighlight();
  }

  function onPointerMove(e) {
    if (!selecting) return;
    e.preventDefault();
    const cell = getCellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    selCells = getLineCells(selStart, cell);
    updateSelectionHighlight();
  }

  function onPointerUp() {
    if (!selecting) return;
    selecting = false;
    checkSelection();
    clearSelectionHighlight();
  }

  function updateSelectionHighlight() {
    boardEl.querySelectorAll('.ws-cell.selecting').forEach((el) => el.classList.remove('selecting'));
    selCells.forEach(({ r, c }) => {
      const idx = r * gridSize + c;
      if (boardEl.children[idx]) boardEl.children[idx].classList.add('selecting');
    });
  }

  function clearSelectionHighlight() {
    boardEl.querySelectorAll('.ws-cell.selecting').forEach((el) => el.classList.remove('selecting'));
    selCells = [];
  }

  function checkSelection() {
    const selectedStr = selCells.map(({ r, c }) => grid[r][c]).join('');
    const selectedStrRev = selectedStr.split('').reverse().join('');

    for (let wi = 0; wi < words.length; wi++) {
      const w = words[wi];
      if (w.found) continue;
      if (selectedStr === w.word || selectedStrRev === w.word) {
        w.found = true;
        foundWords.add(w.word);
        vibrate(20);
        foundEl.textContent = foundWords.size + '/' + words.length;
        renderBoard();
        renderWordList(wi);

        if (foundWords.size === words.length) {
          timer.stop();
          Stats.save('wordsearch', {
            played: (Stats.get('wordsearch').played || 0) + 1,
            completed: (Stats.get('wordsearch').completed || 0) + 1,
          });
          setTimeout(() => {
            showResult(true, 'Alle ord fundet!<br>Tid: ' + timer.getFormatted(), 'wordsearch');
          }, 500);
        }
        return;
      }
    }
  }

  function renderWordList(justFoundIdx) {
    wordlistEl.innerHTML = '';
    words.forEach((w, i) => {
      const el = document.createElement('span');
      el.className = 'ws-word' + (w.found ? ' found' : '');
      if (i === justFoundIdx) el.classList.add('just-found');
      el.textContent = w.word;
      wordlistEl.appendChild(el);
    });
  }

  diffBtn.onclick = () => {
    showDifficultyModal('wordsearch', DIFFICULTIES, (val) => {
      diffBtn.textContent = LABEL_MAP[val] || 'Let';
      startGame();
    });
  };

  window.initWordSearch = initWordSearch;
  window.gameRestarters.wordsearch = startGame;
})();
