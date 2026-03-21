/* ===== N-Back ===== */

(function () {
  const STIMULI = ['🍎', '🌸', '⭐', '🐱', '🌲', '🎵', '💧', '🔥'];

  const DIFFICULTIES = [
    { label: '1-back (Let)', value: '1' },
    { label: '2-back (Medium)', value: '2' },
    { label: '3-back (Svær)', value: '3' },
  ];

  const LABEL_MAP = { '1': '1-back', '2': '2-back', '3': '3-back' };
  const DESC_MAP = {
    '1': 'Tryk Match når symbolet er det samme som for 1 trin siden',
    '2': 'Tryk Match når symbolet er det samme som for 2 trin siden',
    '3': 'Tryk Match når symbolet er det samme som for 3 trin siden',
  };
  const LEVEL_CONFIG = {
    '1': { length: 20, showMs: 2500, winThreshold: 80 },
    '2': { length: 25, showMs: 2000, winThreshold: 70 },
    '3': { length: 30, showMs: 1800, winThreshold: 60 },
  };
  const GAP_MS = 500;

  let nLevel = 1;
  let sequence = [];
  let currentIndex = -1;
  let responded = false;
  let results = [];
  let running = false;
  let timeoutId = null;

  const displayEl = document.getElementById('nback-display');
  const matchBtn = document.getElementById('nback-match-btn');
  const startBtn = document.getElementById('nback-start-btn');
  const progressEl = document.getElementById('nback-progress');
  const scoreEl = document.getElementById('nback-score');
  const diffBtn = document.getElementById('nback-diff-btn');

  // Create progress bar and description dynamically
  let progressBar = null;
  let progressFill = null;
  let levelDesc = null;

  function ensureUI() {
    const area = displayEl.parentElement;
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.className = 'nback-progress-bar';
      progressFill = document.createElement('div');
      progressFill.className = 'nback-progress-fill';
      progressFill.style.width = '0%';
      progressBar.appendChild(progressFill);
      area.insertBefore(progressBar, displayEl);
    }
    if (!levelDesc) {
      levelDesc = document.createElement('div');
      levelDesc.className = 'nback-level-desc';
      area.insertBefore(levelDesc, startBtn);
    }
  }

  function initNBack() {
    const diff = getDifficulty('nback') || '1';
    nLevel = parseInt(diff) || 1;
    diffBtn.textContent = LABEL_MAP[diff] || '1-back';
    ensureUI();
    resetUI();
  }

  function resetUI() {
    running = false;
    currentIndex = -1;
    results = [];
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;

    displayEl.textContent = '';
    displayEl.classList.add('empty');
    displayEl.classList.remove('flash-correct', 'flash-wrong', 'show');
    matchBtn.classList.remove('visible', 'pressed');
    startBtn.classList.remove('hidden');
    const seqLen = LEVEL_CONFIG[nLevel] ? LEVEL_CONFIG[nLevel].length : 25;
    progressEl.textContent = '0/' + seqLen;
    scoreEl.textContent = '0';
    if (progressFill) progressFill.style.width = '0%';
    if (levelDesc) levelDesc.textContent = DESC_MAP[nLevel] || DESC_MAP['1'];
  }

  function getConfig() {
    return LEVEL_CONFIG[nLevel] || LEVEL_CONFIG['1'];
  }

  function generateSequence() {
    sequence = [];
    const seqLen = getConfig().length;
    const matchTarget = Math.floor(seqLen * 0.33);
    let matches = 0;

    for (let i = 0; i < seqLen; i++) {
      if (i >= nLevel && matches < matchTarget && Math.random() < 0.4) {
        sequence.push(sequence[i - nLevel]);
        matches++;
      } else {
        let s;
        do {
          s = STIMULI[Math.floor(Math.random() * STIMULI.length)];
        } while (i >= nLevel && s === sequence[i - nLevel]);
        sequence.push(s);
      }
    }
  }

  function startGame() {
    ensureUI();
    generateSequence();
    results = [];
    currentIndex = -1;
    running = true;
    responded = false;

    startBtn.classList.add('hidden');
    matchBtn.classList.add('visible');
    matchBtn.classList.remove('pressed');
    scoreEl.textContent = '0';
    if (levelDesc) levelDesc.textContent = '';

    showNext();
  }

  function showNext() {
    if (!running) return;
    currentIndex++;

    if (currentIndex >= getConfig().length) {
      endGame();
      return;
    }

    responded = false;
    matchBtn.classList.remove('pressed');
    displayEl.classList.remove('empty', 'flash-correct', 'flash-wrong', 'show');

    // Small delay then show stimulus with animation
    void displayEl.offsetWidth; // trigger reflow
    displayEl.textContent = sequence[currentIndex];
    displayEl.classList.add('show');

    const cfg = getConfig();
    progressEl.textContent = (currentIndex + 1) + '/' + cfg.length;
    if (progressFill) {
      progressFill.style.width = ((currentIndex + 1) / cfg.length * 100) + '%';
    }

    timeoutId = setTimeout(() => {
      evaluateCurrent();
      displayEl.textContent = '';
      displayEl.classList.remove('show');
      displayEl.classList.add('empty');

      timeoutId = setTimeout(showNext, GAP_MS);
    }, cfg.showMs);
  }

  function evaluateCurrent() {
    const isMatch = currentIndex >= nLevel &&
                    sequence[currentIndex] === sequence[currentIndex - nLevel];

    const correct = (isMatch && responded) || (!isMatch && !responded);
    results.push({ index: currentIndex, isMatch, responded, correct });

    if (responded || isMatch) {
      displayEl.classList.add(correct ? 'flash-correct' : 'flash-wrong');
    }

    updateScore();
  }

  function updateScore() {
    const correctCount = results.filter((r) => r.correct).length;
    scoreEl.textContent = correctCount;
  }

  function handleMatch() {
    if (!running || responded || currentIndex < 0) return;
    responded = true;
    matchBtn.classList.add('pressed');
    vibrate(15);
  }

  function endGame() {
    running = false;
    matchBtn.classList.remove('visible');

    const total = results.length;
    const correct = results.filter((r) => r.correct).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const hits = results.filter((r) => r.isMatch && r.responded).length;
    const totalMatches = results.filter((r) => r.isMatch).length;

    const won = accuracy >= getConfig().winThreshold;

    Stats.record('nback', {
      won,
      time: 0,
      difficulty: nLevel.toString(),
      extra: { bestAccuracy: Math.max(Stats.get('nback').bestAccuracy || 0, accuracy) },
    });

    setTimeout(() => {
      showResult(
        won,
        'Præcision: ' + accuracy + '%<br>Korrekte: ' + correct + '/' + total +
        '<br>Matches fundet: ' + hits + '/' + totalMatches,
        'nback'
      );
    }, 300);
  }

  matchBtn.onclick = handleMatch;
  startBtn.onclick = startGame;

  diffBtn.onclick = () => {
    showDifficultyModal('nback', DIFFICULTIES, (val) => {
      nLevel = parseInt(val) || 1;
      diffBtn.textContent = LABEL_MAP[val] || '1-back';
      resetUI();
    });
  };

  window.initNBack = initNBack;
  window.gameRestarters.nback = function () { resetUI(); };
  window.gameCleanups.nback = function () {
    running = false;
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;
  };
})();
