// Scripts des niveaux + registre LEVELS.
// Un script est une liste d'événements séquentiels :
//   { wait: s }                  — attendre s secondes
//   { spawn: fn }                — exécuter une fonction de spawn
//   { waitClear: true }          — attendre que l'écran soit vide d'ennemis
//   { midboss / boss: true }     — déclencher un boss (avec alerte)
// Ajouter un niveau = écrire un buildLevelN + une entrée dans LEVELS.
import { MIDBOSS, BOSS, MIDBOSS2, BOSS2 } from './constants.js';

/* ---------- Aides de spawn génériques (type d'ennemi en paramètre) ---------- */

function lineOf(game, type, count, side, opts = {}) {
  for (let i = 0; i < count; i++) {
    game.queueSpawn(i * (opts.gap ?? 0.42), () => {
      const x = side === 'left' ? 90 : side === 'right' ? game.w - 90 : game.w / 2;
      game.spawnEnemy(type, x, -40, opts);
    });
  }
}

function arcOf(game, type, count, opts = {}) {
  for (let i = 0; i < count; i++) {
    game.queueSpawn(i * 0.3, () => {
      const x = 60 + ((game.w - 120) * i) / Math.max(1, count - 1);
      game.spawnEnemy(type, x, -40, { amp: 40, ...opts });
    });
  }
}

function diveOf(game, type, count, opts = {}) {
  for (let i = 0; i < count; i++) {
    game.queueSpawn(i * 0.55, () => {
      const x = 70 + Math.random() * (game.w - 140);
      game.spawnEnemy(type, x, -50, opts);
    });
  }
}

function heavyAt(game, type, xRatio, opts = {}) {
  game.queueSpawn(0, () => {
    game.spawnEnemy(type, game.w * xRatio, -70, { stopY: 150, leaveAfter: 12, ...opts });
  });
}

function carrier(game, type, xRatio, drop, opts = {}) {
  game.queueSpawn(0, () => game.spawnEnemy(type, game.w * xRatio, -40, { drop, ...opts }));
}

/* ---------- Niveau 1 : Mission Bydo ---------- */

export function buildLevel1(game) {
  return [
    { wait: 1.6 },
    // — Prise en main —
    { spawn: () => arcOf(game, 'drone', 4) },
    { wait: 5 },
    { spawn: () => lineOf(game, 'drone', 4, 'left', { amp: 90 }) },
    { wait: 3 },
    { spawn: () => lineOf(game, 'drone', 4, 'right', { amp: 90 }) },
    { wait: 5.5 },
    // Premier bonus d'arme garanti
    { spawn: () => carrier(game, 'drone', 0.5, 'W', { amp: 30 }) },
    { wait: 3.5 },

    // — Montée en tension —
    { spawn: () => arcOf(game, 'drone', 6) },
    { wait: 4.5 },
    { spawn: () => diveOf(game, 'fighter', 3) },
    { wait: 5 },
    { spawn: () => { lineOf(game, 'drone', 5, 'left', { amp: 110, gap: 0.35 }); diveOf(game, 'fighter', 2); } },
    { wait: 7 },

    // — Premier lourd —
    { spawn: () => { heavyAt(game, 'heavy', 0.5, { drop: 'W' }); arcOf(game, 'drone', 4, { speedMul: 1.1 }); } },
    { wait: 10 },
    { spawn: () => diveOf(game, 'fighter', 4, { speedMul: 1.05 }) },
    { wait: 6 },
    { spawn: () => { heavyAt(game, 'heavy', 0.28); heavyAt(game, 'heavy', 0.72); } },
    { wait: 9 },
    { spawn: () => carrier(game, 'fighter', 0.3, 'S') },
    { wait: 4 },
    { waitClear: true },
    { wait: 1.5 },

    // — MID-BOSS —
    { midboss: true },
    { waitClear: true },
    { wait: 3 },

    // — Seconde moitié, plus dense —
    { spawn: () => { arcOf(game, 'drone', 6, { speedMul: 1.2 }); diveOf(game, 'fighter', 2, { speedMul: 1.1 }); } },
    { wait: 6 },
    { spawn: () => carrier(game, 'drone', 0.5, 'W') },
    { wait: 2.5 },
    { spawn: () => { lineOf(game, 'drone', 6, 'left', { amp: 120, speedMul: 1.2 }); lineOf(game, 'drone', 6, 'right', { amp: 120, speedMul: 1.2, gap: 0.42 }); } },
    { wait: 7 },
    { spawn: () => { heavyAt(game, 'heavy', 0.5, { hpMul: 1.3 }); diveOf(game, 'fighter', 3, { speedMul: 1.15 }); } },
    { wait: 9 },
    { spawn: () => diveOf(game, 'fighter', 5, { speedMul: 1.2 }) },
    { wait: 5.5 },
    { spawn: () => carrier(game, 'fighter', 0.7, 'S') },
    { wait: 3 },
    { spawn: () => { heavyAt(game, 'heavy', 0.25, { hpMul: 1.2 }); heavyAt(game, 'heavy', 0.75, { hpMul: 1.2 }); arcOf(game, 'drone', 5, { speedMul: 1.25 }); } },
    { wait: 11 },
    { waitClear: true },
    { wait: 2 },

    // — BOSS FINAL —
    { boss: true },
  ];
}

/* ---------- Niveau 2 : hommage à la guerre des étoiles ---------- */
// Escadrons de chasseurs sombres en formation serrée, intercepteurs en piqué,
// canonnières lourdes, destroyer stellaire en mid-boss, station de combat en final.

