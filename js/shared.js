/* ===== Dorthe's Brain Games — Shared Systems ===== */

/* ----- Navigation ----- */

function goScreen(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  const target = document.getElementById('screen-' + name);
  if (target) target.classList.add('active');
}

function goHome() {
  if (window.gameCleanups) {
    Object.values(window.gameCleanups).forEach((fn) => fn());
  }
  goScreen('home');
}

window.gameCleanups = {};

/* ----- Difficulty ----- */

function getDifficulty(game) {
  return localStorage.getItem('bg_diff_' + game) || 'easy';
}

function setDifficulty(game, level) {
  localStorage.setItem('bg_diff_' + game, level);
}

function showDifficultyModal(game, options, onSelect) {
  const modal = document.getElementById('difficulty-modal');
  const container = modal.querySelector('.modal-options');
  const current = getDifficulty(game);

  container.innerHTML = '';
  options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'option' + (opt.value === current ? ' selected' : '');
    btn.textContent = opt.label;
    btn.onclick = () => {
      setDifficulty(game, opt.value);
      modal.classList.remove('active');
      if (onSelect) onSelect(opt.value);
    };
    container.appendChild(btn);
  });

  modal.classList.add('active');
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.remove('active');
  };
}

/* ----- Stats ----- */

const ALL_GAMES = ['lightsout', 'memory', 'minesweeper', 'wordsearch', 'nback', 'solitaire'];

const Stats = {
  get(game) {
    try {
      return JSON.parse(localStorage.getItem('bg_stats_' + game)) || {};
    } catch {
      return {};
    }
  },

  save(game, result) {
    const stats = this.get(game);
    Object.assign(stats, result);
    stats.lastPlayed = Date.now();
    localStorage.setItem('bg_stats_' + game, JSON.stringify(stats));
  },

  increment(game, key) {
    const stats = this.get(game);
    stats[key] = (stats[key] || 0) + 1;
    this.save(game, stats);
  },

  record(game, { won, time, difficulty, extra }) {
    const stats = this.get(game);
    stats.played = (stats.played || 0) + 1;
    if (won) stats.won = (stats.won || 0) + 1;
    stats.lastPlayed = Date.now();

    // Best time (only on wins with time)
    if (won && time > 0) {
      stats.bestTime = stats.bestTime ? Math.min(stats.bestTime, time) : time;
    }
    if (time > 0) {
      stats.totalTime = (stats.totalTime || 0) + time;
    }

    // Merge extra stats
    if (extra) Object.assign(stats, extra);

    // History (last 30 sessions)
    if (!stats.history) stats.history = [];
    stats.history.push({
      date: new Date().toISOString().slice(0, 10),
      won: !!won,
      time: time || 0,
      difficulty: difficulty || 'easy',
    });
    if (stats.history.length > 30) stats.history = stats.history.slice(-30);

    // Update streaks
    this._updateStreaks(stats);

    localStorage.setItem('bg_stats_' + game, JSON.stringify(stats));
  },

  _updateStreaks(stats) {
    const today = new Date().toISOString().slice(0, 10);
    if (stats._lastStreakDate === today) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (!stats.streaks) stats.streaks = { current: 0, best: 0 };

    if (stats._lastStreakDate === yesterday) {
      stats.streaks.current++;
    } else if (stats._lastStreakDate !== today) {
      stats.streaks.current = 1;
    }
    stats.streaks.best = Math.max(stats.streaks.best, stats.streaks.current);
    stats._lastStreakDate = today;
  },

  getAll() {
    const all = {};
    ALL_GAMES.forEach((g) => { all[g] = this.get(g); });
    return all;
  },

  getGlobalStreak() {
    const all = this.getAll();
    const dates = new Set();
    Object.values(all).forEach((s) => {
      if (s.history) s.history.forEach((h) => dates.add(h.date));
    });
    if (dates.size === 0) return { current: 0, best: 0 };

    const sorted = [...dates].sort().reverse();
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Current streak
    let current = 0;
    let checkDate = sorted[0] === today || sorted[0] === yesterday ? sorted[0] : null;
    if (checkDate) {
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i] === checkDate) {
          current++;
          checkDate = new Date(new Date(checkDate).getTime() - 86400000).toISOString().slice(0, 10);
        } else {
          break;
        }
      }
    }

    // Best streak
    let best = 1, streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const diff = new Date(sorted[i - 1]).getTime() - new Date(sorted[i]).getTime();
      if (diff === 86400000) {
        streak++;
        best = Math.max(best, streak);
      } else {
        streak = 1;
      }
    }

    return { current, best: Math.max(best, current) };
  },
};

