// Script du niveau 1 : vagues successives, mid-boss, boss final.
// Le script est une liste d'événements séquentiels :
//   { wait: s }                  — attendre s secondes
//   { spawn: fn }                — exécuter une fonction de spawn
//   { waitClear: true }          — attendre que l'écran soit vide d'ennemis
//   { midboss / boss: true }     — déclencher un boss (avec alerte)
// Ajouter un niveau = écrire un nouveau script.

function lineOfDrones(game, count, side, opts = {}) {
  for (let i = 0; i < count; i++) {
    game.queueSpawn(i * (opts.gap ?? 0.42), () => {
      const x = side === 'left' ? 90 : side === 'right' ? game.w - 90 : game.w / 2;
      game.spawnEnemy('drone', x, -40, opts);
    });
  }
}

function droneArc(game, count, opts = {}) {
  for (let i = 0; i < count; i++) {
    game.queueSpawn(i * 0.3, () => {
      const x = 60 + ((game.w - 120) * i) / Math.max(1, count - 1);
      game.spawnEnemy('drone', x, -40, { amp: 40, ...opts });
    });
  }
}

function fighterDive(game, count, opts = {}) {
  for (let i = 0; i < count; i++) {
    game.queueSpawn(i * 0.55, () => {
      const x = 70 + Math.random() * (game.w - 140);
      game.spawnEnemy('fighter', x, -50, opts);
    });
  }
}

function heavyAt(game, xRatio, opts = {}) {
  game.queueSpawn(0, () => {
    game.spawnEnemy('heavy', game.w * xRatio, -70, { stopY: 150, leaveAfter: 12, ...opts });
  });
}

export function buildLevel1(game) {
  return [
    { wait: 1.6 },
    // — Prise en main —
    { spawn: () => droneArc(game, 4) },
    { wait: 5 },
    { spawn: () => lineOfDrones(game, 4, 'left', { amp: 90 }) },
    { wait: 3 },
    { spawn: () => lineOfDrones(game, 4, 'right', { amp: 90 }) },
    { wait: 5.5 },
    // Premier bonus d'arme garanti
    { spawn: () => game.queueSpawn(0, () => game.spawnEnemy('drone', game.w / 2, -40, { drop: 'W', amp: 30 })) },
    { wait: 3.5 },

    // — Montée en tension —
    { spawn: () => droneArc(game, 6) },
    { wait: 4.5 },
    { spawn: () => fighterDive(game, 3) },
    { wait: 5 },
    { spawn: () => { lineOfDrones(game, 5, 'left', { amp: 110, gap: 0.35 }); fighterDive(game, 2); } },
    { wait: 7 },

    // — Premier lourd —
    { spawn: () => { heavyAt(game, 0.5, { drop: 'W' }); droneArc(game, 4, { speedMul: 1.1 }) } },
    { wait: 10 },
    { spawn: () => fighterDive(game, 4, { speedMul: 1.05 }) },
    { wait: 6 },
    { spawn: () => { heavyAt(game, 0.28); heavyAt(game, 0.72); } },
    { wait: 9 },
    { spawn: () => game.queueSpawn(0, () => game.spawnEnemy('fighter', game.w * 0.3, -50, { drop: 'S' })) },
    { wait: 4 },
    { waitClear: true },
    { wait: 1.5 },

    // — MID-BOSS —
    { midboss: true },
    { waitClear: true },
    { wait: 3 },

    // — Seconde moitié, plus dense —
    { spawn: () => { droneArc(game, 6, { speedMul: 1.2 }); fighterDive(game, 2, { speedMul: 1.1 }) } },
    { wait: 6 },
    { spawn: () => game.queueSpawn(0, () => game.spawnEnemy('drone', game.w / 2, -40, { drop: 'W' })) },
    { wait: 2.5 },
    { spawn: () => { lineOfDrones(game, 6, 'left', { amp: 120, speedMul: 1.2 }); lineOfDrones(game, 6, 'right', { amp: 120, speedMul: 1.2, gap: 0.42 }); } },
    { wait: 7 },
    { spawn: () => { heavyAt(game, 0.5, { hpMul: 1.3 }); fighterDive(game, 3, { speedMul: 1.15 }); } },
    { wait: 9 },
    { spawn: () => fighterDive(game, 5, { speedMul: 1.2 }) },
    { wait: 5.5 },
    { spawn: () => game.queueSpawn(0, () => game.spawnEnemy('fighter', game.w * 0.7, -50, { drop: 'S' })) },
    { wait: 3 },
    { spawn: () => { heavyAt(game, 0.25, { hpMul: 1.2 }); heavyAt(game, 0.75, { hpMul: 1.2 }); droneArc(game, 5, { speedMul: 1.25 }); } },
    { wait: 11 },
    { waitClear: true },
    { wait: 2 },

    // — BOSS FINAL —
    { boss: true },
  ];
}

// Exécuteur de script de niveau
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
