/* ===== Solitaire / Kabale (Klondike) ===== */

(function () {
  const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
  const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
  const SUIT_COLORS = { hearts: 'red', diamonds: 'red', clubs: 'black', spades: 'black' };
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const DIFFICULTIES = [
    { label: 'Let (Træk 1)', value: 'easy' },
    { label: 'Svær (Træk 3)', value: 'hard' },
  ];

  const LABEL_MAP = { easy: 'Let', hard: 'Svær' };

  let stock = [];
  let waste = [];
  let foundations = [[], [], [], []];
  let tableau = [[], [], [], [], [], [], []];
  let drawCount = 1;
  let moves = 0;
  let moveHistory = [];
  let timer = null;
  let gameOver = false;
  let autoCompleting = false;

  const boardEl = document.getElementById('solitaire-board');
  const movesEl = document.getElementById('solitaire-moves');
  const timerEl = document.getElementById('solitaire-timer');
  const diffBtn = document.getElementById('solitaire-diff-btn');

  function makeCard(suit, rank) {
    return {
      suit, rank,
      value: RANKS.indexOf(rank) + 1,
      color: SUIT_COLORS[suit],
      faceUp: false,
    };
  }

  function makeDeck() {
    const deck = [];
    SUITS.forEach((suit) => RANKS.forEach((rank) => deck.push(makeCard(suit, rank))));
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function initSolitaire() {
    const diff = getDifficulty('solitaire');
    diffBtn.textContent = LABEL_MAP[diff] || 'Let';
    startGame();
  }

  function startGame() {
    const diff = getDifficulty('solitaire');
    drawCount = diff === 'hard' ? 3 : 1;
    moves = 0;
    moveHistory = [];
    gameOver = false;
    autoCompleting = false;
    movesEl.textContent = '0';

    if (timer) timer.reset();
    timer = new GameTimer(timerEl);

    const deck = makeDeck();
    foundations = [[], [], [], []];
    tableau = [[], [], [], [], [], [], []];
    waste = [];

    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck.pop();
        card.faceUp = row === col;
        tableau[col].push(card);
      }
    }

    stock = deck.reverse();
    stock.forEach((c) => (c.faceUp = false));

    render();
    timer.start();
  }

  function render() {
    boardEl.innerHTML = '';

    // Top row
    const topRow = document.createElement('div');
    topRow.className = 'sol-top-row';

    // Stock
    const stockPile = createPile();
    if (stock.length > 0) {
      const card = renderCard(stock[stock.length - 1], false);
      card.onclick = drawFromStock;
      stockPile.appendChild(card);
    } else {
      const refresh = document.createElement('div');
      refresh.className = 'sol-stock-refresh';
      refresh.textContent = '↺';
      refresh.onclick = recycleStock;
      stockPile.appendChild(refresh);
    }
    topRow.appendChild(stockPile);

    // Waste
    const wastePile = createPile();
    if (waste.length > 0) {
      const card = renderCard(waste[waste.length - 1], true);
      card.onclick = () => handleCardClick('waste', 0, waste.length - 1);
      wastePile.appendChild(card);
    } else {
      wastePile.appendChild(createEmpty());
    }
    topRow.appendChild(wastePile);

    // Spacer
    const spacer = document.createElement('div');
    spacer.className = 'sol-spacer';
    topRow.appendChild(spacer);

    // Foundations
    for (let f = 0; f < 4; f++) {
      const fPile = createPile();
      if (foundations[f].length > 0) {
        const card = renderCard(foundations[f][foundations[f].length - 1], true);
        fPile.appendChild(card);
      } else {
        const empty = createEmpty();
        empty.classList.add('foundation');
        fPile.appendChild(empty);
      }
      topRow.appendChild(fPile);
    }

    boardEl.appendChild(topRow);

    // Tableau
    const tabRow = document.createElement('div');
    tabRow.className = 'sol-tableau';

    for (let col = 0; col < 7; col++) {
      const column = document.createElement('div');
      column.className = 'sol-column';

      if (tableau[col].length === 0) {
        const empty = createEmpty();
        empty.onclick = () => handleEmptyTableau(col);
        column.appendChild(empty);
      }

      tableau[col].forEach((card, idx) => {
        const el = renderCard(card, card.faceUp);
        el.style.top = (idx * 22) + 'px';
        el.style.zIndex = idx + 1;
        if (card.faceUp) {
          el.onclick = () => handleCardClick('tableau', col, idx);
        }
        column.appendChild(el);
      });

      const height = Math.max(100, tableau[col].length * 22 + 60);
      column.style.minHeight = height + 'px';

      tabRow.appendChild(column);
    }

    boardEl.appendChild(tabRow);

    // Undo button (not during auto-complete)
    if (moveHistory.length > 0 && !autoCompleting) {
      const undo = document.createElement('button');
      undo.className = 'sol-undo-btn';
      undo.textContent = '↩';
      undo.title = 'Fortryd';
      undo.onclick = undoMove;
      boardEl.appendChild(undo);
    }
  }

  function createPile() {
    const el = document.createElement('div');
    el.className = 'sol-pile';
    return el;
  }

  function createEmpty() {
    const el = document.createElement('div');
    el.className = 'sol-empty';
    return el;
  }

  function renderCard(card, faceUp) {
    const el = document.createElement('div');
    if (faceUp) {
      el.className = 'sol-card face-up ' + card.color;
      el.innerHTML =
        '<span class="sol-rank">' + card.rank + '</span>' +
        '<span class="sol-suit">' + SUIT_SYMBOLS[card.suit] + '</span>';
    } else {
      el.className = 'sol-card face-down';
    }
    return el;
  }

  function drawFromStock() {
    if (gameOver || autoCompleting || stock.length === 0) return;

    const drawn = [];
    for (let i = 0; i < drawCount && stock.length > 0; i++) {
      const card = stock.pop();
      card.faceUp = true;
      waste.push(card);
      drawn.push(card);
    }

    moveHistory.push({ type: 'draw', count: drawn.length });
    moves++;
    movesEl.textContent = moves;
    render();
  }

  function recycleStock() {
    if (gameOver || autoCompleting || waste.length === 0) return;

    moveHistory.push({ type: 'recycle', count: waste.length });

    while (waste.length > 0) {
      const card = waste.pop();
      card.faceUp = false;
      stock.push(card);
    }

    moves++;
    movesEl.textContent = moves;
    render();
  }

  function handleCardClick(source, col, idx) {
    if (gameOver || autoCompleting) return;

    let card;
    if (source === 'waste') {
      card = waste[waste.length - 1];
    } else {
      card = tableau[col][idx];
    }

    // Foundation moves only for top card
    const isTopCard = source === 'waste' || idx === tableau[col].length - 1;
    if (isTopCard) {
      for (let f = 0; f < 4; f++) {
        if (canMoveToFoundation(card, f)) {
          moveToFoundation(card, source, col, idx, f);
          return;
        }
      }
    }

    // Tableau moves
    if (source === 'waste') {
      for (let t = 0; t < 7; t++) {
        if (canMoveToTableau(card, t)) {
          moveWasteToTableau(t);
          return;
        }
      }
    } else {
      for (let t = 0; t < 7; t++) {
        if (t === col) continue;
        if (canMoveToTableau(card, t)) {
          moveTableauStack(col, idx, t);
          return;
        }
      }
    }
  }

  function handleEmptyTableau(col) {
    // Auto-move a King from waste if available
    if (waste.length > 0 && waste[waste.length - 1].value === 13) {
      moveWasteToTableau(col);
    }
  }

  function canMoveToFoundation(card, f) {
    const pile = foundations[f];
    if (pile.length === 0) return card.value === 1;
    const top = pile[pile.length - 1];
    return top.suit === card.suit && card.value === top.value + 1;
  }

  function canMoveToTableau(card, targetCol) {
    const pile = tableau[targetCol];
    if (pile.length === 0) return card.value === 13;
    const top = pile[pile.length - 1];
    return top.faceUp && top.color !== card.color && card.value === top.value - 1;
  }

  function moveToFoundation(card, source, col, idx, f) {
    let flipped = false;

    if (source === 'waste') {
      waste.pop();
    } else {
      tableau[col].splice(idx, 1);
      if (tableau[col].length > 0 && !tableau[col][tableau[col].length - 1].faceUp) {
        tableau[col][tableau[col].length - 1].faceUp = true;
        flipped = true;
      }
    }

    foundations[f].push(card);

    if (!autoCompleting) {
      moveHistory.push({ type: 'toFoundation', source, col, idx, f, card, flipped });
      moves++;
      movesEl.textContent = moves;
    }

    vibrate(10);
    render();
    checkWin();

    // Check for auto-complete opportunity
    if (!autoCompleting && !gameOver) {
      checkAutoComplete();
    }
  }

  function moveWasteToTableau(targetCol) {
    const card = waste.pop();
    tableau[targetCol].push(card);
    moveHistory.push({ type: 'wasteToTableau', targetCol, card });
    moves++;
    movesEl.textContent = moves;
    render();
  }

  function moveTableauStack(fromCol, fromIdx, toCol) {
    const cards = tableau[fromCol].splice(fromIdx);
    let flipped = false;

    if (tableau[fromCol].length > 0 && !tableau[fromCol][tableau[fromCol].length - 1].faceUp) {
      tableau[fromCol][tableau[fromCol].length - 1].faceUp = true;
      flipped = true;
    }

    cards.forEach((c) => tableau[toCol].push(c));
    moveHistory.push({ type: 'tableauToTableau', fromCol, fromIdx, toCol, count: cards.length, flipped });
    moves++;
    movesEl.textContent = moves;
    render();
  }

  function undoMove() {
    if (gameOver || autoCompleting || moveHistory.length === 0) return;
    const move = moveHistory.pop();

    switch (move.type) {
      case 'draw':
        for (let i = 0; i < move.count; i++) {
          const card = waste.pop();
          card.faceUp = false;
          stock.push(card);
        }
        break;

      case 'recycle':
        for (let i = 0; i < move.count; i++) {
          const card = stock.pop();
          card.faceUp = true;
          waste.push(card);
        }
        break;

      case 'toFoundation': {
        const card = foundations[move.f].pop();
        if (move.flipped) {
          tableau[move.col][tableau[move.col].length - 1].faceUp = false;
        }
        if (move.source === 'waste') {
          waste.push(card);
        } else {
          tableau[move.col].push(card);
        }
        break;
      }

      case 'wasteToTableau': {
        const c = tableau[move.targetCol].pop();
        waste.push(c);
        break;
      }

      case 'tableauToTableau':
        if (move.flipped) {
          tableau[move.fromCol][tableau[move.fromCol].length - 1].faceUp = false;
        }
        const cards = tableau[move.toCol].splice(-move.count);
        cards.forEach((card) => tableau[move.fromCol].push(card));
        break;
    }

    moves++;
    movesEl.textContent = moves;
    render();
  }

  function checkAutoComplete() {
    // Auto-complete if: stock is empty, waste is empty, all tableau cards face-up
    if (stock.length > 0 || waste.length > 0) return;

    const allFaceUp = tableau.every((col) => col.every((card) => card.faceUp));
    if (!allFaceUp) return;

    autoCompleting = true;
    runAutoComplete();
  }

  function runAutoComplete() {
    if (gameOver) return;

    // Find any card that can go to foundation
    let moved = false;
    for (let col = 0; col < 7; col++) {
      if (tableau[col].length === 0) continue;
      const card = tableau[col][tableau[col].length - 1];
      for (let f = 0; f < 4; f++) {
        if (canMoveToFoundation(card, f)) {
          tableau[col].pop();
          foundations[f].push(card);
          moved = true;
          render();
          checkWin();
          if (!gameOver) {
            setTimeout(runAutoComplete, 80);
          }
          return;
        }
      }
    }

    if (!moved) {
      autoCompleting = false;
    }
  }

  function checkWin() {
    const totalInFoundations = foundations.reduce((sum, f) => sum + f.length, 0);
    if (totalInFoundations === 52) {
      gameOver = true;
      autoCompleting = false;
      timer.stop();

      Stats.save('solitaire', {
        played: (Stats.get('solitaire').played || 0) + 1,
        won: (Stats.get('solitaire').won || 0) + 1,
      });

      setTimeout(() => {
        showResult(true, 'Træk: ' + moves + '<br>Tid: ' + timer.getFormatted(), 'solitaire');
      }, 500);
    }
  }

  diffBtn.onclick = () => {
    showDifficultyModal('solitaire', DIFFICULTIES, (val) => {
      diffBtn.textContent = LABEL_MAP[val] || 'Let';
      startGame();
    });
  };

  window.initSolitaire = initSolitaire;
  window.gameRestarters.solitaire = startGame;
})();