/* ----- Timer ----- */

class GameTimer {
  constructor(el) {
    this.el = el;
    this.startTime = 0;
    this.elapsed = 0;
    this.running = false;
    this.interval = null;
  }

  start() {
    this.startTime = Date.now() - this.elapsed;
    this.running = true;
    this.interval = setInterval(() => this.render(), 500);
    this.render();
  }

  stop() {
    if (!this.running) return this.elapsed;
    this.elapsed = Date.now() - this.startTime;
    this.running = false;
    clearInterval(this.interval);
    return this.elapsed;
  }

  reset() {
    this.stop();
    this.elapsed = 0;
    this.render();
  }

  getElapsed() {
    if (this.running) return Date.now() - this.startTime;
    return this.elapsed;
  }

  getFormatted() {
    const totalSec = Math.floor(this.getElapsed() / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return min + ':' + String(sec).padStart(2, '0');
  }

  render() {
    if (this.el) this.el.textContent = this.getFormatted();
  }
}

/* ----- Haptic Feedback ----- */

function vibrate(ms) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

/* ----- Confetti System ----- */

function launchConfetti(duration) {
  duration = duration || 2500;
  let canvas = document.getElementById('confetti-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    document.body.appendChild(canvas);
  }
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';

  const colors = ['#4A7C59', '#6B9F78', '#C4A35A', '#E8B44F', '#D9534F', '#5BC0DE', '#7B68AE', '#FF8F6B'];
  const particles = [];
  const startTime = Date.now();

  const shapes = ['rect', 'circle', 'ribbon'];
  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width * 0.3 + Math.random() * canvas.width * 0.4,
      y: -20 - Math.random() * canvas.height * 0.3,
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * 3 + 1.5,
      w: Math.random() * 10 + 5,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 10,
      wobble: Math.random() * Math.PI * 2,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    });
  }

  function animate() {
    const elapsed = Date.now() - startTime;
    const fade = elapsed > duration - 500 ? Math.max(0, (duration - elapsed) / 500) : 1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = fade;

    particles.forEach((p) => {
      p.x += p.vx + Math.sin(p.wobble) * 0.7;
      p.y += p.vy;
      p.rot += p.rotV;
      p.wobble += 0.06;
      p.vy += 0.025; // gravity

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'ribbon') {
        ctx.fillRect(-p.w / 2, -1, p.w, 3);
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }

      ctx.restore();
    });

    if (elapsed < duration) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = 'none';
    }
  }

  requestAnimationFrame(animate);
}

/* ----- Family Quotes ----- */

