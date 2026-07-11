// Bonus récupérables : W (arme), S (bouclier), L (vie), P (points).
import { POWERUPS } from './constants.js';

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
  spawnRandom(x, y) {
    const roll = Math.random();
    let type;
    if (roll < 0.42) type = 'W';
    else if (roll < 0.68) type = 'S';
    else if (roll < 0.78) type = 'L';
    else type = 'P';
    this.spawn(x, y, type);
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

  draw(ctx, time) {
    ctx.font = 'bold 17px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of this.items) {
      const def = POWERUPS[p.type];
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
      ctx.fillStyle = def.color;
      ctx.fillText(def.label, p.x, p.y + 1);
    }
    ctx.textBaseline = 'alphabetic';
  }
}
