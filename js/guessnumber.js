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

  function buildHints(n) {
    const hints = [];
    const digits = String(n).length;
    hints.push('Tallet har ' + digits + ' cifre.');
    hints.push('Tallet er et ' + (n % 2 === 0 ? 'lige' : 'ulige') + ' tal.');
    if (n > 500) hints.push('Tallet er større end 500.');
    else if (n < 500) hints.push('Tallet er mindre end 500.');
    else hints.push('Tallet er præcis 500.');

    if (n >= 100) {
      const lo = Math.floor(n / 100) * 100;
      hints.push('Tallet ligger mellem ' + lo + ' og ' + (lo + 100) + '.');
    } else {
      const lo = Math.floor(n / 10) * 10;
      hints.push('Tallet ligger mellem ' + lo + ' og ' + (lo + 10) + '.');
    }

    let divHint = null;
    for (const d of [3, 7, 11, 13]) {
      if (n % d === 0) { divHint = 'Tallet kan deles med ' + d + ' (det går op).'; break; }
    }
    if (!divHint) divHint = isPrime(n) ? 'Tallet er et primtal.' : 'Tallet kan hverken deles med 3 eller 7.';
    hints.push(divHint);

    hints.push('Tallets cifre giver tilsammen ' + digitSum(n) + '.');
    hints.push('Tallet ender på ' + (n % 10) + '.');
    return hints;
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
    } else {
      feedbackEl.className = 'gn-feedback too-high';
      feedbackEl.textContent = val + ' er for højt — prøv lavere ⬇';
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

    const word = guesses === 1 ? 'gæt' : 'gæt';
    const statsHtml =
      'Du fandt tallet <b>' + secret + '</b><br>på <b>' + guesses + '</b> ' + word + '!' +
      (newRecord && isFinite(prevBest) ? '<br>🏆 Ny rekord — færreste gæt!' : '');

    setTimeout(() => showResult(true, statsHtml, 'guessnumber'), 400);
  }

  window.initGuessNumber = initGuessNumber;
  window.gameRestarters.guessnumber = function () { startGame(); };
  window.gameCleanups.guessnumber = function () { solved = true; };
})();
