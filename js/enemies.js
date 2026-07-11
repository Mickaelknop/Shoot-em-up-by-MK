// Ennemis standards : drone (sinusoïde), chasseur (piqué), lourd (barrage).
// Chaque ennemi = type + comportement paramétré, pour rester facilement extensible.
import { ENEMY_TYPES, difficulty } from './constants.js';
import { images } from './assets.js';
import { aimAt, fireFan } from './bullets.js';

let idCounter = 0;

export function createEnemy(type, x, y, opts = {}) {
  const def = ENEMY_TYPES[type];
  return {
    id: idCounter++,
    type,
    def,
    x, y,
    hp: def.hp * (opts.hpMul ?? 1),
    radius: def.radius,
    score: def.score,
    t: 0,
    fireT: rand(def.fireInterval) * 0.6,
    flash: 0,
    dead: false,
    drop: opts.drop ?? null,          // type de bonus lâché à la mort ('W', 'S'…)
    dropGem: opts.dropGem ?? (Math.random() < 0.25),
    // paramètres de trajectoire
    baseX: x,
    dir: opts.dir ?? (x < 240 ? 1 : -1),
    amp: opts.amp ?? 70,
    freq: opts.freq ?? 1.6,
    speedMul: opts.speedMul ?? 1,
    stopY: opts.stopY ?? null,        // (lourd) altitude de mise en position
    leaveAfter: opts.leaveAfter ?? null,
  };
}

function rand([a, b]) { return a + Math.random() * (b - a); }

export function updateEnemy(e, dt, game) {
  e.t += dt;
  if (e.flash > 0) e.flash -= dt;
  const diff = difficulty(game.levelTime);
  const speed = e.def.speed * e.speedMul * (0.85 + 0.3 * (diff - 1));

  switch (e.type) {
    case 'drone':
      e.y += speed * dt;
      e.x = e.baseX + Math.sin(e.t * e.freq + e.dir) * e.amp;
      break;

    case 'fighter': {
      // Piqué : accélère vers le bas en courbant vers le joueur
      e.y += speed * dt * (1 + e.t * 0.35);
      const pull = Math.max(-90, Math.min(90, (game.player.x - e.x) * 0.9));
      e.x += pull * dt;
      break;
    }

    case 'heavy':
      if (e.stopY !== null && e.y < e.stopY) {
        e.y += speed * dt * 1.6;
      } else if (e.leaveAfter !== null && e.t > e.leaveAfter) {
        e.y += speed * dt * 1.8;
      } else {
        e.y += speed * dt * 0.15;
        e.x += Math.sin(e.t * 0.8) * 30 * dt;
      }
      break;
  }

  if (e.y > game.h + 80 || e.x < -100 || e.x > game.w + 100) {
    e.dead = true;
    return;
  }

  // Tirs
  e.fireT -= dt * diff;
  if (e.fireT <= 0 && e.y > 30 && e.y < game.h - 180) {
    e.fireT = rand(e.def.fireInterval);
    enemyFire(e, game, diff);
  }
}

function enemyFire(e, game, diff) {
  const bs = e.def.bulletSpeed * diff;
  const p = game.player;
  switch (e.type) {
    case 'drone': {
      const v = aimAt(e.x, e.y, p.x, p.y, bs);
      game.enemyBullets.fire(e.x, e.y + 12, v.vx, v.vy);
      break;
    }
    case 'fighter': {
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      fireFan(game.enemyBullets, e.x, e.y + 10, a, 2, 0.25, bs, 1);
      break;
    }
    case 'heavy': {
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      fireFan(game.enemyBullets, e.x, e.y + 20, a, 5, 0.9, bs, 1);
      break;
    }
  }
}

export function drawEnemy(e, ctx) {
  const img = images[e.def.img];
  const d = e.def.drawSize;
  const h = d * (img.height / img.width);
  if (e.flash > 0) {
    ctx.save();
    ctx.filter = 'brightness(2.2)';
    ctx.drawImage(img, e.x - d / 2, e.y - h / 2, d, h);
    ctx.restore();
  } else {
    ctx.drawImage(img, e.x - d / 2, e.y - h / 2, d, h);
  }
}
