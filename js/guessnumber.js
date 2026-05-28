/* ===== Gæt tallet (1–1000 with growing hints) ===== */

(function () {
  const MAX = 1000;

  let secret = 0;
  let guesses = 0;
  let entry = '';
  let hintQueue = [];
  let revealed = [];
  let solved = false;
  let padBuilt = false;

  const feedbackEl = document.getElementById('guessnumber-feedback');
  const hintsEl = document.getElementById('guessnumber-hints');
  const displayEl = document.getElementById('guessnumber-display');
  const padEl = document.getElementById('guessnumber-pad');
  const countEl = document.getElementById('guessnumber-count');
  const bestEl = document.getElementById('guessnumber-best');

  function isPrime(n) {
    if (n < 2) return false;
    for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
    return true;
  }

  function digitSum(n) {
    return String(n).split('').reduce((s, d) => s + Number(d), 0);
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildHints(n) {
    const digits = String(n).length;

    // Broad clues — shuffled so the order differs every game
    const broad = [
      'Tallet har ' + digits + ' cifre.',
      'Tallet er et ' + (n % 2 === 0 ? 'lige' : 'ulige') + ' tal.',
      n > 500 ? 'Tallet er større end 500.' : (n < 500 ? 'Tallet er mindre end 500.' : 'Tallet er præcis 500.'),
      'Tallets cifre giver tilsammen ' + digitSum(n) + '.',
    ];

    if (n >= 100) {
      const lo = Math.floor(n / 100) * 100;
      broad.push('Tallet ligger mellem ' + lo + ' og ' + (lo + 100) + '.');
    } else {
      const lo = Math.floor(n / 10) * 10;
      broad.push('Tallet ligger mellem ' + lo + ' og ' + (lo + 10) + '.');
    }

    let divHint = null;
    for (const d of [3, 7, 11, 13]) {
      if (n % d === 0) { divHint = 'Tallet kan deles med ' + d + ' (det går op).'; break; }
    }
    if (!divHint) divHint = isPrime(n) ? 'Tallet er et primtal.' : 'Tallet kan hverken deles med 3 eller 7.';
    broad.push(divHint);

    // Pinpoint clues — kept until last so the answer isn't given away too early
    const specific = ['Tallet ender på ' + (n % 10) + '.'];
    if (digits >= 2) specific.push('Det første ciffer er ' + String(n)[0] + '.');

    return [...shuffle(broad), ...shuffle(specific)];
  }

  function buildPad() {
    if (padBuilt) return;
    padEl.innerHTML = '';
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
    keys.forEach((k) => {
      const btn = document.createElement('button');
      btn.className = 'gn-key';
      if (k === 'del') { btn.classList.add('gn-key-del'); btn.textContent = '⌫'; }
      else if (k === 'ok') { btn.classList.add('gn-key-ok'); btn.textContent = 'Gæt'; }
      else btn.textContent = k;
      btn.onclick = () => onKey(k);
      padEl.appendChild(btn);
    });
    padBuilt = true;
  }

  function initGuessNumber() {
    buildPad();
    startGame();
  }

  function startGame() {
    secret = 1 + Math.floor(Math.random() * MAX);
    guesses = 0;
    entry = '';
    revealed = [];
    solved = false;
    hintQueue = buildHints(secret);

    countEl.textContent = '0';
    const best = Stats.get('guessnumber').bestGuesses;
    bestEl.textContent = best ? '🏆 ' + best : '🏆 –';
    feedbackEl.className = 'gn-feedback';
    feedbackEl.textContent = 'Jeg tænker på et tal mellem 1 og ' + MAX + '. Her er en ledetråd:';
    hintsEl.innerHTML = '';
    renderDisplay();
    revealNextHint(); // start the player off with one hint
  }

  function renderDisplay() {
    displayEl.textContent = entry === '' ? '–' : entry;
    displayEl.classList.toggle('empty', entry === '');
  }

  function revealNextHint() {
    if (hintQueue.length === 0) return;
    const hint = hintQueue.shift();
    revealed.push(hint);
    const chip = document.createElement('div');
    chip.className = 'gn-hint';
    chip.textContent = '💡 ' + hint;
    hintsEl.appendChild(chip);
    hintsEl.scrollTop = hintsEl.scrollHeight;
  }

  function onKey(k) {
    if (solved) return;
    if (k === 'del') {
      entry = entry.slice(0, -1);
      renderDisplay();
      return;
    }
    if (k === 'ok') {
      submitGuess();
      return;
    }
    if (entry.length >= 4) return;
    if (entry === '' && k === '0') return; // no leading zero
    entry += k;
    if (Number(entry) > MAX) entry = String(MAX);
    renderDisplay();
  }

  function submitGuess() {
    const val = Number(entry);
    if (!entry || val < 1 || val > MAX) {
      feedbackEl.className = 'gn-feedback shake';
      feedbackEl.textContent = 'Skriv et tal mellem 1 og ' + MAX + '.';
      void feedbackEl.offsetWidth;
      return;
    }

    guesses++;
    countEl.textContent = guesses;
    vibrate(15);

    if (val === secret) {
      win();
      return;
    }

    if (val < secret) {
      feedbackEl.className = 'gn-feedback too-low';
      feedbackEl.textContent = val + ' er for lavt — prøv højere ⬆';
      playTone(330, 200, 'sine');
    } else {
      feedbackEl.className = 'gn-feedback too-high';
      feedbackEl.textContent = val + ' er for højt — prøv lavere ⬇';
      playTone(247, 200, 'sine');
    }
    vibrate([30, 40]);
    revealNextHint();
    entry = '';
    renderDisplay();
  }

  function win() {
    solved = true;
    const prevBest = Stats.get('guessnumber').bestGuesses || Infinity;
    const newRecord = guesses < prevBest;

    Stats.record('guessnumber', {
      won: true,
      time: 0,
      difficulty: 'normal',
      extra: { bestGuesses: Math.min(prevBest, guesses) },
    });

    feedbackEl.className = 'gn-feedback correct';
    feedbackEl.textContent = '🎉 Rigtigt! Tallet var ' + secret + '.';
    displayEl.textContent = secret;
    displayEl.classList.remove('empty');

    [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 260, 'sine'), i * 130));

    const statsHtml =
      'Du fandt tallet <b>' + secret + '</b><br>på <b>' + guesses + '</b> gæt!' +
      (newRecord && isFinite(prevBest) ? '<br>🏆 Ny rekord — færreste gæt!' : '');

    setTimeout(() => showResult(true, statsHtml, 'guessnumber'), 400);
  }

  window.initGuessNumber = initGuessNumber;
  window.gameRestarters.guessnumber = function () { startGame(); };
  window.gameCleanups.guessnumber = function () { solved = true; };
})();