const FAMILY_QUOTES = {
  win: [
    { text: 'Godt gået, skat!', author: 'Jan' },
    { text: 'Du er simpelthen for dygtig!', author: 'Jan' },
    { text: 'Imponerende, Dorthe!', author: 'Jan' },
    { text: 'Jeg vidste, du kunne klare det!', author: 'Jan' },
    { text: 'Min kone er den klogeste!', author: 'Jan' },

    { text: 'Ingen kan slå min mor!', author: 'Mathias' },
    { text: 'Stærkt klaret, mor!', author: 'Mathias' },
    { text: 'Du gør det fantastisk!', author: 'Mathias' },
    { text: 'Mor, du er en legende!', author: 'Mathias' },
    { text: 'Respekt, mor! Det var flot!', author: 'Mathias' },

    { text: 'Sejt, mor! Du er den bedste!', author: 'Justine' },
    { text: 'Wauw, det var hurtigt!', author: 'Justine' },
    { text: 'Mor, du er alt for god til det her!', author: 'Justine' },
    { text: 'Tillykke! Det fortjener du!', author: 'Justine' },
    { text: 'Du er min helt, mor!', author: 'Justine' },

    { text: 'Woof! Woof woof! 🐾', author: 'Amigo 🐕' },
    { text: '*Logrer vildt med halen*', author: 'Amigo 🐕' },
    { text: '*Hopper op og slikker dig i ansigtet*', author: 'Amigo 🐕' },
    { text: 'Vansen! Vuf vuf!', author: 'Amigo 🐕' },
    { text: '*Ruller rundt af glæde*', author: 'Amigo 🐕' },

    { text: 'Farmor, du er for sej!', author: 'Emil' },
    { text: 'Wauw farmor, godt klaret!', author: 'Emil' },
    { text: 'Farmor er den bedste til spil!', author: 'Emil' },
    { text: 'Kan du lære mig det, farmor?', author: 'Emil' },
    { text: 'Farmor vinder altid!', author: 'Emil' },

    { text: 'Flot, farmor! Du er så dygtig!', author: 'Iben' },
    { text: 'Farmor, du er skarpere end os alle!', author: 'Iben' },
    { text: 'Tillykke farmor!', author: 'Iben' },
    { text: 'Farmor er verdens bedste!', author: 'Iben' },
    { text: 'Jeg er så stolt af dig, farmor!', author: 'Iben' },

    { text: 'Mormor, du er en stjerne!', author: 'Karlton' },
    { text: 'Godt gået, mormor!', author: 'Karlton' },
    { text: 'Mormor er den klogeste!', author: 'Karlton' },
    { text: 'Wauw mormor, det var vildt!', author: 'Karlton' },
    { text: 'Mormor kan alt!', author: 'Karlton' },

    { text: 'Farmor, du er fantastisk!', author: 'Felix' },
    { text: 'Mega sejt, farmor!', author: 'Felix' },
    { text: 'Farmor er nummer ét!', author: 'Felix' },
    { text: 'Du gjorde det, farmor!', author: 'Felix' },
    { text: 'Farmor er en mester!', author: 'Felix' },

    { text: 'Hurra for farmor!', author: 'Roberta' },
    { text: 'Farmor, du er magisk!', author: 'Roberta' },
    { text: 'Jeg vil være lige så dygtig som farmor!', author: 'Roberta' },
    { text: 'Farmor klarer det hele!', author: 'Roberta' },
    { text: 'Du er den sødeste og klogeste farmor!', author: 'Roberta' },
  ],

  lose: [
    { text: 'Bare prøv igen, skat — du kan godt!', author: 'Jan' },
    { text: 'Det er jo bare et spil — du er stadig den bedste!', author: 'Jan' },
    { text: 'Næste gang klarer du det!', author: 'Jan' },
    { text: 'Øvelse gør mester, Dorthe!', author: 'Jan' },
    { text: 'Du var tæt på — én gang til!', author: 'Jan' },

    { text: 'Bare prøv igen, mor — du kan godt!', author: 'Mathias' },
    { text: 'Det er sådan man lærer, mor!', author: 'Mathias' },
    { text: 'Giv ikke op, mor! Du er tæt på!', author: 'Mathias' },
    { text: 'Næste runde bliver din, mor!', author: 'Mathias' },
    { text: 'Mor, du er modig bare ved at prøve!', author: 'Mathias' },

    { text: 'Kom igen, mor — du klarer det!', author: 'Justine' },
    { text: 'Husk: det handler om at have det sjovt!', author: 'Justine' },
    { text: 'Du er tættere på end du tror, mor!', author: 'Justine' },
    { text: 'Én gang til, mor — jeg tror på dig!', author: 'Justine' },
    { text: 'Det vigtigste er at du prøver, mor!', author: 'Justine' },

    { text: '*Lægger hovedet i dit skød*', author: 'Amigo 🐕' },
    { text: 'Vansen! *Putter sig op ad dig*', author: 'Amigo 🐕' },
    { text: '*Kigger på dig med store øjne*', author: 'Amigo 🐕' },
    { text: 'Woof! *Henter din bold*', author: 'Amigo 🐕' },
    { text: '*Logrer opmuntrende med halen*', author: 'Amigo 🐕' },

    { text: 'Bare prøv igen, farmor!', author: 'Emil' },
    { text: 'Farmor, du er stadig den bedste!', author: 'Emil' },
    { text: 'Næste gang vinder du, farmor!', author: 'Emil' },
    { text: 'Det gør ikke noget, farmor!', author: 'Emil' },
    { text: 'Farmor, vil du prøve igen med mig?', author: 'Emil' },

    { text: 'Du er stadig sej, farmor!', author: 'Iben' },
    { text: 'Farmor, jeg tror på dig!', author: 'Iben' },
    { text: 'Prøv igen, farmor — du kan godt!', author: 'Iben' },
    { text: 'Farmor er stadig min favorit!', author: 'Iben' },
    { text: 'Det gør ikke noget — vi prøver igen!', author: 'Iben' },

    { text: 'Mormor, du klarer det næste gang!', author: 'Karlton' },
    { text: 'Mormor, jeg tror på dig!', author: 'Karlton' },
    { text: 'Prøv igen, mormor! Du er sej!', author: 'Karlton' },
    { text: 'Mormor er stadig den bedste!', author: 'Karlton' },
    { text: 'Giv ikke op, mormor!', author: 'Karlton' },

    { text: 'Næste gang klarer du det helt sikkert, farmor!', author: 'Felix' },
    { text: 'Farmor, du er modig!', author: 'Felix' },
    { text: 'Prøv igen, farmor — jeg hepper!', author: 'Felix' },
    { text: 'Farmor, det var et godt forsøg!', author: 'Felix' },
    { text: 'Du kan godt, farmor!', author: 'Felix' },

    { text: 'Du er stadig den klogeste farmor!', author: 'Roberta' },
    { text: 'Farmor, en gang til!', author: 'Roberta' },
    { text: 'Jeg elsker dig, farmor — prøv igen!', author: 'Roberta' },
    { text: 'Farmor klarer det næste gang!', author: 'Roberta' },
    { text: 'Vi tror alle sammen på dig, farmor!', author: 'Roberta' },
  ],
};