export function buildLevel2(game) {
  return [
    { wait: 1.6 },
    // — Patrouilles d'escadrons —
    { spawn: () => arcOf(game, 'tie', 5) },
    { wait: 4.5 },
    { spawn: () => { lineOf(game, 'tie', 4, 'left', { amp: 80, gap: 0.3 }); lineOf(game, 'tie', 4, 'right', { amp: 80, gap: 0.3 }); } },
    { wait: 5.5 },
    { spawn: () => carrier(game, 'tie', 0.5, 'W', { amp: 30 }) },
    { wait: 3.5 },

    // — Les intercepteurs entrent en scène —
    { spawn: () => diveOf(game, 'inter', 3) },
    { wait: 4.5 },
    { spawn: () => { arcOf(game, 'tie', 6, { speedMul: 1.05 }); diveOf(game, 'inter', 2) } },
    { wait: 6.5 },
    { spawn: () => { lineOf(game, 'tie', 6, 'center', { amp: 150, gap: 0.32 }); } },
    { wait: 5 },

    // — Première canonnière —
    { spawn: () => { heavyAt(game, 'gunship', 0.5, { drop: 'W' }); arcOf(game, 'tie', 4, { speedMul: 1.1 }); } },
    { wait: 10 },
    { spawn: () => diveOf(game, 'inter', 4, { speedMul: 1.05 }) },
    { wait: 6 },
    { spawn: () => { heavyAt(game, 'gunship', 0.3); heavyAt(game, 'gunship', 0.7); } },
    { wait: 9 },
    { spawn: () => carrier(game, 'inter', 0.35, 'S') },
    { wait: 4 },
    { waitClear: true },
    { wait: 1.5 },

    // — MID-BOSS : le destroyer stellaire —
    { midboss: true },
    { waitClear: true },
    { wait: 3 },

    // — Contre-attaque totale —
    { spawn: () => { arcOf(game, 'tie', 7, { speedMul: 1.2 }); diveOf(game, 'inter', 2, { speedMul: 1.15 }); } },
    { wait: 6 },
    { spawn: () => carrier(game, 'tie', 0.5, 'W') },
    { wait: 2.5 },
    { spawn: () => { lineOf(game, 'tie', 6, 'left', { amp: 130, speedMul: 1.25 }); lineOf(game, 'tie', 6, 'right', { amp: 130, speedMul: 1.25, gap: 0.4 }); } },
    { wait: 7 },
    { spawn: () => { heavyAt(game, 'gunship', 0.5, { hpMul: 1.3 }); diveOf(game, 'inter', 3, { speedMul: 1.2 }); } },
    { wait: 9 },
    { spawn: () => diveOf(game, 'inter', 5, { speedMul: 1.25 }) },
    { wait: 5.5 },
    { spawn: () => carrier(game, 'inter', 0.65, 'S') },
    { wait: 3 },
    { spawn: () => { heavyAt(game, 'gunship', 0.22, { hpMul: 1.25 }); heavyAt(game, 'gunship', 0.78, { hpMul: 1.25 }); arcOf(game, 'tie', 6, { speedMul: 1.3 }); } },
    { wait: 11 },
    { waitClear: true },
    { wait: 2 },

    // — BOSS FINAL : la station de combat —
    { boss: true },
  ];
}

/* ---------- Registre des niveaux ---------- */

export const LEVELS = [
  {
    id: 1,
    name: 'MISSION BYDO',
    subtitle: 'Secteur biomécanique',
    playerImg: 'player',   // vaisseau du joueur
    bg: 'bg',
    bossBg: null,          // pas de décor spécial pour la scène du boss
    bolt: 'default',       // style des tirs du joueur
    enemyBolt: 'default',  // style des tirs ennemis
    song: 'stage',
    build: buildLevel1,
    midboss: MIDBOSS,
    boss: BOSS,
  },
  {
    id: 2,
    name: 'GUERRE DES ÉTOILES',
    subtitle: 'Hommage — flotte impériale',
    playerImg: 'xwing',    // chasseur rebelle en X
    bg: 'bg2',             // espace neutre pendant le niveau
    bossBg: 'bg2boss',     // station + flotte, uniquement à la scène du boss final
    bolt: 'sw',            // lasers rouges rebelles
    enemyBolt: 'green',    // lasers verts impériaux
    song: 'stage2',
    build: buildLevel2,
    midboss: MIDBOSS2,
    boss: BOSS2,
  },
];

/* ---------- Exécuteur de script de niveau ---------- */

export class LevelRunner {
  constructor(game, script) {
    this.game = game;
    this.script = script;
    this.index = 0;
    this.timer = 0;
    this.done = false;
  }

  update(dt) {
    const g = this.game;
    if (this.done) return;

    while (this.index < this.script.length) {
      const ev = this.script[this.index];

      if (ev.wait !== undefined) {
        this.timer += dt;
        if (this.timer < ev.wait) return;
        this.timer = 0;
        this.index++;
        continue;
      }
      if (ev.waitClear) {
        if (g.enemies.length > 0 || g.boss || g.pendingSpawns.length > 0) return;
        this.index++;
        continue;
      }
      if (ev.spawn) {
        ev.spawn();
        this.index++;
        continue;
      }
      if (ev.midboss) {
        g.startBoss(false);
        this.index++;
        return;
      }
      if (ev.boss) {
        g.startBoss(true);
        this.index++;
        return;
      }
      this.index++;
    }
    this.done = true;
  }
}
