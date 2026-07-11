// Point d'entrée : chargement, écrans HTML, classement en ligne, boucle rAF.
import { loadAssets } from './assets.js';
import { Game } from './game.js';
import { unlockAudio, toggleMute, isMuted } from './audio.js';
import { getHiscore, getPseudo, setPseudo } from './storage.js';
import { validatePseudo, submitScore, fetchTop, fetchRank } from './leaderboard.js';

const $ = (id) => document.getElementById(id);

async function boot() {
  await loadAssets();

  const screens = {
    title: $('screen-title'),
    pause: $('screen-pause'),
    gameover: $('screen-gameover'),
    victory: $('screen-victory'),
    loading: $('screen-loading'),
  };

  let currentPseudo = getPseudo();

  /* ---------- Rendu du classement ---------- */
  function renderLeaderboard(container, rows, me = {}) {
    const body = container.querySelector('.lb-body');
    body.className = 'lb-body';
    body.textContent = '';
    if (rows === null) {
      body.innerHTML = '<div class="lb-offline">Classement indisponible (hors ligne)</div>';
      return;
    }
    if (rows.length === 0) {
      body.innerHTML = '<div class="lb-empty">Aucun score. Sois le premier !</div>';
      return;
    }
    let meShown = false;
    rows.forEach((r, i) => {
      const isMe = me.pseudo && !meShown && r.pseudo === me.pseudo &&
        (me.score === undefined || r.score === me.score);
      if (isMe) meShown = true;
      body.appendChild(makeRow(i + 1, r.pseudo, r.score, i < 3, isMe));
    });
    if (me.rank) {
      if (!meShown && me.pseudo) {
        const sep = document.createElement('div');
        sep.className = 'lb-sep';
        body.appendChild(sep);
        body.appendChild(makeRow(me.rank, me.pseudo, me.score, false, true));
      }
      const line = document.createElement('div');
      line.className = 'lb-myrank';
      line.innerHTML = `TON RANG : <b>#${me.rank}</b> / ${me.total || me.rank}`;
      body.appendChild(line);
    }
  }

  function makeRow(rank, pseudo, score, topThree, isMe) {
    const row = document.createElement('div');
    row.className = 'lb-row' + (topThree ? ' lb-top' + rank : '') + (isMe ? ' lb-me' : '');
    const rk = document.createElement('span');
    rk.className = 'lb-rank';
    rk.textContent = rank;
    const nm = document.createElement('span');
    nm.className = 'lb-name';
    nm.textContent = pseudo;                       // textContent => aucune injection HTML
    const sc = document.createElement('span');
    sc.className = 'lb-score';
    sc.textContent = Number(score).toLocaleString('fr-FR');
    row.append(rk, nm, sc);
    return row;
  }

  function setLoading(container) {
    const body = container.querySelector('.lb-body');
    body.className = 'lb-body lb-loading';
    body.textContent = '…';
  }

  async function renderTitleLeaderboard() {
    const container = $('title-leaderboard');
    setLoading(container);
    const rows = await fetchTop();
    renderLeaderboard(container, rows, { pseudo: currentPseudo });
  }

  // Fin de partie : soumet le score puis affiche Top 10 + rang perso.
  async function handleEndScreen(kind, score) {
    const container = kind === 'gameover' ? $('go-leaderboard') : $('v-leaderboard');
    setLoading(container);
    const pseudo = currentPseudo || getPseudo();
    if (pseudo && score > 0) await submitScore(pseudo, score);
    const [rows, rankInfo] = await Promise.all([fetchTop(), fetchRank(score)]);
    renderLeaderboard(container, rows, {
      pseudo, score,
      rank: rankInfo ? rankInfo.rank : null,
      total: rankInfo ? rankInfo.total : null,
    });
  }

  /* ---------- Gestion des écrans ---------- */
  const ui = {
    showScreen(name, data = {}) {
      for (const [key, el] of Object.entries(screens)) {
        el.classList.toggle('hidden', key !== name);
      }
      if (name === 'title') {
        $('title-hiscore').textContent = data.hiscore ?? getHiscore();
        renderTitleLeaderboard();
      }
      if (name === 'gameover') {
        $('go-score').textContent = data.score;
        $('go-hiscore').textContent = data.hiscore;
        $('go-newrecord').classList.toggle('hidden', !data.record);
        handleEndScreen('gameover', data.score);
      }
      if (name === 'victory') {
        $('v-score').textContent = data.score;
        $('v-hiscore').textContent = data.hiscore;
        $('v-newrecord').classList.toggle('hidden', !data.record);
        handleEndScreen('victory', data.score);
      }
    },
    setPauseVisible(visible) {
      $('btn-pause').classList.toggle('hidden', !visible);
    },
  };

  const canvas = $('game');
  const game = new Game(canvas, ui);

  /* ---------- Champ pseudo ---------- */
  const pseudoInput = $('pseudo-input');
  const pseudoError = $('pseudo-error');
  pseudoInput.value = currentPseudo;
  pseudoInput.addEventListener('input', () => pseudoError.classList.add('hidden'));

  function tryStart() {
    const v = validatePseudo(pseudoInput.value);
    if (!v.ok) {
      pseudoError.textContent = v.error;
      pseudoError.classList.remove('hidden');
      pseudoInput.focus();
      return;
    }
    pseudoError.classList.add('hidden');
    currentPseudo = v.value;
    setPseudo(v.value);
    game.startGame();
  }

  ui.showScreen('title', { hiscore: getHiscore() });

  /* ---------- Boutons ---------- */
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
  bind('btn-start', tryStart);
  bind('btn-retry', () => game.startGame());     // rejoue avec le pseudo déjà validé
  bind('btn-retry2', () => game.startGame());
  bind('btn-resume', () => game.resume());
  bind('btn-quit', () => game.quitToTitle());
  bind('btn-gotitle', () => game.quitToTitle());
  bind('btn-gotitle2', () => game.quitToTitle());
  bind('btn-pause', () => game.togglePause());

  const muteBtn = $('btn-mute');
  muteBtn.classList.toggle('muted', isMuted());
  bind('btn-mute', () => muteBtn.classList.toggle('muted', toggleMute()));

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
      const s = game.level.script;
      const idx = s.findIndex((ev) => (skip === 'boss' ? ev.boss : ev.midboss));
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