let lastQuoteIndex = { win: -1, lose: -1 };

function getRandomQuote(won) {
  const type = won ? 'win' : 'lose';
  const quotes = FAMILY_QUOTES[type];
  let idx;
  do {
    idx = Math.floor(Math.random() * quotes.length);
  } while (idx === lastQuoteIndex[type] && quotes.length > 1);
  lastQuoteIndex[type] = idx;
  return quotes[idx];
}

/* ----- Result Overlay ----- */

function showResult(won, statsHtml, game) {
  const overlay = document.getElementById('result-overlay');
  const quote = getRandomQuote(won);

  // Launch confetti on win
  if (won) {
    launchConfetti(3000);
    vibrate([50, 50, 50, 50, 100]);
  }

  overlay.querySelector('.result-emoji').textContent = won ? '🎉' : '💪';
  overlay.querySelector('.result-title').textContent = won ? 'Tillykke!' : 'Godt forsøg!';
  overlay.querySelector('.result-stats').innerHTML = statsHtml;
  var quotePhoto = overlay.querySelector('.result-quote-photo');
  if (quote.author === 'Jan') {
    quotePhoto.classList.add('visible');
  } else {
    quotePhoto.classList.remove('visible');
  }
  overlay.querySelector('.result-quote').textContent = '«' + quote.text + '»';
  overlay.querySelector('.result-quote-author').textContent = '— ' + quote.author;

  const buttons = overlay.querySelector('.result-buttons');
  buttons.innerHTML = '';

  const againBtn = document.createElement('button');
  againBtn.className = 'btn btn-primary';
  againBtn.textContent = 'Spil igen';
  againBtn.onclick = () => {
    overlay.classList.remove('active');
    if (window.gameRestarters && window.gameRestarters[game]) {
      window.gameRestarters[game]();
    }
  };

  const homeBtn = document.createElement('button');
  homeBtn.className = 'btn btn-secondary';
  homeBtn.textContent = 'Hjem';
  homeBtn.onclick = () => {
    overlay.classList.remove('active');
    goHome();
  };

  buttons.appendChild(againBtn);
  buttons.appendChild(homeBtn);
  overlay.classList.add('active');
}

