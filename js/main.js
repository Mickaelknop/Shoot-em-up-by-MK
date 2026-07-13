// Point d'entrée : chargement, écrans HTML, classement en ligne, boucle rAF.
import { loadAssets } from './assets.js';
import { Game } from './game.js';
import { unlockAudio, toggleMute, isMuted } from './audio.js';
import { getHiscore, getPseudo, setPseudo, getOwner, getShip, setShip } from './storage.js';
import { validatePseudo, checkPseudo, submitScore, fetchTop, fetchRank } from './leaderboard.js';
import { LEVELS, SHIPS, shipById } from './level.js';

const $ = (id) => document.getElementById(id);

async function boot() {
  await loadAssets();

  const screens = {
    title: $('screen-title'),
    shipselect: $('screen-shipselect'),
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
      // Vaisseau : celui renvoyé par le serveur, ou celui de la session pour ma ligne.
      const ship = r.ship || (isMe ? me.ship : null);
      body.appendChild(makeRow(i + 1, r.pseudo, r.score, i < 3, isMe, ship));
    });
    if (me.rank) {
      if (!meShown && me.pseudo) {
        const sep = document.createElement('div');
        sep.className = 'lb-sep';
        body.appendChild(sep);
        body.appendChild(makeRow(me.rank, me.pseudo, me.score, false, true, me.ship));
      }
      const line = document.createElement('div');
      line.className = 'lb-myrank';
      line.innerHTML = `TON RANG : <b>#${me.rank}</b> / ${me.total || me.rank}`;
      body.appendChild(line);
    }
  }

  function makeRow(rank, pseudo, score, topThree, isMe, ship) {
    const row = document.createElement('div');
    row.className = 'lb-row' + (topThree ? ' lb-top' + rank : '') + (isMe ? ' lb-me' : '');
    const rk = document.createElement('span');
    rk.className = 'lb-rank';
    rk.textContent = rank;
    const nm = document.createElement('span');
    nm.className = 'lb-name';
    nm.textContent = pseudo;                       // textContent => aucune injection HTML
    // Petite icône du vaisseau à droite du pseudo (si connu)
    const def = ship ? shipById(ship) : null;
    if (def) {
      const ic = document.createElement('img');
      ic.className = 'lb-ship';
      ic.src = 'assets/' + def.img + '.png';
      ic.alt = def.name;
      nm.appendChild(ic);
    }
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
    renderLeaderboard(container, rows, { pseudo: currentPseudo, ship: game.shipDef.id });
  }

  // Fin de partie : soumet le score (une ligne/pseudo, meilleur conservé) puis
  // affiche Top 10 + rang perso basé sur le MEILLEUR score du pseudo.
  async function handleEndScreen(kind, score) {
    const container = kind === 'gameover' ? $('go-leaderboard') : $('v-leaderboard');
    setLoading(container);
    const pseudo = currentPseudo || getPseudo();
    const ship = game.shipDef.id;
    let best = score;
    let status = null;
    if (pseudo && score > 0) {
      const res = await submitScore(pseudo, score, getOwner(), ship);
      if (res) {
        status = res.status;
        if (typeof res.best === 'number') best = res.best;
      }
    }
    const [rows, rankInfo] = await Promise.all([fetchTop(), fetchRank(best)]);
    renderLeaderboard(container, rows, {
      // Si le pseudo appartient à un autre joueur, pas de surbrillance.
      pseudo: status === 'taken' ? null : pseudo,
      ship,
      score: best,
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

  /* ---------- Sélecteur de niveau ---------- */
  const levelSelect = $('level-select');
  LEVELS.forEach((lv, idx) => {
    const btn = document.createElement('button');
    btn.className = 'level-btn' + (idx === game.levelIndex ? ' selected' : '');
    btn.type = 'button';
    const num = document.createElement('span');
    num.className = 'lv-num';
    num.textContent = 'NIVEAU ' + lv.id;
    const name = document.createElement('span');
    name.className = 'lv-name';
    name.textContent = lv.name;
    const sub = document.createElement('span');
    sub.className = 'lv-sub';
    sub.textContent = lv.subtitle;
    btn.append(num, name, sub);
    const select = (e) => {
      e.preventDefault();
      e.stopPropagation();
      game.selectLevel(idx);   // met aussi à jour le fond affiché derrière le titre
      [...levelSelect.children].forEach((c, i) =>
        c.classList.toggle('selected', i === idx));
    };
    btn.addEventListener('pointerup', select);
    btn.addEventListener('click', select);
    levelSelect.appendChild(btn);
  });

  /* ---------- Sélection du vaisseau (cartes) ---------- */
  // Restaure le dernier vaisseau choisi (sinon le premier par défaut).
  const savedShip = SHIPS.findIndex((s) => s.id === getShip());
  if (savedShip >= 0) game.selectShip(savedShip);

  const shipCards = $('ship-cards');
  SHIPS.forEach((s, idx) => {
    const card = document.createElement('button');
    card.className = 'ship-card' + (idx === game.shipIndex ? ' selected' : '');
    card.type = 'button';
    const img = document.createElement('img');
    img.className = 'ship-card-img';
    img.src = 'assets/' + s.card + '.jpg';
    img.alt = s.name;
    const nm = document.createElement('span');
    nm.className = 'ship-card-name';
    nm.textContent = s.name;
    const tg = document.createElement('span');
    tg.className = 'ship-card-tag';
    tg.textContent = s.tagline;
    card.append(img, nm, tg);
    const pick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      game.selectShip(idx);
      setShip(s.id);
      [...shipCards.children].forEach((c, i) => c.classList.toggle('selected', i === idx));
      game.startGame();   // lance la partie avec le vaisseau choisi
    };
    card.addEventListener('pointerup', pick);
    card.addEventListener('click', pick);
    shipCards.appendChild(card);
  });

  /* ---------- Champ pseudo ---------- */
  const pseudoInput = $('pseudo-input');
  const pseudoError = $('pseudo-error');
  pseudoInput.value = currentPseudo;
  pseudoInput.addEventListener('input', () => pseudoError.classList.add('hidden'));

  function showPseudoError(msg) {
    pseudoError.textContent = msg;
    pseudoError.classList.remove('hidden');
    pseudoInput.focus();
  }

  let starting = false;
  async function tryStart() {
    if (starting) return;
    const v = validatePseudo(pseudoInput.value);
    if (!v.ok) { showPseudoError(v.error); return; }
    pseudoError.classList.add('hidden');
    starting = true;
    const startBtn = $('btn-start');
    const label = startBtn.textContent;
    startBtn.textContent = '…';
    // Vérifie que le pseudo n'appartient pas à un AUTRE joueur.
    // En cas d'échec réseau (null), on laisse jouer : le serveur tranchera au score.
    const avail = await checkPseudo(v.value, getOwner());
    startBtn.textContent = label;
    starting = false;
    if (avail === 'taken') {
      showPseudoError('Pseudo déjà pris par un autre joueur');
      return;
    }
    currentPseudo = v.value;
    setPseudo(v.value);
    // Pseudo validé : on passe à l'écran de choix du vaisseau (puis la partie).
    [...shipCards.children].forEach((c, i) => c.classList.toggle('selected', i === game.shipIndex));
    ui.showScreen('shipselect');
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
  bind('btn-ship-back', () => ui.showScreen('title', { hiscore: getHiscore() }));
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
