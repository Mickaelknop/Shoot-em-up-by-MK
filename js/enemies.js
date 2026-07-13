// Ennemis standards. Chaque type (constants.js) référence un `behavior`
// réutilisable : 'drone' (sinusoïde), 'fighter' (piqué guidé), 'heavy' (barrage),
// 'kamikaze' (fonce sur le joueur en zigzag, aspire les bonus, ne tire pas),
// 'bomber' (descend, sonne, explose en anneau de projectiles).
// Ajouter un ennemi = une entrée dans ENEMY_TYPES + un sprite, sans toucher ici.
import { ENEMY_TYPES, difficulty } from './constants.js';
import { images } from './assets.js';
import { aimAt, fireFan, fireRing } from './bullets.js';
import { sfx } from './audio.js';

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
    stopY: opts.stopY ?? null,        // (lourd/bomber) altitude de mise en position
    leaveAfter: opts.leaveAfter ?? null,
    fuse: def.fuse ?? null,           // (bomber) délai avant explosion
    rang: false,                      // (bomber) sonnerie déjà jouée
  };
}

function rand([a, b]) { return a + Math.random() * (b - a); }

export function updateEnemy(e, dt, game) {
  e.t += dt;
  if (e.flash > 0) e.flash -= dt;
  const diff = difficulty(game.levelTime);
  const speed = e.def.speed * e.speedMul * (0.85 + 0.3 * (diff - 1));

  switch (e.def.behavior) {
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

    case 'kamikaze': {
      // Fonce vers le bas en se recalant sur le joueur, avec zigzag.
      e.y += speed * dt * 0.9;
      const pull = Math.max(-150, Math.min(150, (game.player.x - e.x) * 1.4));
      e.x += pull * dt + Math.sin(e.t * e.def.zigFreq) * e.def.zigAmp * dt;
      // Aspire les bonus proches (gag de l'aspirateur)
      for (const pu of game.powerups.items) {
        const dx = pu.x - e.x, dy = pu.y - e.y;
        if (dx * dx + dy * dy < 60 * 60) pu.dead = true;
      }
      break;
    }

    case 'bomber': {
      // Descend, se pose, sonne, puis explose en anneau de projectiles.
      if (e.stopY === null) e.stopY = 130 + Math.random() * 200;
      if (e.y < e.stopY) {
        e.y += speed * dt;
      } else {
        if (!e.rang) { e.rang = true; sfx.alarm(); }
        e.fuse -= dt;
        if (e.fuse < 0.8) e.flash = 0.04;          // clignote avant d'exploser
        if (e.fuse <= 0) {
          e.dead = true;                            // auto-destruction : pas de score
          fireRing(game.enemyBullets, e.x, e.y, e.def.ringN,
            e.def.bulletSpeed * diff, Math.random() * Math.PI, 1);
          game.particles.explosion(e.x, e.y, 1.1);
          sfx.explosion();
          return;
        }
      }
      break;
    }
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
  switch (e.def.behavior) {
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