/* ----- Game Restarters Registry ----- */

window.gameRestarters = {};

/* ----- Home Screen Rendering ----- */

const GAME_DEFS = [
  { id: 'lightsout', icon: '💡', name: 'Lights Out', desc: 'Sluk alle lysene', init: 'initLightsOut' },
  { id: 'memory', icon: '🃏', name: 'Vendespil', desc: 'Find alle par', init: 'initMemory' },
  { id: 'minesweeper', icon: '💣', name: 'Minerydder', desc: 'Undgå minerne', init: 'initMinesweeper' },
  { id: 'wordsearch', icon: '🔤', name: 'Ordsjagt', desc: 'Find de skjulte ord', init: 'initWordSearch' },
  { id: 'nback', icon: '🧠', name: 'N-Back', desc: 'Træn din hukommelse', init: 'initNBack' },
  { id: 'solitaire', icon: '♠️', name: 'Kabale', desc: 'Klassisk kortspil', init: 'initSolitaire' },
];

function formatTimeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Lige nu';
  if (mins < 60) return mins + ' min siden';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + (hours === 1 ? ' time' : ' timer') + ' siden';
  const days = Math.floor(hours / 24);
  if (days === 1) return 'I går';
  if (days < 7) return days + ' dage siden';
  const weeks = Math.floor(days / 7);
  return weeks + (weeks === 1 ? ' uge' : ' uger') + ' siden';
}

function formatTime(ms) {
  if (!ms) return '';
  const sec = Math.floor(ms / 1000);
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}

function renderHomeScreen() {
  const grid = document.querySelector('.game-grid');
  if (!grid) return;
  grid.innerHTML = '';

  GAME_DEFS.forEach((game) => {
    const stats = Stats.get(game.id);
    const btn = document.createElement('button');
    btn.className = 'game-card';
    btn.onclick = () => { goScreen(game.id); window[game.init](); };

    let statLine = '';
    if (stats.lastPlayed) {
      const parts = [];
      if (stats.won) parts.push('Vundet: ' + stats.won);
      if (stats.bestTime) parts.push('Bedste: ' + formatTime(stats.bestTime));
      statLine = '<span class="game-stat">' +
        formatTimeAgo(stats.lastPlayed) +
        (parts.length ? ' · ' + parts.join(' · ') : '') +
        '</span>';
    }

    btn.innerHTML =
      '<span class="game-icon">' + game.icon + '</span>' +
      '<span class="game-name">' + game.name + '</span>' +
      '<span class="game-desc">' + game.desc + '</span>' +
      statLine;

    grid.appendChild(btn);
  });

  // Stats page link
  const statsLink = document.createElement('button');
  statsLink.className = 'stats-link-btn';
  statsLink.innerHTML = '📊 Se dine resultater';
  statsLink.onclick = () => { goScreen('stats'); renderStatsPage(); };
  grid.parentElement.appendChild(statsLink);
}

// Re-render home screen stats when returning home
const _originalGoHome = goHome;
goHome = function () {
  _originalGoHome();
  renderHomeScreen();
};

/* ----- PWA Registration ----- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// Initial home render
document.addEventListener('DOMContentLoaded', renderHomeScreen);
