/* ===== Mere eller mindre (higher / lower) ===== */

(function () {
  // Each fact is a plain "how many / how big" number. Values are kept
  // unique so a round is never a tie, and rounded to well-known figures.
  const FACTS = [
    { label: 'Antal planeter i solsystemet', value: 8 },
    { label: 'Antal ringe i det olympiske flag', value: 5 },
    { label: 'Antal farver i en regnbue', value: 7 },
    { label: 'Antal spillere på et fodboldhold på banen', value: 11 },
    { label: 'Antal måneder i et år', value: 12 },
    { label: 'Antal timer i et døgn', value: 24 },
    { label: 'Antal lande i EU', value: 27 },
    { label: 'Antal bogstaver i det danske alfabet', value: 29 },
    { label: 'Antal tænder hos en voksen', value: 32 },
    { label: 'Højde på Rundetårn i meter', value: 35 },
    { label: 'En menneskekrops normaltemperatur i grader', value: 37 },
    { label: 'Antal spillekort i et spil', value: 52 },
    { label: 'Antal felter på et skakbræt', value: 64 },
    { label: 'En menneskelig puls i hvile (slag i minuttet)', value: 70 },
    { label: 'Antal tangenter på et klaver', value: 88 },
    { label: 'En fodboldkamp i minutter', value: 90 },
    { label: 'Antal kommuner i Danmark', value: 98 },
    { label: 'Vands kogepunkt i grader', value: 100 },
    { label: 'Antal lande i verden', value: 195 },
    { label: 'Antal knogler i menneskekroppen', value: 206 },
    { label: 'Højde på Eiffeltårnet i meter', value: 330 },
    { label: 'Antal dage i et år', value: 365 },
    { label: 'Burj Khalifa — verdens højeste bygning — i meter', value: 828 },
    { label: 'Antal trappetrin op til toppen af Eiffeltårnet', value: 1665 },
    { label: 'Antal sprog i verden', value: 7000 },
    { label: 'Højde på Mount Everest i meter', value: 8849 },
    { label: 'Antal kendte fuglearter', value: 11000 },
    { label: 'Antal minutter i en uge', value: 10080 },
    { label: 'Antal sekunder i et døgn', value: 86400 },
    { label: 'Afstand fra Jorden til Månen i km', value: 384400 },
    { label: 'Indbyggere på Island', value: 390000 },
    { label: 'Indbyggere i Københavns Kommune', value: 660000 },
    { label: 'Befolkningen i New Zealand', value: 5340000 },
    { label: 'Befolkningen i Norge', value: 5550000 },
    { label: 'Befolkningen i Danmark', value: 5960000 },
    { label: 'Befolkningen i Sverige', value: 10600000 },
    { label: 'Antal grise i Danmark', value: 11600000 },
    { label: 'Afstand fra Jorden til Solen i km', value: 149600000 },
    { label: 'Befolkningen i USA', value: 340000000 },
    { label: 'Befolkningen i Kina', value: 1410000000 },
    { label: 'Befolkningen i Indien', value: 1440000000 },
    { label: 'Verdens samlede befolkning', value: 8200000000 },
  ];

  let deck = [];
  let factA = null;
  let factB = null;
  let streak = 0;
  let locked = false;
  let countTimer = null;
  let advanceTimer = null;

  const aLabel = document.getElementById('moreless-a-label');
  const aValue = document.getElementById('moreless-a-value');
  const bLabel = document.getElementById('moreless-b-label');
  const bValue = document.getElementById('moreless-b-value');
  const streakEl = document.getElementById('moreless-streak');
  const recordEl = document.getElementById('moreless-record');
  const higherBtn = document.getElementById('moreless-higher');
  const lowerBtn = document.getElementById('moreless-lower');
  const buttonsEl = document.getElementById('moreless-buttons');

  function formatNumber(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function shuffleDeck() {
    deck = FACTS.slice();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  function drawFact(avoid) {
    if (deck.length === 0) shuffleDeck();
    // ensure not identical to the fact we're keeping on screen
    let idx = deck.findIndex((f) => f !== avoid);
    if (idx === -1) idx = 0;
    return deck.splice(idx, 1)[0];
  }

  function initMoreLess() {
    recordEl.textContent = Stats.get('moreless').highScore || 0;
    startGame();
  }

  function startGame() {
    clearTimers();
    shuffleDeck();
    streak = 0;
    locked = false;
    streakEl.textContent = '0';
    recordEl.textContent = Stats.get('moreless').highScore || 0;
    factA = drawFact(null);
    factB = drawFact(factA);
    renderRound();
  }

  function renderRound() {
    locked = false;
    aLabel.textContent = factA.label;
    aValue.textContent = formatNumber(factA.value);
    bLabel.textContent = factB.label;
    bValue.textContent = '?';
    bValue.classList.remove('correct', 'wrong', 'revealed');
    buttonsEl.classList.remove('hidden');
    higherBtn.disabled = false;
    lowerBtn.disabled = false;
  }

  function guess(higher) {
    if (locked) return;
    locked = true;
    higherBtn.disabled = true;
    lowerBtn.disabled = true;
    buttonsEl.classList.add('hidden');

    const correct = higher ? factB.value > factA.value : factB.value < factA.value;
    countUp(factB.value, () => {
      bValue.classList.add(correct ? 'correct' : 'wrong', 'revealed');
      if (correct) {
        streak++;
        streakEl.textContent = streak;
        vibrate(15);
        advanceTimer = setTimeout(advance, 1100);
      } else {
        vibrate([40, 60, 40]);
        advanceTimer = setTimeout(endGame, 1300);
      }
    });
  }

  function advance() {
    factA = factB;
    factB = drawFact(factA);
    renderRound();
  }

  function countUp(toValue, done) {
    const duration = 700;
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      bValue.textContent = formatNumber(toValue * eased);
      if (t < 1) {
        countTimer = requestAnimationFrame(step);
      } else {
        bValue.textContent = formatNumber(toValue);
        done();
      }
    }
    countTimer = requestAnimationFrame(step);
  }

  function endGame() {
    const prevBest = Stats.get('moreless').highScore || 0;
    const newRecord = streak > prevBest;

    Stats.record('moreless', {
      won: newRecord,
      time: 0,
      difficulty: 'normal',
      extra: { highScore: Math.max(prevBest, streak) },
    });

    const statsHtml =
      'Du klarede <b>' + streak + '</b> i træk!' +
      (newRecord
        ? '<br>🏆 Ny rekord!'
        : '<br>Rekord: <b>' + prevBest + '</b>');

    setTimeout(() => showResult(newRecord, statsHtml, 'moreless'), 300);
  }

  function clearTimers() {
    if (countTimer) cancelAnimationFrame(countTimer);
    if (advanceTimer) clearTimeout(advanceTimer);
    countTimer = null;
    advanceTimer = null;
  }

  higherBtn.onclick = () => guess(true);
  lowerBtn.onclick = () => guess(false);

  window.initMoreLess = initMoreLess;
  window.gameRestarters.moreless = function () { startGame(); };
  window.gameCleanups.moreless = function () { clearTimers(); locked = true; };
})();
