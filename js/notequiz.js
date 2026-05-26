/* ===== Gæt tonen (note identification) ===== */

(function () {
  const DIFFICULTIES = [
    { label: 'Let (3 toner)', value: 'easy' },
    { label: 'Medium (7 toner)', value: 'medium' },
    { label: 'Svær (12 toner)', value: 'hard' },
  ];
  const LABEL_MAP = { easy: 'Let', medium: 'Medium', hard: 'Svær' };

  // Equal temperament, A4 = 440 Hz. International names (B = H).
  const F = {
    'C': 261.63, 'C♯': 277.18, 'D': 293.66, 'D♯': 311.13, 'E': 329.63,
    'F': 349.23, 'F♯': 369.99, 'G': 392.00, 'G♯': 415.30, 'A': 440.00,
    'A♯': 466.16, 'B': 493.88,
  };
  const note = (n) => ({ name: n, freq: F[n] });

  const NOTE_SETS = {
    easy: ['C', 'E', 'G'].map(note),
    medium: ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(note),
    hard: ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'].map(note),
  };
  const WIN_THRESHOLD = { easy: 8, medium: 7, hard: 6 };
  const ROUND_LENGTH = 10;
  const TONE_MS = 1300;

  let level = 'easy';
  let noteSet = NOTE_SETS.easy;
  let targets = [];
  let currentIndex = 0;
  let score = 0;
  let answered = false;
  let nextTimer = null;

  const progressEl = document.getElementById('notequiz-progress');
  const scoreEl = document.getElementById('notequiz-score');
  const replayBtn = document.getElementById('notequiz-replay');
  const optionsEl = document.getElementById('notequiz-options');
  const startBtn = document.getElementById('notequiz-start');
  const diffBtn = document.getElementById('notequiz-diff-btn');

  function initNoteQuiz() {
    level = getDifficulty('notequiz') || 'easy';
    noteSet = NOTE_SETS[level] || NOTE_SETS.easy;
    diffBtn.textContent = LABEL_MAP[level] || 'Let';
    resetUI();
  }

  function resetUI() {
    if (nextTimer) clearTimeout(nextTimer);
    nextTimer = null;
    currentIndex = 0;
    score = 0;
    answered = false;
    progressEl.textContent = '0/' + ROUND_LENGTH;
    scoreEl.textContent = '0';
    optionsEl.innerHTML = '';
    optionsEl.classList.remove('active');
    replayBtn.classList.remove('active');
    startBtn.classList.remove('hidden');
    startBtn.textContent = 'Start';
  }

  function startGame() {
    noteSet = NOTE_SETS[level] || NOTE_SETS.easy;
    targets = [];
    let prev = null;
    for (let i = 0; i < ROUND_LENGTH; i++) {
      let n;
      do {
        n = noteSet[Math.floor(Math.random() * noteSet.length)];
      } while (n === prev && noteSet.length > 1);
      targets.push(n);
      prev = n;
    }
    currentIndex = 0;
    score = 0;
    scoreEl.textContent = '0';
    startBtn.classList.add('hidden');
    replayBtn.classList.add('active');
    optionsEl.classList.add('active');
    buildOptions();
    nextQuestion();
  }

  function buildOptions() {
    optionsEl.innerHTML = '';
    noteSet.forEach((n) => {
      const btn = document.createElement('button');
      btn.className = 'nq-option';
      btn.textContent = n.name;
      btn.dataset.name = n.name;
      btn.onclick = () => chooseAnswer(n, btn);
      optionsEl.appendChild(btn);
    });
  }

  function currentTarget() {
    return targets[currentIndex];
  }

  function nextQuestion() {
    answered = false;
    optionsEl.querySelectorAll('.nq-option').forEach((b) => {
      b.classList.remove('correct', 'wrong', 'disabled');
      b.disabled = false;
    });
    progressEl.textContent = (currentIndex + 1) + '/' + ROUND_LENGTH;
    setTimeout(() => playTone(currentTarget().freq, TONE_MS, 'triangle'), 250);
  }

  function chooseAnswer(chosen, btn) {
    if (answered) return;
    answered = true;
    const target = currentTarget();
    const correct = chosen.name === target.name;

    optionsEl.querySelectorAll('.nq-option').forEach((b) => {
      b.disabled = true;
      if (b.dataset.name === target.name) b.classList.add('correct');
    });
    if (!correct) btn.classList.add('wrong');

    if (correct) {
      score++;
      scoreEl.textContent = score;
      vibrate(15);
    } else {
      vibrate([30, 40, 30]);
    }

    nextTimer = setTimeout(() => {
      currentIndex++;
      if (currentIndex >= ROUND_LENGTH) {
        endGame();
      } else {
        nextQuestion();
      }
    }, correct ? 850 : 1500);
  }

  function endGame() {
    const won = score >= (WIN_THRESHOLD[level] || 7);
    replayBtn.classList.remove('active');
    optionsEl.classList.remove('active');

    Stats.record('notequiz', {
      won,
      time: 0,
      difficulty: level,
      extra: { bestScore: Math.max(Stats.get('notequiz').bestScore || 0, score) },
    });

    const statsHtml =
      'Du fik <b>' + score + ' ud af ' + ROUND_LENGTH + '</b> rigtige!' +
      (won ? '<br>Du har et godt øre 🎵' : '<br>Øvelse gør mester 🎵');

    setTimeout(() => showResult(won, statsHtml, 'notequiz'), 300);
  }

  replayBtn.onclick = () => {
    if (targets.length && currentIndex < ROUND_LENGTH) {
      playTone(currentTarget().freq, TONE_MS, 'triangle');
    }
  };
  startBtn.onclick = startGame;

  diffBtn.onclick = () => {
    showDifficultyModal('notequiz', DIFFICULTIES, (val) => {
      level = val;
      noteSet = NOTE_SETS[val] || NOTE_SETS.easy;
      diffBtn.textContent = LABEL_MAP[val] || 'Let';
      resetUI();
    });
  };

  window.initNoteQuiz = initNoteQuiz;
  window.gameRestarters.notequiz = function () { resetUI(); startGame(); };
  window.gameCleanups.notequiz = function () {
    if (nextTimer) clearTimeout(nextTimer);
    nextTimer = null;
  };
})();
