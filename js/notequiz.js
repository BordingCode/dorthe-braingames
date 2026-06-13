/* ===== Gæt tonen (relative pitch: higher / lower than a reference) ===== */

(function () {
  const DIFFICULTIES = [
    { label: 'Let (store spring)', value: 'easy' },
    { label: 'Medium', value: 'medium' },
    { label: 'Svær (små spring)', value: 'hard' },
  ];
  const LABEL_MAP = { easy: 'Let', medium: 'Medium', hard: 'Svær' };

  // Equal temperament, A4 = 440 Hz. A comfortable middle range to listen to.
  const F = {
    'C': 261.63, 'C♯': 277.18, 'D': 293.66, 'D♯': 311.13, 'E': 329.63,
    'F': 349.23, 'F♯': 369.99, 'G': 392.00, 'G♯': 415.30, 'A': 440.00,
    'A♯': 466.16, 'B': 493.88, 'C2': 523.25,
  };
  // The scale we step through. Reference tone is always C; the second tone is
  // chosen a number of steps above or below.
  const SCALE = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B', 'C2'];
  const REF_INDEX = 0; // 'C'

  // Minimum gap between the two tones, in semitone steps. Bigger = easier.
  const MIN_STEP = { easy: 4, medium: 2, hard: 1 };
  const MAX_STEP = 7;

  const WIN_THRESHOLD = { easy: 7, medium: 7, hard: 6 };
  const ROUND_LENGTH = 10;
  const TONE_MS = 1100;
  const GAP_MS = 550; // pause between reference tone and the mystery tone

  let level = 'easy';
  let questions = [];
  let currentIndex = 0;
  let score = 0;
  let answered = false;
  let nextTimer = null;
  let playTimer = null;
  let seqTimers = [];
  let activeVoice = null;

  // Local synth: a single voice, gently faded out before retriggering so
  // replayed/overlapping notes never clash or click.
  function playNote(freq) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    stopVoice();
    const now = ctx.currentTime;
    const dur = TONE_MS / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.03);
    gain.gain.setValueAtTime(0.22, now + Math.max(0.06, dur - 0.18));
    gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.05);
    activeVoice = { osc, gain };
    osc.onended = () => { if (activeVoice && activeVoice.osc === osc) activeVoice = null; };
  }

  function stopVoice() {
    if (!activeVoice) return;
    const ctx = getAudioCtx();
    const v = activeVoice;
    activeVoice = null;
    try {
      const t = ctx ? ctx.currentTime : 0;
      v.gain.gain.cancelScheduledValues(t);
      v.gain.gain.setValueAtTime(Math.max(v.gain.gain.value, 0.0008), t);
      v.gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.04);
      v.osc.stop(t + 0.06);
    } catch (e) { /* already stopped */ }
  }

  // Play the reference tone, then after a gentle pause the mystery tone.
  function playPair(q) {
    clearSeqTimers();
    playNote(F[SCALE[REF_INDEX]]);
    seqTimers.push(setTimeout(() => {
      playNote(F[SCALE[q.targetIndex]]);
    }, TONE_MS + GAP_MS));
  }

  function clearSeqTimers() {
    seqTimers.forEach(clearTimeout);
    seqTimers = [];
  }

  function clearTimers() {
    if (nextTimer) clearTimeout(nextTimer);
    if (playTimer) clearTimeout(playTimer);
    nextTimer = null;
    playTimer = null;
    clearSeqTimers();
  }

  const progressEl = document.getElementById('notequiz-progress');
  const scoreEl = document.getElementById('notequiz-score');
  const replayBtn = document.getElementById('notequiz-replay');
  const optionsEl = document.getElementById('notequiz-options');
  const startBtn = document.getElementById('notequiz-start');
  const diffBtn = document.getElementById('notequiz-diff-btn');

  function initNoteQuiz() {
    level = getDifficulty('notequiz') || 'easy';
    diffBtn.textContent = LABEL_MAP[level] || 'Let';
    resetUI();
  }

  function resetUI() {
    clearTimers();
    stopVoice();
    currentIndex = 0;
    score = 0;
    answered = false;
    progressEl.textContent = '0/' + ROUND_LENGTH;
    scoreEl.textContent = '0';
    optionsEl.innerHTML = '';
    optionsEl.classList.remove('active');
    replayBtn.classList.remove('active');
    replayBtn.textContent = '🔊 Hør tonerne';
    startBtn.classList.remove('hidden');
    startBtn.textContent = 'Start';
  }

  function startGame() {
    getAudioCtx(); // unlock/resume audio within the Start gesture (iOS)
    clearTimers();
    const minStep = MIN_STEP[level] || 4;
    questions = [];
    for (let i = 0; i < ROUND_LENGTH; i++) {
      const dir = Math.random() < 0.5 ? -1 : 1; // -1 = lower, +1 = higher
      const step = minStep + Math.floor(Math.random() * (MAX_STEP - minStep + 1));
      let idx = REF_INDEX + dir * step;
      idx = Math.max(0, Math.min(SCALE.length - 1, idx));
      // If clamping landed us on the reference, nudge it away.
      if (idx === REF_INDEX) idx = REF_INDEX + minStep;
      const higher = idx > REF_INDEX;
      questions.push({ targetIndex: idx, higher });
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
    [
      { label: 'Højere ⬆', val: true },
      { label: 'Lavere ⬇', val: false },
    ].forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'nq-option';
      btn.textContent = opt.label;
      btn.dataset.higher = opt.val ? '1' : '0';
      btn.onclick = () => chooseAnswer(opt.val, btn);
      optionsEl.appendChild(btn);
    });
  }

  function currentQuestion() {
    return questions[currentIndex];
  }

  function nextQuestion() {
    answered = false;
    optionsEl.querySelectorAll('.nq-option').forEach((b) => {
      b.classList.remove('correct', 'wrong', 'disabled');
      b.disabled = false;
    });
    progressEl.textContent = (currentIndex + 1) + '/' + ROUND_LENGTH;
    if (playTimer) clearTimeout(playTimer);
    playTimer = setTimeout(() => { playTimer = null; playPair(currentQuestion()); }, 250);
  }

  function chooseAnswer(chosenHigher, btn) {
    if (answered) return;
    answered = true;
    const q = currentQuestion();
    const correct = chosenHigher === q.higher;

    optionsEl.querySelectorAll('.nq-option').forEach((b) => {
      b.disabled = true;
      if ((b.dataset.higher === '1') === q.higher) b.classList.add('correct');
    });
    if (!correct) btn.classList.add('wrong');

    if (correct) {
      score++;
      scoreEl.textContent = score;
      vibrate(15);
    } else {
      vibrate(20);
    }

    nextTimer = setTimeout(() => {
      currentIndex++;
      if (currentIndex >= ROUND_LENGTH) {
        endGame();
      } else {
        nextQuestion();
      }
    }, correct ? 850 : 1400);
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

    nextTimer = setTimeout(() => { nextTimer = null; showResult(won, statsHtml, 'notequiz'); }, 300);
  }

  replayBtn.onclick = () => {
    if (questions.length && currentIndex < ROUND_LENGTH) {
      playPair(currentQuestion());
    }
  };
  startBtn.onclick = startGame;

  diffBtn.onclick = () => {
    showDifficultyModal('notequiz', DIFFICULTIES, (val) => {
      level = val;
      diffBtn.textContent = LABEL_MAP[val] || 'Let';
      resetUI();
    });
  };

  window.initNoteQuiz = initNoteQuiz;
  window.gameRestarters.notequiz = function () { resetUI(); startGame(); };
  window.gameCleanups.notequiz = function () {
    clearTimers();
    stopVoice();
  };
})();
