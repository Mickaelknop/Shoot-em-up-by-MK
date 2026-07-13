// Vaisseau du joueur : suivi du doigt, tir automatique, armes, bouclier, vies.
import { PLAYER } from './constants.js';
import { images } from './assets.js';
import { sfx } from './audio.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.reset(true);
  }

  reset(full) {
    const g = this.game;
    this.x = g.w / 2;
    this.y = g.h - 140;
    this.radius = PLAYER.radius;
    this.fireTimer = 0;
    this.invincible = PLAYER.invincibleTime;
    this.engineT = 0;
    if (full) {
      this.lives = PLAYER.lives;
      this.weapon = 1;
      this.shield = 0;
      this.alive = true;
    }
  }

  update(dt) {
    const g = this.game;
    const input = g.input;

    // Suivi du doigt (lissé), sinon clavier
    if (input.active) {
      const k = Math.min(1, dt * PLAYER.speed);
      this.x += (input.targetX - this.x) * k;
      this.y += (input.targetY - this.y) * k;
    } else {
      const v = input.keyboardVector();
      this.x += v.x * 340 * dt;
      this.y += v.y * 340 * dt;
    }
    const margin = 26;
    this.x = Math.max(margin, Math.min(g.w - margin, this.x));
    this.y = Math.max(margin + 40, Math.min(g.h - margin, this.y));

    if (this.invincible > 0) this.invincible -= dt;

    // Tir automatique
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fire();
      const rate = PLAYER.fireRate * (this.weapon >= 5 ? 1.25 : 1);
      this.fireTimer = 1 / rate;
    }

    // Flammes réacteur
    this.engineT += dt;
    if (this.engineT > 0.03) {
      this.engineT = 0;
      g.particles.spawn(this.x + (Math.random() - 0.5) * 10, this.y + 30, {
        color: Math.random() < 0.5 ? '#5fd8ff' : '#ff9d2e',
        angle: Math.PI / 2 + (Math.random() - 0.5) * 0.4,
        speed: 160, life: 0.25, size: 4, drag: 0.95,
      });
    }
  }

  fire() {
    const g = this.game;
    const B = g.playerBullets;
    const s = PLAYER.bulletSpeed;
    const x = this.x, y = this.y - 26;
    switch (this.weapon) {
      case 1:
        B.fire(x, y, 0, -s);
        break;
      case 2:
        B.fire(x - 11, y, 0, -s);
        B.fire(x + 11, y, 0, -s);
        break;
      case 3:
        B.fire(x, y - 6, 0, -s);
        B.fire(x - 13, y, -s * 0.12, -s);
        B.fire(x + 13, y, s * 0.12, -s);
        break;
      case 4:
        B.fire(x - 8, y - 6, 0, -s);
        B.fire(x + 8, y - 6, 0, -s);
        B.fire(x - 18, y, -s * 0.28, -s * 0.92);
        B.fire(x + 18, y, s * 0.28, -s * 0.92);
        break;
      default: // 5
        B.fire(x, y - 8, 0, -s, { dmg: 2, r: 7 });
        B.fire(x - 12, y - 4, 0, -s);
        B.fire(x + 12, y - 4, 0, -s);
        B.fire(x - 20, y, -s * 0.34, -s * 0.9);
        B.fire(x + 20, y, s * 0.34, -s * 0.9);
        break;
    }
    sfx.shoot();
  }

  hit() {
    const g = this.game;
    if (this.invincible > 0) return;
    if (this.shield > 0) {
      this.shield--;
      this.invincible = 0.8;
      sfx.shieldHit();
      g.particles.burst(this.x, this.y, 14, { color: '#38c8ff', speed: 260, life: 0.4, size: 4 });
      return;
    }
    this.lives--;
    this.weapon = Math.max(1, this.weapon - 1);
    sfx.playerHit();
    sfx.explosion();
    g.particles.explosion(this.x, this.y, 1.4);
    g.shake(0.45, 10);
    if (this.lives <= 0) {
      this.alive = false;
      g.onPlayerDeath();
    } else {
      this.reset(false);
    }
  }

  draw(ctx, time) {
    if (this.invincible > 0 && Math.floor(time * 14) % 2 === 0 && this.game.state === 'playing') {
      ctx.globalAlpha = 0.35;
    }
    const img = images[this.game.shipDef.img] || images.player;
    const d = PLAYER.drawSize;
    const h = d * (img.height / img.width);
    ctx.drawImage(img, this.x - d / 2, this.y - h / 2, d, h);
    ctx.globalAlpha = 1;

    // Bouclier
    if (this.shield > 0) {
      ctx.strokeStyle = `rgba(70, 200, 255, ${0.5 + Math.sin(time * 8) * 0.25})`;
      ctx.lineWidth = 2 + this.shield;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 38 + Math.sin(time * 8) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
