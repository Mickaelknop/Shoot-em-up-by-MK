// Bonus récupérables : W (arme), S (bouclier), L (vie), P (points),
// B (smart bomb) et M (invincibilité) — ces deux derniers réservés au pool
// 'bedroom'. L'habillage émoji est fourni par le niveau (skin).
import { POWERUPS } from './constants.js';

// Tables de tirage par niveau : [type, poids cumulé sur 1]
const POOLS = {
  default: [['W', 0.42], ['S', 0.68], ['L', 0.78], ['P', 1]],
  bedroom: [['W', 0.34], ['S', 0.54], ['L', 0.64], ['B', 0.76], ['M', 0.86], ['P', 1]],
};

export class Powerups {
  constructor() { this.items = []; }

  spawn(x, y, type) {
    this.items.push({
      x, y, type,
      vy: 85,
      t: Math.random() * Math.PI * 2,
      r: 18,
      dead: false,
    });
  }

  // Drop aléatoire pondéré (appelé à la mort de certains ennemis)
  spawnRandom(x, y, pool = 'default') {
    const roll = Math.random();
    const table = POOLS[pool] || POOLS.default;
    for (const [type, cum] of table) {
      if (roll < cum) { this.spawn(x, y, type); return; }
    }
  }

  update(dt, game) {
    for (const p of this.items) {
      p.t += dt * 2.4;
      p.x += Math.sin(p.t) * 40 * dt;
      p.y += p.vy * dt;
      if (p.y > game.h + 40) p.dead = true;
    }
    this.items = this.items.filter((p) => !p.dead);
  }

  draw(ctx, time, skin = null) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of this.items) {
      const def = POWERUPS[p.type];
      const emoji = skin && skin[p.type];
      const pulse = 1 + Math.sin(time * 6 + p.t) * 0.12;
      const r = p.r * pulse;
      // halo
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // capsule
      ctx.fillStyle = '#101828';
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (emoji) {
        ctx.font = '19px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
        ctx.fillText(emoji, p.x, p.y + 1);
      } else {
        ctx.font = 'bold 17px "Courier New", monospace';
        ctx.fillStyle = def.color;
        ctx.fillText(def.label, p.x, p.y + 1);
      }
    }
    ctx.textBaseline = 'alphabetic';
  }
}
