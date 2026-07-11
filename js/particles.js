// Particules (explosions, réacteurs, étoiles) et textes flottants.

export class Particles {
  constructor() {
    this.pool = [];
  }

  spawn(x, y, opts = {}) {
    const p = this.pool.find((q) => q.dead) || (() => {
      const q = {};
      this.pool.push(q);
      return q;
    })();
    const speed = opts.speed ?? 120;
    const a = opts.angle ?? Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    p.x = x; p.y = y;
    p.vx = Math.cos(a) * v + (opts.vx ?? 0);
    p.vy = Math.sin(a) * v + (opts.vy ?? 0);
    p.life = p.maxLife = opts.life ?? 0.5;
    p.size = opts.size ?? 4;
    p.color = opts.color ?? '#ffb347';
    p.drag = opts.drag ?? 0.9;
    p.dead = false;
  }

  burst(x, y, n, opts = {}) {
    for (let i = 0; i < n; i++) this.spawn(x, y, opts);
  }

  explosion(x, y, scale = 1) {
    this.burst(x, y, Math.round(14 * scale), { color: '#ffd166', speed: 220 * scale, life: 0.5, size: 5 * scale });
    this.burst(x, y, Math.round(10 * scale), { color: '#ff6b35', speed: 150 * scale, life: 0.65, size: 6 * scale });
    this.burst(x, y, Math.round(8 * scale), { color: '#c8c8d8', speed: 300 * scale, life: 0.35, size: 3 * scale });
  }

  update(dt) {
    for (const p of this.pool) {
      if (p.dead) continue;
      p.life -= dt;
      if (p.life <= 0) { p.dead = true; continue; }
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d; p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx) {
    for (const p of this.pool) {
      if (p.dead) continue;
      const t = p.life / p.maxLife;
      ctx.globalAlpha = t;
      ctx.fillStyle = p.color;
      const s = p.size * (0.4 + 0.6 * t);
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }
}

export class FloatingTexts {
  constructor() { this.items = []; }

  add(x, y, text, color = '#ffe066') {
    this.items.push({ x, y, text, color, life: 0.9 });
  }

  update(dt) {
    for (const t of this.items) { t.life -= dt; t.y -= 40 * dt; }
    this.items = this.items.filter((t) => t.life > 0);
  }

  draw(ctx) {
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.textAlign = 'center';
    for (const t of this.items) {
      ctx.globalAlpha = Math.min(1, t.life * 2);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
