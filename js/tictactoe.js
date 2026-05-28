/* ===== Kryds og bolle (tic-tac-toe vs. computer) ===== */

(function () {
  const HUMAN = 'X';   // ❌ — player always starts
  const CPU = 'O';     // ⭕
  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6],            // diagonals
  ];

  const DIFFICULTIES = [
    { label: 'Let', value: 'easy' },
    { label: 'Medium', value: 'medium' },
    { label: 'Svær (uovervindelig)', value: 'hard' },
  ];
  const LABEL_MAP = { easy: 'Let', medium: 'Medium', hard: 'Svær' };

  let board = Array(9).fill('');
  let level = 'easy';
  let busy = false;     // true while it's the computer's turn (block input)
  let over = false;
  let stopped = false;  // screen left
  let timers = [];

  const boardEl = document.getElementById('tictactoe-board');
  const statusEl = document.getElementById('tictactoe-status');
  const diffBtn = document.getElementById('tictactoe-diff-btn');

  const later = (fn, ms) => { const id = setTimeout(() => { if (!stopped) fn(); }, Math.max(0, ms)); timers.push(id); return id; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  /* ---- rules ---- */
  function winnerOf(b) {
    for (const [a, c, d] of LINES) {
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return { mark: b[a], line: [a, c, d] };
    }
    return null;
  }
  const isFull = (b) => b.every((c) => c);
  const emptyCells = (b) => b.reduce((acc, v, i) => (v ? acc : (acc.push(i), acc)), []);

  /* ---- computer AI ---- */
  // complete or block a line: return the empty index that makes `mark` win, else null
  function lineMove(b, mark) {
    for (const ln of LINES) {
      const marks = ln.filter((i) => b[i] === mark).length;
      const empties = ln.filter((i) => !b[i]);
      if (marks === 2 && empties.length === 1) return empties[0];
    }
    return null;
  }

  function minimax(b, player) {
    const w = winnerOf(b);
    if (w) return { score: w.mark === CPU ? 1 : -1 };
    if (isFull(b)) return { score: 0 };
    const moves = [];
    for (const i of emptyCells(b)) {
      b[i] = player;
      moves.push({ i, score: minimax(b, player === CPU ? HUMAN : CPU).score });
      b[i] = '';
    }
    const best = player === CPU
      ? moves.reduce((b, m) => (m.score > b.score ? m : b))
      : moves.reduce((b, m) => (m.score < b.score ? m : b));
    return { score: best.score, move: best.i };
  }

  function chooseMove() {
    const empties = emptyCells(board);
    if (level === 'easy') {
      // mostly random, but still take an immediate win so it isn't insulting
      return lineMove(board, CPU) ?? empties[Math.floor(Math.random() * empties.length)];
    }
    if (level === 'medium') {
      return lineMove(board, CPU)            // win if possible
        ?? lineMove(board, HUMAN)            // else block
        ?? (board[4] === '' ? 4 : null)      // else take centre
        ?? empties[Math.floor(Math.random() * empties.length)];
    }
    return minimax(board.slice(), CPU).move; // hard: optimal/unbeatable
  }

  /* ---- rendering ---- */
  function renderBoard() {
    boardEl.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const btn = document.createElement('button');
      btn.className = 'ttt-cell' + (board[i] === HUMAN ? ' x' : board[i] === CPU ? ' o' : '');
      btn.textContent = board[i] === HUMAN ? '❌' : board[i] === CPU ? '⭕' : '';
      btn.setAttribute('aria-label', 'Felt ' + (i + 1) + (board[i] ? ' (' + (board[i] === HUMAN ? 'kryds' : 'bolle') + ')' : ' (tomt)'));
      btn.disabled = !!board[i] || over || busy;
      btn.addEventListener('click', () => handleTap(i));
      boardEl.appendChild(btn);
    }
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = 'ttt-status' + (cls ? ' ' + cls : '');
  }

  /* ---- flow ---- */
  function initTicTacToe() {
    level = getDifficulty('tictactoe') || 'easy';
    diffBtn.textContent = LABEL_MAP[level] || 'Let';
    startGame();
  }

  function startGame() {
    stopped = false;
    clearTimers();
    board = Array(9).fill('');
    busy = false;
    over = false;
    setStatus('Din tur ❌', 'turn-human');
    renderBoard();
  }

  function handleTap(i) {
    if (over || busy || stopped || board[i]) return;
    board[i] = HUMAN;
    playTone(440, 160, 'sine');
    vibrate(12);
    renderBoard();
    if (checkEnd()) return;

    busy = true;
    setStatus('Computeren tænker…', 'turn-cpu');
    renderBoard(); // disables cells while CPU "thinks"
    later(computerMove, 520);
  }

  function computerMove() {
    const move = chooseMove();
    if (move != null) board[move] = CPU;
    playTone(294, 180, 'sine');
    busy = false;
    renderBoard();
    if (checkEnd()) return;
    setStatus('Din tur ❌', 'turn-human');
  }

  function checkEnd() {
    const w = winnerOf(board);
    if (w) { endGame(w.mark, w.line); return true; }
    if (isFull(board)) { endGame('draw', null); return true; }
    return false;
  }

  function endGame(result, line) {
    over = true;
    busy = false;
    if (line) line.forEach((i) => boardEl.children[i] && boardEl.children[i].classList.add('win'));
    [...boardEl.children].forEach((c) => (c.disabled = true));

    const playerWon = result === HUMAN;
    let statsHtml, statusText, statusCls;
    if (playerWon) {
      statusText = 'Du vandt! 🎉'; statusCls = 'win';
      statsHtml = 'Du fik tre på stribe! ❌<br>Sværhedsgrad: <b>' + (LABEL_MAP[level] || 'Let') + '</b>';
      playTone(523, 200, 'sine');
      later(() => playTone(784, 240, 'sine'), 150);
    } else if (result === 'draw') {
      statusText = 'Uafgjort!'; statusCls = 'draw';
      statsHtml = 'Uafgjort — godt spillet!<br>Sværhedsgrad: <b>' + (LABEL_MAP[level] || 'Let') + '</b>';
      playTone(392, 200, 'sine');
    } else {
      statusText = 'Computeren vandt'; statusCls = 'lose';
      statsHtml = 'Computeren fik tre på stribe ⭕<br>Prøv igen!';
      playTone(330, 200, 'sine');
      later(() => playTone(247, 280, 'sine'), 160);
    }
    setStatus(statusText, statusCls);

    Stats.record('tictactoe', {
      won: playerWon,
      time: 0,
      difficulty: level,
      extra: { draws: (Stats.get('tictactoe').draws || 0) + (result === 'draw' ? 1 : 0) },
    });

    later(() => showResult(playerWon, statsHtml, 'tictactoe'), 650);
  }

  diffBtn.onclick = () => {
    showDifficultyModal('tictactoe', DIFFICULTIES, (val) => {
      level = val;
      diffBtn.textContent = LABEL_MAP[val] || 'Let';
      startGame();
    });
  };

  window.initTicTacToe = initTicTacToe;
  window.gameRestarters.tictactoe = startGame;
  window.gameCleanups.tictactoe = function () {
    stopped = true;
    busy = false;
    clearTimers();
  };
})();
