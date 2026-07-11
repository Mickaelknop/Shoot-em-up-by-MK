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
let playerBoltSW = null;             // laser rouge « rebelle »
let enemyBoltGreen = null;           // laser vert « impérial »
let enemyBoltGreen2 = null;

// Bolt allongé type laser Star Wars : cœur blanc, halo coloré vif.
function makeLaserBolt(color) {
  const c = document.createElement('canvas');
  c.width = 12; c.height = 34;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 34);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.5, '#ffffff');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(4, 0, 4, 34);           // cœur blanc
  const halo = g.createLinearGradient(0, 0, 0, 34);
  halo.addColorStop(0, 'rgba(0,0,0,0)');
  halo.addColorStop(0.5, color);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalCompositeOperation = 'destination-over';
  g.fillStyle = halo;
  g.fillRect(1, 0, 10, 34);
  return c;
}

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
  // Style Star Wars
  playerBoltSW = makeLaserBolt('#ff3322');
  enemyBoltGreen = makeGlowSprite(20, '#66ff44', 'rgba(40,220,20,0)');
  enemyBoltGreen2 = makeGlowSprite(20, '#aaff55', 'rgba(120,240,20,0)');
}

export class Bullets {
  constructor(isEnemy) {
    this.isEnemy = isEnemy;
    this.pool = [];
    this.style = 'default';   // 'default' | 'sw' (joueur) | 'green' (ennemis)
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
    const green = this.style === 'green';
    for (const b of this.pool) {
      if (b.dead) continue;
      if (this.isEnemy) {
        const s = green
          ? (b.variant ? enemyBoltGreen2 : enemyBoltGreen)
          : (b.variant ? enemyBallSprite2 : enemyBallSprite);
        const d = b.r * 3.6;
        ctx.drawImage(s, b.x - d / 2, b.y - d / 2, d, d);
      } else if (this.style === 'sw') {
        // laser rouge orienté vers le haut (les tirs joueur montent)
        ctx.drawImage(playerBoltSW, b.x - 6, b.y - 17, 12, 34);
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
