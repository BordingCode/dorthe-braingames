/* ===== Solitaire / Kabale (Klondike) with Drag & Drop ===== */

(function () {
  const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
  const SUIT_SYMBOLS = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
  const SUIT_COLORS = { hearts: 'red', diamonds: 'red', clubs: 'black', spades: 'black' };
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const FACE_LABELS = { J: 'J', Q: 'Q', K: 'K' };

  const DIFFICULTIES = [
    { label: 'Let (Tr\u00e6k 1)', value: 'easy' },
    { label: 'Sv\u00e6r (Tr\u00e6k 3)', value: 'hard' },
  ];

  const LABEL_MAP = { easy: 'Let', hard: 'Sv\u00e6r' };

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

  // Drag state
  let drag = null;

  // Card back designs
  const CARD_BACKS = [
    { id: 'classic', label: 'Klassisk', stockColor: '#1a5c2e' },
    { id: 'royal', label: 'Kongeblå', stockColor: '#1a3a6b' },
    { id: 'sunset', label: 'Solnedgang', stockColor: '#c44e2b' },
    { id: 'floral', label: 'Blomster', stockColor: '#4a2060' },
    { id: 'midnight', label: 'Midnat', stockColor: '#0d1b2a' },
    { id: 'tartan', label: 'Tartan', stockColor: '#7a1a1a' },
  ];

  function getCardBack() {
    return localStorage.getItem('bg_sol_cardback') || 'classic';
  }

  function setCardBack(id) {
    localStorage.setItem('bg_sol_cardback', id);
    applyCardBack(id);
  }

  function applyCardBack(id) {
    var screen = document.getElementById('screen-solitaire');
    CARD_BACKS.forEach(function (cb) {
      screen.classList.remove('cardback-' + cb.id);
    });
    screen.classList.add('cardback-' + id);
    var back = CARD_BACKS.find(function (cb) { return cb.id === id; });
    if (back) {
      screen.style.setProperty('--stock-color', back.stockColor);
    }
  }

  function getDeckSide() {
    return localStorage.getItem('bg_sol_deckside') || 'left';
  }

  function setDeckSide(side) {
    localStorage.setItem('bg_sol_deckside', side);
    applyDeckSide(side);
  }

  function applyDeckSide(side) {
    var screen = document.getElementById('screen-solitaire');
    screen.classList.remove('deck-left', 'deck-right');
    screen.classList.add('deck-' + side);
  }

  function showCardBackPicker() {
    var modal = document.getElementById('cardback-modal');
    var container = document.getElementById('cardback-options');
    var current = getCardBack();

    container.innerHTML = '';
    CARD_BACKS.forEach(function (cb) {
      var opt = document.createElement('button');
      opt.className = 'cardback-option' + (cb.id === current ? ' selected' : '');

      var preview = document.createElement('div');
      preview.className = 'cardback-preview preview-' + cb.id;

      var label = document.createElement('span');
      label.className = 'cardback-label';
      label.textContent = cb.label;

      opt.appendChild(preview);
      opt.appendChild(label);

      opt.onclick = function () {
        setCardBack(cb.id);
        modal.classList.remove('active');
        render();
      };

      container.appendChild(opt);
    });

    // Deck side buttons
    var currentSide = getDeckSide();
    var sideButtons = document.querySelectorAll('#deck-side-toggle .deck-side-btn');
    sideButtons.forEach(function (btn) {
      var side = btn.getAttribute('data-side');
      btn.className = 'deck-side-btn' + (side === currentSide ? ' selected' : '');
      btn.onclick = function () {
        setDeckSide(side);
        sideButtons.forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        render();
      };
    });

    modal.classList.add('active');
    modal.onclick = function (e) {
      if (e.target === modal) modal.classList.remove('active');
    };
  }

  // ===== Hint system =====
  var hintTimeout = null;

  function findHint() {
    // Priority 1: Tableau or waste card to foundation
    if (waste.length > 0) {
      var wCard = waste[waste.length - 1];
      for (var f = 0; f < 4; f++) {
        if (canMoveToFoundation(wCard, f)) {
          return { from: { type: 'waste' }, to: { type: 'foundation', index: f } };
        }
      }
    }
    for (var c = 0; c < 7; c++) {
      if (tableau[c].length === 0) continue;
      var topCard = tableau[c][tableau[c].length - 1];
      if (!topCard.faceUp) continue;
      for (var f2 = 0; f2 < 4; f2++) {
        if (canMoveToFoundation(topCard, f2)) {
          return { from: { type: 'tableau', col: c, idx: tableau[c].length - 1 }, to: { type: 'foundation', index: f2 } };
        }
      }
    }

    // Priority 2: Tableau to tableau (prefer revealing face-down cards)
    for (var c2 = 0; c2 < 7; c2++) {
      if (tableau[c2].length === 0) continue;
      // Find first face-up card in column
      var startIdx = -1;
      for (var i = 0; i < tableau[c2].length; i++) {
        if (tableau[c2][i].faceUp) { startIdx = i; break; }
      }
      if (startIdx < 0) continue;
      var card = tableau[c2][startIdx];
      for (var t = 0; t < 7; t++) {
        if (t === c2) continue;
        if (canMoveToTableau(card, t)) {
          // Skip moving a King from an empty-below position to another empty column (pointless)
          if (card.value === 13 && startIdx === 0 && tableau[t].length === 0) continue;
          return { from: { type: 'tableau', col: c2, idx: startIdx }, to: { type: 'tableau', col: t } };
        }
      }
    }

    // Priority 3: Waste to tableau
    if (waste.length > 0) {
      var wCard2 = waste[waste.length - 1];
      for (var t2 = 0; t2 < 7; t2++) {
        if (canMoveToTableau(wCard2, t2)) {
          return { from: { type: 'waste' }, to: { type: 'tableau', col: t2 } };
        }
      }
    }

    // Priority 4: Draw from stock
    if (stock.length > 0) {
      return { from: { type: 'stock' }, to: { type: 'stock' } };
    }

    // Priority 5: Recycle stock
    if (waste.length > 0 && stock.length === 0) {
      return { from: { type: 'recycle' }, to: { type: 'recycle' } };
    }

    return null;
  }

  function showHint() {
    if (gameOver || autoCompleting) return;

    // Clear previous hint
    clearHint();

    var hint = findHint();
    if (!hint) return;

    // Highlight source
    if (hint.from.type === 'waste') {
      var wasteEl = boardEl.querySelector('.sol-pile[data-zone="waste"] .sol-card');
      if (wasteEl) wasteEl.classList.add('sol-hint-glow');
    } else if (hint.from.type === 'tableau') {
      var cols = boardEl.querySelectorAll('.sol-column');
      var col = cols[hint.from.col];
      if (col) {
        var cards = col.querySelectorAll('.sol-card');
        for (var i = hint.from.idx; i < tableau[hint.from.col].length; i++) {
          var ci = i - hint.from.idx;
          // cards in DOM match face-down + face-up order
          var cardIdx = i;
          if (cards[cardIdx]) cards[cardIdx].classList.add('sol-hint-glow');
        }
      }
    } else if (hint.from.type === 'stock' || hint.from.type === 'recycle') {
      var stockEl = boardEl.querySelector('.sol-pile:first-child');
      if (stockEl) stockEl.classList.add('sol-hint-glow');
    }

    // Highlight destination
    if (hint.to.type === 'foundation') {
      var fPiles = boardEl.querySelectorAll('.sol-pile[data-zone="foundation"]');
      if (fPiles[hint.to.index]) fPiles[hint.to.index].classList.add('sol-hint-target');
    } else if (hint.to.type === 'tableau') {
      var tcols = boardEl.querySelectorAll('.sol-column');
      if (tcols[hint.to.col]) tcols[hint.to.col].classList.add('sol-hint-target');
    }

    // Auto-clear after 3 seconds
    hintTimeout = setTimeout(clearHint, 3000);
  }

  function clearHint() {
    if (hintTimeout) { clearTimeout(hintTimeout); hintTimeout = null; }
    var glows = boardEl.querySelectorAll('.sol-hint-glow, .sol-hint-target');
    glows.forEach(function (el) {
      el.classList.remove('sol-hint-glow', 'sol-hint-target');
    });
  }

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
    SUITS.forEach(function (suit) {
      RANKS.forEach(function (rank) { deck.push(makeCard(suit, rank)); });
    });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
    }
    return deck;
  }

  function initSolitaire() {
    const diff = getDifficulty('solitaire');
    diffBtn.textContent = LABEL_MAP[diff] || 'Let';
    applyCardBack(getCardBack());
    applyDeckSide(getDeckSide());
    document.getElementById('sol-cardback-btn').onclick = showCardBackPicker;
    document.getElementById('sol-hint-btn').onclick = showHint;
    startGame();
  }

  function startGame() {
    const diff = getDifficulty('solitaire');
    drawCount = diff === 'hard' ? 3 : 1;
    moves = 0;
    moveHistory = [];
    gameOver = false;
    autoCompleting = false;
    drag = null;
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
    stock.forEach(function (c) { c.faceUp = false; });

    render();
    timer.start();
  }

  // ===== Rendering =====

  function render() {
    boardEl.innerHTML = '';

    // Top row
    const topRow = document.createElement('div');
    topRow.className = 'sol-top-row';

    // Stock
    const stockPile = createPile();
    if (stock.length > 0) {
      stockPile.classList.add('has-stock');
      const card = renderCard(stock[stock.length - 1], false);
      card.addEventListener('click', drawFromStock);
      stockPile.appendChild(card);
    } else {
      const refresh = document.createElement('div');
      refresh.className = 'sol-stock-refresh';
      refresh.textContent = '\u21ba';
      refresh.addEventListener('click', recycleStock);
      stockPile.appendChild(refresh);
    }
    var stockCount = document.createElement('div');
    stockCount.className = 'sol-stock-count';
    stockCount.textContent = stock.length;
    stockPile.appendChild(stockCount);
    topRow.appendChild(stockPile);

    // Waste
    const wastePile = createPile();
    wastePile.setAttribute('data-zone', 'waste');
    if (waste.length > 0) {
      const card = renderCard(waste[waste.length - 1], true);
      card.setAttribute('data-source', 'waste');
      card.setAttribute('data-idx', String(waste.length - 1));
      makeDraggable(card, 'waste', 0, waste.length - 1);
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
    const foundationSuits = ['\u2660', '\u2665', '\u2666', '\u2663'];
    for (let f = 0; f < 4; f++) {
      const fPile = createPile();
      fPile.setAttribute('data-zone', 'foundation');
      fPile.setAttribute('data-f', String(f));
      if (foundations[f].length > 0) {
        const card = renderCard(foundations[f][foundations[f].length - 1], true);
        (function (fIdx) {
          card.addEventListener('click', function () { handleCardClick('foundation', fIdx, 0); });
        })(f);
        fPile.appendChild(card);
      } else {
        const empty = createEmpty();
        empty.classList.add('foundation');
        empty.setAttribute('data-suit', foundationSuits[f]);
        (function (fIdx) {
          empty.addEventListener('click', function () { handleEmptyClick('foundation', fIdx); });
        })(f);
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
      column.setAttribute('data-zone', 'tableau');
      column.setAttribute('data-col', String(col));

      if (tableau[col].length === 0) {
        var emptySlot = createEmpty();
        (function (c) {
          emptySlot.addEventListener('click', function () { handleEmptyClick('tableau', c); });
        })(col);
        column.appendChild(emptySlot);
      }

      for (let idx = 0; idx < tableau[col].length; idx++) {
        const card = tableau[col][idx];
        const el = renderCard(card, card.faceUp);
        el.style.top = (idx * 22) + 'px';
        el.style.zIndex = idx + 1;
        if (card.faceUp) {
          el.setAttribute('data-source', 'tableau');
          el.setAttribute('data-col', String(col));
          el.setAttribute('data-idx', String(idx));
          makeDraggable(el, 'tableau', col, idx);
        }
        column.appendChild(el);
      }

      const height = Math.max(100, tableau[col].length * 22 + 70);
      column.style.minHeight = height + 'px';

      tabRow.appendChild(column);
    }

    boardEl.appendChild(tabRow);

    // Undo button
    if (moveHistory.length > 0 && !autoCompleting) {
      const undo = document.createElement('button');
      undo.className = 'sol-undo-btn';
      undo.textContent = '\u21a9';
      undo.title = 'Fortryd';
      undo.addEventListener('click', undoMove);
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

      // Top-left corner
      const tl = document.createElement('div');
      tl.className = 'sol-corner sol-corner-tl';
      const tlRank = document.createElement('span');
      tlRank.className = 'sol-rank';
      tlRank.textContent = card.rank;
      const tlSuit = document.createElement('span');
      tlSuit.className = 'sol-suit-sm';
      tlSuit.textContent = SUIT_SYMBOLS[card.suit];
      tl.appendChild(tlRank);
      tl.appendChild(tlSuit);
      el.appendChild(tl);

      // Bottom-right corner
      const br = document.createElement('div');
      br.className = 'sol-corner sol-corner-br';
      const brRank = document.createElement('span');
      brRank.className = 'sol-rank';
      brRank.textContent = card.rank;
      const brSuit = document.createElement('span');
      brSuit.className = 'sol-suit-sm';
      brSuit.textContent = SUIT_SYMBOLS[card.suit];
      br.appendChild(brRank);
      br.appendChild(brSuit);
      el.appendChild(br);

      // Face card watermark
      if (FACE_LABELS[card.rank]) {
        const face = document.createElement('div');
        face.className = 'sol-face-label';
        face.textContent = card.rank;
        el.appendChild(face);
      }

      // Center suit
      const center = document.createElement('div');
      center.className = 'sol-center';
      center.textContent = SUIT_SYMBOLS[card.suit];
      el.appendChild(center);
    } else {
      el.className = 'sol-card face-down';
    }
    return el;
  }

  // ===== Drag & Drop (document-level listeners for reliability) =====

  function makeDraggable(el, source, col, idx) {
    // Prevent native drag
    el.addEventListener('dragstart', function (e) { e.preventDefault(); });

    el.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      startDrag(e.clientX, e.clientY, el, source, col, idx);
    });

    el.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      var t = e.touches[0];
      startDrag(t.clientX, t.clientY, el, source, col, idx);
    }, { passive: true });
  }

  function startDrag(x, y, el, source, col, idx) {
    if (gameOver || autoCompleting || drag) return;

    var rect = el.getBoundingClientRect();

    // Collect drag elements (for stacks)
    var dragEls = [];
    var dragCards = [];

    if (source === 'tableau') {
      var colData = tableau[col];
      var colEl = el.closest('.sol-column');
      var allCardEls = colEl.querySelectorAll('.sol-card');
      for (var i = idx; i < colData.length; i++) {
        dragCards.push(colData[i]);
        if (allCardEls[i]) dragEls.push(allCardEls[i]);
      }
    } else {
      dragCards = [waste[waste.length - 1]];
      dragEls = [el];
    }

    drag = {
      source: source,
      col: col,
      idx: idx,
      cards: dragCards,
      els: dragEls,
      startX: x,
      startY: y,
      offsetX: x - rect.left,
      offsetY: y - rect.top,
      cardW: rect.width,
      cardH: rect.height,
      started: false,
      origRects: dragEls.map(function (de) { return de.getBoundingClientRect(); }),
    };

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
  }

  function onTouchMove(e) {
    if (!drag) return;
    e.preventDefault();
    var t = e.touches[0];
    moveDrag(t.clientX, t.clientY);
  }

  function onDragMove(e) {
    if (!drag) return;
    moveDrag(e.clientX, e.clientY);
  }

  function moveDrag(x, y) {
    var dx = x - drag.startX;
    var dy = y - drag.startY;

    // Minimum movement threshold
    if (!drag.started && Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
    drag.started = true;

    // Position dragged cards
    for (var i = 0; i < drag.els.length; i++) {
      var el = drag.els[i];
      el.classList.add(i === 0 ? 'dragging' : 'drag-child');
      el.style.position = 'fixed';
      el.style.left = (x - drag.offsetX) + 'px';
      el.style.top = (y - drag.offsetY + i * 22) + 'px';
      el.style.width = drag.cardW + 'px';
      el.style.zIndex = 1000 + i;
    }

    highlightTargets(x, y);
  }

  function onTouchEnd(e) {
    if (!drag) return;
    var x, y;
    if (e.changedTouches && e.changedTouches.length > 0) {
      x = e.changedTouches[0].clientX;
      y = e.changedTouches[0].clientY;
    } else {
      x = drag.startX;
      y = drag.startY;
    }
    endDrag(x, y);
  }

  function onDragEnd(e) {
    if (!drag) return;
    endDrag(e.clientX, e.clientY);
  }

  function endDrag(x, y) {
    // Remove document listeners
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
    document.removeEventListener('touchcancel', onTouchEnd);

    clearHighlights();

    if (!drag.started) {
      // It was a tap/click
      handleCardClick(drag.source, drag.col, drag.idx);
      drag = null;
      return;
    }

    // Find drop target
    var target = findDropTarget(x, y);

    if (target) {
      drag = executeDrop(target, drag);
    } else {
      // Reset card positions and re-render
      render();
    }

    drag = null;
  }

  function highlightTargets(x, y) {
    clearHighlights();
    if (!drag) return;
    var card = drag.cards[0];

    // Tableau columns
    var cols = boardEl.querySelectorAll('.sol-column');
    for (var i = 0; i < cols.length; i++) {
      var colIdx = parseInt(cols[i].getAttribute('data-col'));
      if (drag.source === 'tableau' && colIdx === drag.col) continue;
      if (canMoveToTableau(card, colIdx)) {
        cols[i].classList.add('drop-target');
      }
    }

    // Foundations (single cards only)
    if (drag.cards.length === 1) {
      var piles = boardEl.querySelectorAll('.sol-pile[data-zone="foundation"]');
      for (var j = 0; j < piles.length; j++) {
        var f = parseInt(piles[j].getAttribute('data-f'));
        if (canMoveToFoundation(card, f)) {
          piles[j].classList.add('drop-target');
        }
      }
    }
  }

  function clearHighlights() {
    var els = boardEl.querySelectorAll('.drop-target');
    for (var i = 0; i < els.length; i++) {
      els[i].classList.remove('drop-target');
    }
  }

  function findDropTarget(x, y) {
    var card = drag.cards[0];

    // Check foundations first (single card only)
    if (drag.cards.length === 1) {
      var piles = boardEl.querySelectorAll('.sol-pile[data-zone="foundation"]');
      for (var i = 0; i < piles.length; i++) {
        var rect = piles[i].getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          var f = parseInt(piles[i].getAttribute('data-f'));
          if (canMoveToFoundation(card, f)) {
            return { type: 'foundation', index: f };
          }
        }
      }
    }

    // Check tableau columns
    var cols = boardEl.querySelectorAll('.sol-column');
    for (var j = 0; j < cols.length; j++) {
      var rect2 = cols[j].getBoundingClientRect();
      if (x >= rect2.left && x <= rect2.right && y >= rect2.top && y <= rect2.bottom) {
        var colIdx = parseInt(cols[j].getAttribute('data-col'));
        if (drag.source === 'tableau' && colIdx === drag.col) continue;
        if (canMoveToTableau(card, colIdx)) {
          return { type: 'tableau', col: colIdx };
        }
      }
    }

    return null;
  }

  function executeDrop(target, d) {
    if (target.type === 'foundation') {
      moveToFoundation(d.cards[0], d.source, d.col, d.idx, target.index);
    } else if (target.type === 'tableau') {
      if (d.source === 'waste') {
        moveWasteToTableau(target.col);
      } else {
        moveTableauStack(d.col, d.idx, target.col);
      }
    }
    return d;
  }

  // ===== Game Logic =====

  function drawFromStock() {
    if (gameOver || autoCompleting || stock.length === 0) return;
    clearSelection();

    var drawn = [];
    for (var i = 0; i < drawCount && stock.length > 0; i++) {
      var card = stock.pop();
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
    clearSelection();

    moveHistory.push({ type: 'recycle', count: waste.length });

    while (waste.length > 0) {
      var card = waste.pop();
      card.faceUp = false;
      stock.push(card);
    }

    moves++;
    movesEl.textContent = moves;
    render();
  }

  // ===== Tap-to-select system =====
  var selected = null; // { source, col, idx, card }

  function clearSelection() {
    selected = null;
    var els = boardEl.querySelectorAll('.sol-selected');
    els.forEach(function (el) { el.classList.remove('sol-selected'); });
  }

  function handleCardClick(source, col, idx) {
    if (gameOver || autoCompleting) return;

    var card;
    if (source === 'waste') {
      card = waste[waste.length - 1];
    } else if (source === 'foundation') {
      card = foundations[col][foundations[col].length - 1];
    } else {
      card = tableau[col][idx];
    }

    // If something is already selected, try to move it here
    if (selected) {
      var moved = tryMoveSelected(source, col, idx);
      clearSelection();
      if (moved) return;
      // If move failed, fall through to select the tapped card instead
    }

    // Auto-move: if tapping the top card of a column, waste, or foundation, try to move just that one card
    var isTopCard = source === 'waste' ||
      source === 'foundation' ||
      (source === 'tableau' && idx === tableau[col].length - 1);

    if (isTopCard) {
      // Try foundation first (not from foundation)
      if (source !== 'foundation') {
        for (var f = 0; f < 4; f++) {
          if (canMoveToFoundation(card, f)) {
            moveToFoundation(card, source, col, idx, f);
            return;
          }
        }
      }
      // Try tableau
      if (source === 'waste') {
        for (var t = 0; t < 7; t++) {
          if (canMoveToTableau(card, t)) {
            moveWasteToTableau(t);
            return;
          }
        }
      } else if (source === 'foundation') {
        for (var t2 = 0; t2 < 7; t2++) {
          if (canMoveToTableau(card, t2)) {
            moveFoundationToTableau(col, t2);
            return;
          }
        }
      } else if (source === 'tableau') {
        // Only auto-move single top card to another tableau column
        for (var t3 = 0; t3 < 7; t3++) {
          if (t3 === col) continue;
          if (canMoveToTableau(card, t3)) {
            moveTableauStack(col, idx, t3);
            return;
          }
        }
      }
    }

    // No auto-move found (or not a top card): select for manual move
    clearSelection();
    selected = { source: source, col: col, idx: idx, card: card };
    highlightSelected(source, col, idx);
  }

  function handleEmptyClick(zone, col) {
    if (gameOver || autoCompleting || !selected) return;

    var moved = false;
    if (zone === 'tableau') {
      moved = tryMoveSelected('tableau', col, 0);
    } else if (zone === 'foundation') {
      moved = tryMoveSelected('foundation', col, 0);
    }
    clearSelection();
    if (!moved) return;
  }

  function tryMoveSelected(targetSource, targetCol, targetIdx) {
    var s = selected;

    // Move to foundation (not from foundation — that makes no sense)
    if (targetSource === 'foundation') {
      if (s.source === 'foundation') return false;
      if (canMoveToFoundation(s.card, targetCol)) {
        moveToFoundation(s.card, s.source, s.col, s.idx, targetCol);
        return true;
      }
      return false;
    }

    // Move to tableau
    if (targetSource === 'tableau') {
      if (canMoveToTableau(s.card, targetCol)) {
        if (s.source === 'waste') {
          moveWasteToTableau(targetCol);
        } else if (s.source === 'foundation') {
          moveFoundationToTableau(s.col, targetCol);
        } else {
          moveTableauStack(s.col, s.idx, targetCol);
        }
        return true;
      }
    }

    return false;
  }

  function highlightSelected(source, col, idx) {
    if (source === 'waste') {
      var wasteCard = boardEl.querySelector('.sol-pile[data-zone="waste"] .sol-card');
      if (wasteCard) wasteCard.classList.add('sol-selected');
    } else if (source === 'foundation') {
      var fPiles = boardEl.querySelectorAll('.sol-pile[data-zone="foundation"]');
      if (fPiles[col]) {
        var fCard = fPiles[col].querySelector('.sol-card');
        if (fCard) fCard.classList.add('sol-selected');
      }
    } else if (source === 'tableau') {
      var cols = boardEl.querySelectorAll('.sol-column');
      var colEl = cols[col];
      if (colEl) {
        var cards = colEl.querySelectorAll('.sol-card');
        for (var i = idx; i < tableau[col].length; i++) {
          if (cards[i]) cards[i].classList.add('sol-selected');
        }
      }
    }
  }

  function canMoveToFoundation(card, f) {
    var pile = foundations[f];
    if (pile.length === 0) return card.value === 1;
    var top = pile[pile.length - 1];
    return top.suit === card.suit && card.value === top.value + 1;
  }

  function canMoveToTableau(card, targetCol) {
    var pile = tableau[targetCol];
    if (pile.length === 0) return card.value === 13;
    var top = pile[pile.length - 1];
    return top.faceUp && top.color !== card.color && card.value === top.value - 1;
  }

  function moveToFoundation(card, source, col, idx, f) {
    var flipped = false;

    if (source === 'waste') {
      waste.pop();
    } else if (source === 'foundation') {
      foundations[col].pop();
    } else {
      tableau[col].splice(idx, 1);
      if (tableau[col].length > 0 && !tableau[col][tableau[col].length - 1].faceUp) {
        tableau[col][tableau[col].length - 1].faceUp = true;
        flipped = true;
      }
    }

    foundations[f].push(card);

    if (!autoCompleting) {
      moveHistory.push({ type: 'toFoundation', source: source, col: col, idx: idx, f: f, card: card, flipped: flipped });
      moves++;
      movesEl.textContent = moves;
    }

    vibrate(10);
    render();
    checkWin();

    if (!autoCompleting && !gameOver) {
      checkAutoComplete();
    }
  }

  function moveWasteToTableau(targetCol) {
    var card = waste.pop();
    tableau[targetCol].push(card);
    moveHistory.push({ type: 'wasteToTableau', targetCol: targetCol, card: card });
    moves++;
    movesEl.textContent = moves;
    render();
  }

  function moveFoundationToTableau(f, targetCol) {
    var card = foundations[f].pop();
    tableau[targetCol].push(card);
    moveHistory.push({ type: 'foundationToTableau', f: f, targetCol: targetCol, card: card });
    moves++;
    movesEl.textContent = moves;
    render();
  }

  function moveTableauStack(fromCol, fromIdx, toCol) {
    var cards = tableau[fromCol].splice(fromIdx);
    var flipped = false;

    if (tableau[fromCol].length > 0 && !tableau[fromCol][tableau[fromCol].length - 1].faceUp) {
      tableau[fromCol][tableau[fromCol].length - 1].faceUp = true;
      flipped = true;
    }

    for (var i = 0; i < cards.length; i++) {
      tableau[toCol].push(cards[i]);
    }
    moveHistory.push({ type: 'tableauToTableau', fromCol: fromCol, fromIdx: fromIdx, toCol: toCol, count: cards.length, flipped: flipped });
    moves++;
    movesEl.textContent = moves;
    render();
  }

  function undoMove() {
    if (gameOver || autoCompleting || moveHistory.length === 0) return;
    var move = moveHistory.pop();

    switch (move.type) {
      case 'draw':
        for (var i = 0; i < move.count; i++) {
          var card = waste.pop();
          card.faceUp = false;
          stock.push(card);
        }
        break;

      case 'recycle':
        for (var j = 0; j < move.count; j++) {
          var c = stock.pop();
          c.faceUp = true;
          waste.push(c);
        }
        break;

      case 'toFoundation':
        var fCard = foundations[move.f].pop();
        if (move.flipped) {
          tableau[move.col][tableau[move.col].length - 1].faceUp = false;
        }
        if (move.source === 'waste') {
          waste.push(fCard);
        } else {
          tableau[move.col].push(fCard);
        }
        break;

      case 'wasteToTableau':
        var wc = tableau[move.targetCol].pop();
        waste.push(wc);
        break;

      case 'tableauToTableau':
        if (move.flipped) {
          tableau[move.fromCol][tableau[move.fromCol].length - 1].faceUp = false;
        }
        var moved = tableau[move.toCol].splice(-move.count);
        for (var k = 0; k < moved.length; k++) {
          tableau[move.fromCol].push(moved[k]);
        }
        break;

      case 'foundationToTableau':
        var ftCard = tableau[move.targetCol].pop();
        foundations[move.f].push(ftCard);
        break;
    }

    moves++;
    movesEl.textContent = moves;
    render();
  }

  function checkAutoComplete() {
    if (stock.length > 0 || waste.length > 0) return;
    var allFaceUp = tableau.every(function (col) {
      return col.every(function (card) { return card.faceUp; });
    });
    if (!allFaceUp) return;
    autoCompleting = true;
    runAutoComplete();
  }

  function runAutoComplete() {
    if (gameOver) return;

    for (var col = 0; col < 7; col++) {
      if (tableau[col].length === 0) continue;
      var card = tableau[col][tableau[col].length - 1];
      for (var f = 0; f < 4; f++) {
        if (canMoveToFoundation(card, f)) {
          tableau[col].pop();
          foundations[f].push(card);
          render();
          checkWin();
          if (!gameOver) {
            setTimeout(runAutoComplete, 80);
          }
          return;
        }
      }
    }

    autoCompleting = false;
  }

  function checkWin() {
    var total = foundations.reduce(function (sum, f) { return sum + f.length; }, 0);
    if (total === 52) {
      gameOver = true;
      autoCompleting = false;
      timer.stop();

      Stats.save('solitaire', {
        played: (Stats.get('solitaire').played || 0) + 1,
        won: (Stats.get('solitaire').won || 0) + 1,
      });

      setTimeout(function () {
        showResult(true, 'Tr\u00e6k: ' + moves + '<br>Tid: ' + timer.getFormatted(), 'solitaire');
      }, 500);
    }
  }

  diffBtn.onclick = function () {
    showDifficultyModal('solitaire', DIFFICULTIES, function (val) {
      diffBtn.textContent = LABEL_MAP[val] || 'Let';
      startGame();
    });
  };

  window.initSolitaire = initSolitaire;
  window.gameRestarters.solitaire = startGame;
})();
