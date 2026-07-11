// Boss et mid-boss : entrée en scène, phases d'attaque, barre de vie, mort en chaîne.
import { MIDBOSS, BOSS, difficulty } from './constants.js';
import { images } from './assets.js';
import { sfx } from './audio.js';
import { aimAt, fireRing, fireFan } from './bullets.js';

export class Boss {
  constructor(game, isFinal, def) {
    this.game = game;
    this.isFinal = isFinal;
    this.def = def || (isFinal ? BOSS : MIDBOSS);
    this.maxHp = this.def.hp;
    this.hp = this.maxHp;
    this.x = game.w / 2;
    this.y = -this.def.drawSize / 2;
    this.targetY = isFinal ? 190 : 160;
    this.radius = this.def.radius;
    this.contactRadius = this.def.contactRadius;
    this.t = 0;
    this.entered = false;
    this.flash = 0;
    this.spiral = 0;
    this.atk = { fan: 0, ring: 2.5, stream: 0.8 };
    this.dead = false;
    this.dying = 0;
  }

  get phase() {
    const r = this.hp / this.maxHp;
    if (r > 0.66) return 1;
    if (r > 0.33) return 2;
    return 3;
  }

  update(dt) {
    const g = this.game;
    this.t += dt;
    if (this.flash > 0) this.flash -= dt;

    if (this.dying > 0) {
      this.dying -= dt;
      if (Math.random() < 0.35) {
        g.particles.explosion(
          this.x + (Math.random() - 0.5) * this.def.drawSize * 0.8,
          this.y + (Math.random() - 0.5) * this.def.drawSize * 0.8,
          1.2
        );
        sfx.explosion();
      }
      if (this.dying <= 0) {
        this.dead = true;
        g.particles.explosion(this.x, this.y, 3.2);
        sfx.bigExplosion();
        g.shake(0.8, 18);
        g.onBossKilled(this);
      }
      return;
    }

    // Entrée en scène
    if (!this.entered) {
      this.y += 90 * dt;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.entered = true;
      }
      return;
    }

    // Balancement latéral
    const sway = this.phase === 3 ? 1.5 : 1;
    this.x = g.w / 2 + Math.sin(this.t * 0.55 * sway) * (g.w * 0.24);
    this.y = this.targetY + Math.sin(this.t * 0.9) * 18;

    this.attack(dt);
  }

  attack(dt) {
    const g = this.game;
    const diff = difficulty(g.levelTime);
    const p = g.player;
    const B = g.enemyBullets;
    const speedBase = (this.isFinal ? 205 : 185) * diff;
    const phase = this.phase;

    // Éventail visé
    this.atk.fan -= dt;
    if (this.atk.fan <= 0) {
      this.atk.fan = (this.isFinal ? 1.5 : 1.9) / (1 + (phase - 1) * 0.25);
      const a = Math.atan2(p.y - this.y, p.x - this.x);
      const n = 3 + phase * (this.isFinal ? 2 : 1);
      fireFan(B, this.x, this.y + 40, a, n, 0.75 + phase * 0.12, speedBase, 0);
    }

    // Anneaux
    this.atk.ring -= dt;
    if (this.atk.ring <= 0 && phase >= (this.isFinal ? 1 : 2)) {
      this.atk.ring = this.isFinal ? (4.6 - phase * 0.7) : 4.4;
      const n = this.isFinal ? 14 + phase * 4 : 12;
      fireRing(B, this.x, this.y + 10, n, speedBase * 0.72, this.t, 1);
    }

    // Spirale (phase avancée)
    if (phase >= 2 && this.isFinal) {
      this.atk.stream -= dt;
      if (this.atk.stream <= 0) {
        this.atk.stream = phase === 3 ? 0.11 : 0.16;
        this.spiral += phase === 3 ? 0.42 : 0.3;
        for (const s of [1, -1]) {
          const a = this.spiral * s + Math.PI / 2;
          B.fire(this.x, this.y + 20, Math.cos(a) * speedBase * 0.8, Math.sin(a) * speedBase * 0.8, { variant: 1 });
        }
      }
    } else if (phase === 3 && !this.isFinal) {
      // Mid-boss enragé : double flux visé
      this.atk.stream -= dt;
      if (this.atk.stream <= 0) {
        this.atk.stream = 0.45;
        const v = aimAt(this.x, this.y, p.x, p.y, speedBase * 1.1);
        B.fire(this.x - 30, this.y + 30, v.vx, v.vy, { variant: 1 });
        B.fire(this.x + 30, this.y + 30, v.vx, v.vy, { variant: 1 });
      }
    }
  }

  hit(dmg) {
    if (this.dying > 0 || !this.entered) return false;
    this.hp -= dmg;
    this.flash = 0.06;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dying = this.isFinal ? 2.4 : 1.6;
      this.game.enemyBullets.clear();
    }
    return true;
  }

  draw(ctx, time) {
    const img = images[this.def.img];
    const d = this.def.drawSize;
    const h = d * (img.height / img.width);
    if (this.dying > 0 && Math.floor(time * 18) % 2 === 0) ctx.globalAlpha = 0.6;
    if (this.flash > 0) {
      ctx.save();
      ctx.filter = 'brightness(2.4)';
      ctx.drawImage(img, this.x - d / 2, this.y - h / 2, d, h);
      ctx.restore();
    } else {
      ctx.drawImage(img, this.x - d / 2, this.y - h / 2, d, h);
    }
    ctx.globalAlpha = 1;
  }

  drawHealthBar(ctx, gameW) {
    const w = gameW - 60;
    const x = 30, y = 54;
    const r = this.hp / this.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 2, y - 2, w + 4, 12);
    ctx.fillStyle = '#3a1020';
    ctx.fillRect(x, y, w, 8);
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#ff3355');
    grad.addColorStop(1, '#ff9944');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w * r, 8);
    ctx.fillStyle = '#ffccd5';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(this.def.name || (this.isFinal ? 'BOSS' : 'GARDIEN'), x, y - 6);
  }
}
