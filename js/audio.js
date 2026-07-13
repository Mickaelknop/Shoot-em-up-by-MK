// Moteur audio 100 % Web Audio : effets chiptune synthétisés + musique séquencée.
import { getMuted, setMuted } from './storage.js';

let ctx = null;
let master = null;
let sfxGain = null;
let musicGain = null;
let muted = getMuted();

function ensureCtx() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(ctx.destination);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = 0.55;
  sfxGain.connect(master);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.34;
  musicGain.connect(master);
}

// À appeler sur le premier geste utilisateur (contrainte iOS/Android).
export function unlockAudio() {
  ensureCtx();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function isMuted() { return muted; }

export function toggleMute() {
  muted = !muted;
  setMuted(muted);
  if (master) master.gain.value = muted ? 0 : 1;
  return muted;
}

/* ---------------- Effets sonores ---------------- */

function env(gainNode, t0, peak, decay) {
  const g = gainNode.gain;
  g.cancelScheduledValues(t0);
  g.setValueAtTime(0.0001, t0);
  g.exponentialRampToValueAtTime(peak, t0 + 0.008);
  g.exponentialRampToValueAtTime(0.0001, t0 + decay);
}

function osc(type, freq, t0, dur, peak, freqEnd) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
  env(g, t0, peak, dur);
  o.connect(g).connect(sfxGain);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

let noiseBuf = null;
function noise(t0, dur, peak, filterFreq, filterEnd) {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(filterFreq, t0);
  if (filterEnd) f.frequency.exponentialRampToValueAtTime(filterEnd, t0 + dur);
  const g = ctx.createGain();
  env(g, t0, peak, dur);
  src.connect(f).connect(g).connect(sfxGain);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

let lastShot = 0;
export const sfx = {
  shoot() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    if (t - lastShot < 0.045) return; // évite la saturation
    lastShot = t;
    osc('square', 880, t, 0.07, 0.12, 320);
  },
  enemyHit() {
    if (!ctx || muted) return;
    noise(ctx.currentTime, 0.06, 0.16, 3200, 900);
  },
  explosion() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    noise(t, 0.42, 0.5, 2400, 120);
    osc('sine', 130, t, 0.35, 0.5, 40);
  },
  bigExplosion() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    noise(t, 1.1, 0.7, 2000, 60);
    osc('sine', 90, t, 0.9, 0.7, 28);
    osc('sawtooth', 55, t + 0.05, 0.7, 0.25, 20);
  },
  playerHit() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    osc('sawtooth', 620, t, 0.34, 0.4, 60);
    noise(t, 0.3, 0.35, 2600, 200);
  },
  shieldHit() {
    if (!ctx || muted) return;
    osc('triangle', 1400, ctx.currentTime, 0.18, 0.3, 500);
  },
  powerup() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1046].forEach((f, i) => osc('square', f, t + i * 0.07, 0.12, 0.2));
  },
  extraLife() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => osc('square', f, t + i * 0.09, 0.16, 0.22));
  },
  alarm() {
    // Sonnerie de réveil : trilles aiguës rapides (niveau Bedroom Dimension)
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      osc('square', i % 2 ? 1760 : 2093, t + i * 0.09, 0.07, 0.16);
    }
  },
  smartBomb() {
    // Télécommande : gros zap qui balaie l'écran
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    osc('sawtooth', 1200, t, 0.5, 0.4, 80);
    noise(t, 0.55, 0.45, 5000, 300);
  },
  bossWarning() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      osc('sawtooth', 220, t + i * 0.5, 0.4, 0.3, 210);
      osc('sawtooth', 226, t + i * 0.5, 0.4, 0.3, 214);
    }
  },
};

/* ---------------- Musique séquencée ---------------- */
// Séquenceur pas-à-pas 16 double-croches, look-ahead scheduling.

const SONGS = {
  stage: {
    bpm: 132,
    // notes MIDI (0 = silence)
    bass:  [33, 0, 33, 0, 36, 0, 33, 0, 31, 0, 31, 0, 38, 0, 36, 0],
    arp:   [57, 60, 64, 60, 57, 60, 64, 67, 55, 59, 62, 59, 55, 59, 62, 66],
    lead:  [0, 0, 69, 0, 67, 0, 64, 0, 0, 0, 62, 0, 64, 0, 67, 0],
    hat:   [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
  },
  boss: {
    bpm: 158,
    bass:  [31, 31, 0, 31, 34, 0, 31, 0, 29, 29, 0, 29, 37, 0, 36, 0],
    arp:   [55, 58, 62, 58, 55, 58, 62, 65, 53, 56, 60, 56, 53, 56, 60, 63],
    lead:  [67, 0, 0, 65, 0, 63, 0, 0, 62, 0, 0, 63, 65, 0, 63, 62],
    hat:   [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1],
  },
  // Niveau 2 : marche spatiale originale, sombre et martiale (sol mineur).
  stage2: {
    bpm: 140,
    bass:  [31, 0, 31, 31, 0, 31, 0, 34, 36, 0, 36, 36, 0, 38, 0, 39],
    arp:   [55, 58, 62, 58, 55, 58, 62, 58, 60, 63, 67, 63, 62, 66, 69, 66],
    lead:  [0, 0, 67, 0, 66, 0, 0, 63, 0, 62, 0, 0, 58, 0, 62, 0],
    hat:   [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
  },
  // Niveau 3 : Bedroom Dimension — sautillant, majeur, délirant (do majeur,
  // basse qui rebondit + lead guilleret, esprit Parodius/TwinBee).
  stage3: {
    bpm: 150,
    bass:  [36, 0, 43, 0, 36, 0, 43, 41, 33, 0, 40, 0, 35, 0, 41, 43],
    arp:   [60, 64, 67, 64, 60, 64, 67, 72, 57, 60, 64, 60, 59, 62, 65, 67],
    lead:  [72, 0, 76, 0, 79, 76, 72, 0, 74, 0, 71, 0, 72, 74, 76, 0],
    hat:   [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1],
  },
};

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

let musicTimer = null;
let song = null;
let step = 0;
let nextTime = 0;

function scheduleStep(t) {
  const s = SONGS[song];
  const dur = 60 / s.bpm / 4;
  const play = (type, note, oct, peak, d) => {
    if (!note) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = midi(note + oct * 12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(musicGain);
    o.start(t);
    o.stop(t + d + 0.03);
  };
  play('triangle', s.bass[step], 0, 0.5, dur * 1.8);
  play('square', s.arp[step], 0, 0.14, dur * 0.9);
  play('square', s.lead[step], 1, 0.11, dur * 1.6);
  if (s.hat[step]) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf || (noiseBuf = (() => {
      const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return b;
    })());
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    src.connect(f).connect(g).connect(musicGain);
    src.start(t);
    src.stop(t + 0.06);
  }
  step = (step + 1) % 16;
}

export function playMusic(name) {
  ensureCtx();
  if (!ctx) return;
  stopMusic();
  song = name;
  step = 0;
  nextTime = ctx.currentTime + 0.06;
  musicTimer = setInterval(() => {
    if (ctx.state !== 'running') return;
    const dur = 60 / SONGS[song].bpm / 4;
    while (nextTime < ctx.currentTime + 0.12) {
      scheduleStep(nextTime);
      nextTime += dur;
    }
  }, 30);
}

export function stopMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  song = null;
}

export function currentSong() { return song; }
