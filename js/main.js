// Point d'entrée : chargement, écrans HTML, boucle requestAnimationFrame.
import { loadAssets } from './assets.js';
import { Game } from './game.js';
import { unlockAudio, toggleMute, isMuted } from './audio.js';
import { getHiscore } from './storage.js';

const $ = (id) => document.getElementById(id);

const screens = {
  title: $('screen-title'),
  pause: $('screen-pause'),
  gameover: $('screen-gameover'),
  victory: $('screen-victory'),
  loading: $('screen-loading'),
};

const ui = {
  showScreen(name, data = {}) {
    for (const [key, el] of Object.entries(screens)) {
      el.classList.toggle('hidden', key !== name);
    }
    if (name === 'title') $('title-hiscore').textContent = data.hiscore ?? getHiscore();
    if (name === 'gameover') {
      $('go-score').textContent = data.score;
      $('go-hiscore').textContent = data.hiscore;
      $('go-newrecord').classList.toggle('hidden', !data.record);
    }
    if (name === 'victory') {
      $('v-score').textContent = data.score;
      $('v-hiscore').textContent = data.hiscore;
      $('v-newrecord').classList.toggle('hidden', !data.record);
    }
  },
  setPauseVisible(visible) {
    $('btn-pause').classList.toggle('hidden', !visible);
  },
};

async function boot() {
  await loadAssets();

  const canvas = $('game');
  const game = new Game(canvas, ui);
  ui.showScreen('title', { hiscore: getHiscore() });

  // Boutons : pointerup (réactif au tactile) + click en secours, avec garde anti-doublon
  const bind = (id, fn) => {
    const el = $(id);
    let lastTap = 0;
    const handler = (e) => {
      e.stopPropagation();
      e.preventDefault();
      const now = performance.now();
      if (now - lastTap < 400) return;
      lastTap = now;
      unlockAudio();
      fn();
    };
    el.addEventListener('pointerup', handler);
    el.addEventListener('click', handler);
  };
  bind('btn-start', () => game.startGame());
  bind('btn-retry', () => game.startGame());
  bind('btn-retry2', () => game.startGame());
  bind('btn-resume', () => game.resume());
  bind('btn-quit', () => game.quitToTitle());
  bind('btn-gotitle', () => game.quitToTitle());
  bind('btn-gotitle2', () => game.quitToTitle());
  bind('btn-pause', () => game.togglePause());

  const muteBtn = $('btn-mute');
  muteBtn.classList.toggle('muted', isMuted());
  bind('btn-mute', () => muteBtn.classList.toggle('muted', toggleMute()));

  // Débloque l'audio au premier toucher, où qu'il soit
  window.addEventListener('pointerdown', unlockAudio, { once: true });

  // Boucle principale à pas de temps borné (évite les sauts après un onglet inactif)
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    game.update(dt);
    game.draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Outil de test (dev uniquement) : ?skip=midboss|boss avance le script du niveau
  const skip = new URLSearchParams(location.search).get('skip');
  if (skip) {
    window.__skipTo = () => {
      const script = game.level.script;
      const idx = script.findIndex((ev) => (skip === 'boss' ? ev.boss : ev.midboss));
      if (idx >= 0) {
        game.enemies = [];
        game.pendingSpawns = [];
        game.level.index = idx;
        game.level.timer = 0;
      }
    };
  }
  window.__game = game;
}

boot().catch((err) => {
  $('screen-loading').innerHTML =
    '<div class="screen-title danger">ERREUR</div><div class="hint">' + err.message + '</div>';
  $('screen-loading').classList.remove('hidden');
  console.error(err);
});
