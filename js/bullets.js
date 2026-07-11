// Projectiles (joueur + ennemis), avec pool d'objets et sprites pré-rendus.

function makeGlowSprite(size, inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

let playerBoltSprite = null;
let enemyBallSprite = null;
let enemyBallSprite2 = null;

function ensureSprites() {
  if (playerBoltSprite) return;
  // Bolt du joueur : capsule cyan verticale
  const c = document.createElement('canvas');
  c.width = 12; c.height = 30;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 30);
  grad.addColorStop(0, '#eaffff');
  grad.addColorStop(0.5, '#5fd8ff');
  grad.addColorStop(1, 'rgba(20,120,255,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(6, 15, 5, 14, 0, 0, Math.PI * 2);
  g.fill();
  playerBoltSprite = c;
  enemyBallSprite = makeGlowSprite(22, '#ff5544', 'rgba(255,40,20,0)');
  enemyBallSprite2 = makeGlowSprite(22, '#ff9944', 'rgba(255,140,20,0)');
}

export class Bullets {
  constructor(isEnemy) {
    this.isEnemy = isEnemy;
    this.pool = [];
    ensureSprites();
  }

  fire(x, y, vx, vy, opts = {}) {
    const b = this.pool.find((q) => q.dead) || (() => {
      const q = {};
      this.pool.push(q);
      return q;
    })();
    b.x = x; b.y = y; b.vx = vx; b.vy = vy;
    b.r = opts.r ?? (this.isEnemy ? 6 : 5);
    b.dmg = opts.dmg ?? 1;
    b.variant = opts.variant ?? 0;
    b.dead = false;
  }

  update(dt, game) {
    const m = 60;
    for (const b of this.pool) {
      if (b.dead) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -m || b.x > game.w + m || b.y < -m || b.y > game.h + m) b.dead = true;
    }
  }

  clear() {
    for (const b of this.pool) b.dead = true;
  }

  draw(ctx) {
    for (const b of this.pool) {
      if (b.dead) continue;
      if (this.isEnemy) {
        const s = b.variant ? enemyBallSprite2 : enemyBallSprite;
        const d = b.r * 3.6;
        ctx.drawImage(s, b.x - d / 2, b.y - d / 2, d, d);
      } else {
        ctx.drawImage(playerBoltSprite, b.x - 6, b.y - 15, 12, 30);
      }
    }
  }
}

/* Aides pour les motifs de tir ennemis */

export function aimAt(x, y, tx, ty, speed) {
  const dx = tx - x, dy = ty - y;
  const d = Math.hypot(dx, dy) || 1;
  return { vx: (dx / d) * speed, vy: (dy / d) * speed };
}

export function fireRing(bullets, x, y, n, speed, offset = 0, variant = 0) {
  for (let i = 0; i < n; i++) {
    const a = offset + (i / n) * Math.PI * 2;
    bullets.fire(x, y, Math.cos(a) * speed, Math.sin(a) * speed, { variant });
  }
}

export function fireFan(bullets, x, y, baseAngle, count, spread, speed, variant = 0) {
  for (let i = 0; i < count; i++) {
    const a = baseAngle + (count === 1 ? 0 : (i / (count - 1) - 0.5) * spread);
    bullets.fire(x, y, Math.cos(a) * speed, Math.sin(a) * speed, { variant });
  }
}
