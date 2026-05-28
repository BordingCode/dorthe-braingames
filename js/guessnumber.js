/* ===== Gæt tallet (1–999 with growing, de-duplicated hints) ===== */

(function () {
  const MAX = 999;
  const MAXLEN = String(MAX).length;

  let secret = 0;
  let guesses = 0;
  let entry = '';
  let hintQueue = [];
  let revealed = [];      // { hint, el, iconEl }
  let lo = 1, hi = MAX;    // known range from feedback + revealed range-clues
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

  // Each hint: { text, test(g)->bool (does guess g satisfy the clue),
  //              range:[min,max]|null (the secret-range this clue implies) }
  function buildHints(n) {
    const digits = String(n).length;

    const broad = [];

    broad.push({
      text: 'Tallet har ' + digits + ' cifre.',
      test: (g) => String(g).length === digits,
      range: [Math.pow(10, digits - 1), Math.min(MAX, Math.pow(10, digits) - 1)],
    });

    const even = n % 2 === 0;
    broad.push({
      text: 'Tallet er et ' + (even ? 'lige' : 'ulige') + ' tal.',
      test: (g) => (g % 2 === 0) === even,
      range: null,
    });

    if (n > 500) broad.push({ text: 'Tallet er større end 500.', test: (g) => g > 500, range: [501, MAX] });
    else if (n < 500) broad.push({ text: 'Tallet er mindre end 500.', test: (g) => g < 500, range: [1, 499] });
    else broad.push({ text: 'Tallet er præcis 500.', test: (g) => g === 500, range: [500, 500] });

    const ds = digitSum(n);
    broad.push({
      text: 'Tallets cifre giver tilsammen ' + ds + '.',
      test: (g) => digitSum(g) === ds,
      range: null,
    });

    if (n >= 100) {
      const band = Math.floor(n / 100) * 100;
      broad.push({
        text: 'Tallet ligger mellem ' + band + ' og ' + (band + 99) + '.',
        test: (g) => g >= band && g <= band + 99,
        range: [band, band + 99],
      });
    } else {
      const band = Math.floor(n / 10) * 10;
      const a = Math.max(1, band);
      broad.push({
        text: 'Tallet ligger mellem ' + a + ' og ' + (band + 9) + '.',
        test: (g) => g >= band && g <= band + 9,
        range: [a, band + 9],
      });
    }

    let div = null;
    for (const d of [3, 7, 11, 13]) {
      if (n % d === 0) {
        div = { text: 'Tallet kan deles med ' + d + ' (det går op).', test: (g) => g % d === 0, range: null };
        break;
      }
    }
    if (!div) {
      div = isPrime(n)
        ? { text: 'Tallet er et primtal.', test: (g) => isPrime(g), range: null }
        : { text: 'Tallet kan hverken deles med 3 eller 7.', test: (g) => g % 3 !== 0 && g % 7 !== 0, range: null };
    }
    broad.push(div);

    // Pinpoint clues — kept until last so the answer isn't given away too early
    const specific = [{ text: 'Tallet ender på ' + (n % 10) + '.', test: (g) => g % 10 === n % 10, range: null }];
    if (digits >= 2) {
      const fd = String(n)[0];
      specific.push({ text: 'Det første ciffer er ' + fd + '.', test: (g) => String(g)[0] === fd, range: null });
    }

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
    lo = 1;
    hi = MAX;
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

  // A clue is redundant if every number still possible (in [lo,hi]) already
  // satisfies it — then telling the player adds nothing new.
  function isRedundant(hint) {
    if (lo > hi) return true;
    for (let g = lo; g <= hi; g++) if (!hint.test(g)) return false;
    return true;
  }

  function narrowByRange(range) {
    if (!range) return;
    lo = Math.max(lo, range[0]);
    hi = Math.min(hi, range[1]);
  }

  function addHintChip(hint) {
    const chip = document.createElement('div');
    chip.className = 'gn-hint';
    const icon = document.createElement('span');
    icon.className = 'gn-hint-icon';
    icon.textContent = '💡';
    const text = document.createElement('span');
    text.className = 'gn-hint-text';
    text.textContent = hint.text;
    chip.appendChild(icon);
    chip.appendChild(text);
    hintsEl.appendChild(chip);
    hintsEl.scrollTop = hintsEl.scrollHeight;
    revealed.push({ hint, el: chip, iconEl: icon });
  }

  function revealNextHint() {
    while (hintQueue.length) {
      const hint = hintQueue.shift();
      if (isRedundant(hint)) continue; // skip clues already implied by what we know
      addHintChip(hint);
      narrowByRange(hint.range);
      return;
    }
  }

  // Mark every shown clue against the latest guess: ✓ followed, ✗ ignored.
  function markGuessOnHints(val) {
    revealed.forEach((r) => {
      const ok = r.hint.test(val);
      r.el.classList.remove('followed', 'broken');
      r.el.classList.add(ok ? 'followed' : 'broken');
      r.iconEl.textContent = ok ? '✓' : '✗';
    });
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
    if (entry.length >= MAXLEN) return;
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
      markGuessOnHints(val);
      win();
      return;
    }

    if (val < secret) {
      feedbackEl.className = 'gn-feedback too-low';
      feedbackEl.textContent = val + ' er for lavt — prøv højere ⬆';
      lo = Math.max(lo, val + 1);
      playTone(330, 200, 'sine');
    } else {
      feedbackEl.className = 'gn-feedback too-high';
      feedbackEl.textContent = val + ' er for højt — prøv lavere ⬇';
      hi = Math.min(hi, val - 1);
      playTone(247, 200, 'sine');
    }
    vibrate([30, 40]);
    revealNextHint();        // uses the narrowed range, so redundant clues are skipped
    markGuessOnHints(val);   // ✓/✗ on every clue, including any just revealed
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
