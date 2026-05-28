/* ===== Dorthes have — background music (calm pads + synth nature) =====
 * All synthesized via Web Audio (no files). A slow, consonant chord progression of soft
 * pad swells + a sparse nature layer (gentle bird chirps and breeze). Low volume, never
 * harsh, through a master gain → limiter. Mute is persisted; start() must be called from a
 * user gesture (iOS). See gamedev-kb audio-web-audio.
 */
(function (root) {
  'use strict';
  const KEY = 'bg_garden_music';
  const VOL = 0.16;
  // I–V–vi–IV in C, voiced low and warm; every triad is consonant so swells never clash.
  const CHORDS = [
    [261.63, 329.63, 392.00], // C
    [196.00, 246.94, 293.66], // G
    [220.00, 261.63, 329.63], // Am
    [174.61, 220.00, 261.63], // F
  ];

  let ctx = null, master = null, running = false, chordTimer = 0, natureTimer = 0, chordI = 0, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch {}

  function setup() {
    ctx = (typeof getAudioCtx === 'function') ? getAudioCtx() : null;
    if (!ctx) return null;
    if (!master || master.context !== ctx) {
      master = ctx.createGain();
      master.gain.value = muted ? 0 : VOL;
      const lim = ctx.createDynamicsCompressor();
      lim.threshold.value = -14; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.003; lim.release.value = 0.25;
      master.connect(lim).connect(ctx.destination);
    }
    return ctx;
  }

  function noise() {
    if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
    const len = Math.floor(ctx.sampleRate * 1.2);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  // one soft pad chord that swells in and out over ~6s
  function pad(freqs) {
    const now = ctx.currentTime;
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'triangle' : 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.16, now + 2.4);   // slow attack
      g.gain.setValueAtTime(0.16, now + 3.6);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 6.0); // slow release
      o.connect(g).connect(master);
      o.start(now); o.stop(now + 6.2);
    });
  }

  function chordTick() {
    if (!running) return;
    pad(CHORDS[chordI % CHORDS.length]); chordI++;
    chordTimer = setTimeout(chordTick, 5200);
  }

  function bird() {
    const now = ctx.currentTime;
    const base = 1700 + Math.random() * 1300;
    const n = 2 + Math.floor(Math.random() * 2);
    for (let k = 0; k < n; k++) {
      const t = now + k * 0.13;
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(base * (1 + 0.08 * k), t);
      o.frequency.exponentialRampToValueAtTime(base * 0.7, t + 0.08);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      o.connect(g).connect(master); o.start(t); o.stop(t + 0.13);
    }
  }

  function breeze() {
    const now = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noise();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(0.04, now + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    src.connect(lp).connect(g).connect(master); src.start(now); src.stop(now + 1.25);
  }

  function natureTick() {
    if (!running) return;
    if (Math.random() < 0.6) bird(); else breeze();
    natureTimer = setTimeout(natureTick, 3500 + Math.random() * 4500);
  }

  function start() {
    if (running) return;
    if (!setup()) return;
    running = true;
    master.gain.value = muted ? 0 : VOL;
    chordI = 0;
    chordTick();
    natureTimer = setTimeout(natureTick, 1800);
  }
  function stop() { running = false; clearTimeout(chordTimer); clearTimeout(natureTimer); }
  function toggle() {
    muted = !muted;
    try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch {}
    if (master && ctx) master.gain.linearRampToValueAtTime(muted ? 0 : VOL, ctx.currentTime + 0.3);
    return muted;
  }

  root.GardenMusic = { start, stop, toggle, isMuted: () => muted, isRunning: () => running };
})(typeof globalThis !== 'undefined' ? globalThis : this);
