// Classe principale : machine à états, boucle de jeu, collisions, rendu, HUD.
import { GAME_W, MIN_H, MAX_H, PLAYER, SCORE_POWERUP, SCORE_GEM } from './constants.js';
import { images } from './assets.js';
import { Input } from './input.js';
import { Player } from './player.js';
import { Bullets } from './bullets.js';
import { Powerups } from './powerups.js';
import { Particles, FloatingTexts } from './particles.js';
import { createEnemy, updateEnemy, drawEnemy } from './enemies.js';
import { Boss } from './boss.js';
import { LEVELS, SHIPS, LevelRunner } from './level.js';
import { sfx, playMusic, stopMusic } from './audio.js';
import { getHiscore, setHiscore } from './storage.js';

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = ui;                 // callbacks vers les écrans HTML
    this.state = 'title';         // title | playing | paused | gameover | victory
    this.viewScale = 1;
    this.w = GAME_W;
    this.h = 854;
    this.time = 0;                // temps global (animations)
    this.levelTime = 0;           // temps de jeu effectif
    this.hiscore = getHiscore();

    this.input = new Input(canvas, this);
    this.particles = new Particles();
    this.texts = new FloatingTexts();
    this.playerBullets = new Bullets(false);
    this.enemyBullets = new Bullets(true);
    this.powerups = new Powerups();
    this.player = new Player(this);
    this.enemies = [];
    this.boss = null;
    this.pendingSpawns = [];      // [{at, fn}] — spawns différés du script de niveau
    this.level = null;
    this.levelIndex = 0;          // niveau en cours (index dans LEVELS)
    this.levelDef = LEVELS[0];
    this.startLevelIndex = 0;     // niveau de départ de la partie (pour REJOUER)
    this.levelBannerT = 0;        // bannière « NIVEAU X » en début de niveau
    this.levelStartScore = 0;     // score au début du niveau courant
    this.levelResults = [];       // [{level, score}] points marqués par niveau
    this.shipIndex = 0;           // vaisseau choisi (index dans SHIPS) — cosmétique
    this.shipDef = SHIPS[0];

    this.score = 0;
    this.shakeT = 0;
    this.shakeAmp = 0;
    this.warningT = 0;            // bannière "WARNING"
    this.stars = this.makeStars();
    this.bgScroll = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });
  }

  /* ---------- dimensionnement ---------- */
  resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Fenêtre masquée ou en transition (clavier virtuel, rotation…) :
    // dimensions nulles => on conserve la géométrie précédente pour ne pas
    // corrompre le jeu avec des NaN.
    if (!(vw > 0) || !(vh > 0)) return;
    // Échelle : remplit la largeur en portrait ; sur écran large (desktop),
    // s'adapte à la hauteur et centre la zone de jeu (letterbox).
    this.viewScale = Math.min(vw / GAME_W, vh / MIN_H);
    this.w = GAME_W;
    this.h = Math.min(MAX_H, vh / this.viewScale);
    this.offsetX = Math.max(0, (vw - GAME_W * this.viewScale) / 2);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(vw * this.dpr);
    this.canvas.height = Math.round(vh * this.dpr);
    this.renderScale = this.viewScale * this.dpr;
  }

  makeStars() {
    const stars = [];
    for (let i = 0; i < 70; i++) {
      stars.push({
        x: Math.random() * GAME_W,
        y: Math.random() * MAX_H,
        speed: 30 + Math.random() * 120,
        size: Math.random() < 0.8 ? 1.5 : 2.5,
        tw: Math.random() * Math.PI * 2,
      });
    }
    return stars;
  }

  /* ---------- machine à états ---------- */
  // Sélection du niveau depuis l'écran titre (change aussi le fond en aperçu).
  selectLevel(index) {
    this.levelIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
    this.levelDef = LEVELS[this.levelIndex];
  }

  // Choix du vaisseau (cosmétique) — s'applique à n'importe quel niveau.
  selectShip(index) {
    this.shipIndex = Math.max(0, Math.min(SHIPS.length - 1, index));
    this.shipDef = SHIPS[this.shipIndex];
  }

  // Démarre une nouvelle partie au niveau choisi. Les niveaux suivants
  // s'enchaînent ensuite automatiquement (voir onBossKilled → nextLevel).
  startGame(levelIndex = this.levelIndex) {
    this.selectLevel(levelIndex);
    this.startLevelIndex = this.levelIndex;   // point de reprise pour REJOUER
    this.score = 0;
    this.levelResults = [];                   // remis à zéro à chaque nouvelle partie
    this._beginLevel(true);
  }

  // Enregistre les points marqués dans le niveau courant (score de ce niveau
  // seul = cumul actuel moins le score d'entrée). Appelé à la fin d'un niveau
  // (boss final abattu) ou à la mort du joueur.
  recordLevelResult() {
    const delta = this.score - this.levelStartScore;
    if (delta > 0) this.levelResults.push({ level: this.levelDef.id, score: delta });
  }

  // Passe au niveau suivant en conservant le score cumulé et l'état du vaisseau
  // (vies, arme, bouclier). Appelé après la mort du boss final d'un niveau.
  nextLevel() {
    this.selectLevel(this.levelIndex + 1);
    this._beginLevel(false);
  }

  // Prépare et lance le niveau courant. `freshPlayer` : true = nouveau vaisseau
  // (début de partie), false = on garde vies/arme/bouclier du niveau précédent.
  _beginLevel(freshPlayer) {
    this.state = 'playing';
    this.levelTime = 0;
    this.enemies = [];
    this.boss = null;
    this.pendingSpawns = [];
    this.deferred = [];
    this.playerBullets.clear();
    this.enemyBullets.clear();
    this.powerups.items = [];
    if (freshPlayer) {
      this.player = new Player(this);
    } else {
      const keep = { lives: this.player.lives, weapon: this.player.weapon, shield: this.player.shield };
      this.player = new Player(this);
      this.player.lives = keep.lives;
      this.player.weapon = keep.weapon;
      this.player.shield = keep.shield;
    }
    this.level = new LevelRunner(this, this.levelDef.build(this));
    this.warningT = 0;
    this.bossScene = false;   // décor spécial (station + flotte) à la scène du boss
    this.levelBannerT = 2.4;  // annonce « NIVEAU X »
    this.levelStartScore = this.score;   // base pour le score de ce niveau
    // Style visuel des tirs selon le niveau (lasers verts/rouges pour le niveau SW)
    this.playerBullets.style = this.levelDef.bolt || 'default';
    this.enemyBullets.style = this.levelDef.enemyBolt || 'default';
    playMusic(this.levelDef.song);
    this.ui.showScreen(null);
    this.ui.setPauseVisible(true);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    stopMusic();
    this.ui.showScreen('pause');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    playMusic(this.boss && this.boss.isFinal ? 'boss' : this.levelDef.song);
    this.ui.showScreen(null);
  }

  togglePause() {
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  quitToTitle() {
    this.state = 'title';
    stopMusic();
    this.ui.setPauseVisible(false);
    this.ui.showScreen('title', { hiscore: this.hiscore });
  }

  onPlayerDeath() {
    stopMusic();
    this.ui.setPauseVisible(false);
    this.recordLevelResult();   // points partiels du niveau où le joueur est mort
    const record = this.commitScore();
    setTimeout(() => {
      this.state = 'gameover';
      this.ui.showScreen('gameover', { score: this.score, hiscore: this.hiscore, record });
    }, 1400);
    this.state = 'dying';
  }

  victory() {
    stopMusic();
    this.ui.setPauseVisible(false);
    const record = this.commitScore();
    setTimeout(() => {
      this.state = 'victory';
      this.ui.showScreen('victory', { score: this.score, hiscore: this.hiscore, record });
    }, 2600);
    this.state = 'won';
  }

  commitScore() {
    const record = this.score > this.hiscore;
    if (record) {
      this.hiscore = this.score;
      setHiscore(this.score);
    }
    return record;
  }

  /* ---------- spawns ---------- */
  queueSpawn(delay, fn) {
    this.pendingSpawns.push({ at: this.levelTime + delay, fn });
  }

  spawnEnemy(type, x, y, opts) {
    this.enemies.push(createEnemy(type, x, y, opts));
  }

  startBoss(isFinal) {
    this.warningT = 2.6;
    sfx.bossWarning();
    // Le décor de boss (station + flotte impériale) apparaît dès l'alerte du boss final.
    if (isFinal && this.levelDef.bossBg) this.bossScene = true;
    setTimeoutSafe(this, 2.2, () => {
      this.boss = new Boss(this, isFinal, isFinal ? this.levelDef.boss : this.levelDef.midboss);
      if (isFinal) playMusic('boss');
    });
  }

  onBossKilled(boss) {
    this.addScore(boss.def.score, boss.x, boss.y);
    if (boss.isFinal) {
      this.boss = null;
      this.recordLevelResult();   // points de ce niveau (boss inclus)
      // Niveau suivant s'il existe : enchaînement + score cumulé. Sinon victoire.
      if (this.levelIndex + 1 < LEVELS.length) {
        this.nextLevel();
      } else {
        this.victory();
      }
    } else {
      this.boss = null;
      this.powerups.spawn(boss.x - 30, boss.y, 'W');
      this.powerups.spawn(boss.x + 30, boss.y, 'S');
      playMusic(this.levelDef.song);
    }
  }

  addScore(pts, x, y) {
    this.score += pts;
    if (x !== undefined) this.texts.add(x, y, String(pts));
  }

  shake(t, amp) {
    this.shakeT = Math.max(this.shakeT, t);
    this.shakeAmp = Math.max(this.shakeAmp, amp);
  }

  /* ---------- boucle ---------- */
  update(dt) {
    this.time += dt;
    this.bgScroll += dt * 40;
    for (const s of this.stars) {
      s.y += s.speed * dt;
      if (s.y > this.h + 4) { s.y = -4; s.x = Math.random() * this.w; }
    }

    const active = this.state === 'playing';
    const running = active || this.state === 'dying' || this.state === 'won';
    if (!running) return;

    if (active) {
      this.levelTime += dt;
      this.level.update(dt);

      // Spawns différés
      for (const s of this.pendingSpawns) {
        if (this.levelTime >= s.at) { s.fn(); s.done = true; }
      }
      this.pendingSpawns = this.pendingSpawns.filter((s) => !s.done);

      // Timers différés (bannière boss)
      if (this.deferred) {
        for (const d of this.deferred) {
          d.t -= dt;
          if (d.t <= 0) { d.fn(); d.done = true; }
        }
        this.deferred = this.deferred.filter((d) => !d.done);
      }

      if (this.warningT > 0) this.warningT -= dt;
      if (this.levelBannerT > 0) this.levelBannerT -= dt;
      if (this.player.alive) this.player.update(dt);

      for (const e of this.enemies) updateEnemy(e, dt, this);
      this.enemies = this.enemies.filter((e) => !e.dead);

      if (this.boss) this.boss.update(dt);
      this.powerups.update(dt, this);
      this.checkCollisions();
    } else if (this.state === 'won' && this.boss) {
      this.boss.update(dt);
    }

    this.playerBullets.update(dt, this);
    this.enemyBullets.update(dt, this);
    this.particles.update(dt);
    this.texts.update(dt);
    if (this.shakeT > 0) this.shakeT -= dt;
  }

  /* ---------- collisions ---------- */
  checkCollisions() {
    const p = this.player;

    // Tirs joueur → ennemis / boss
    for (const b of this.playerBullets.pool) {
      if (b.dead) continue;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (dist2(b, e) < sq(e.radius + b.r)) {
          b.dead = true;
          e.hp -= b.dmg;
          e.flash = 0.05;
          sfx.enemyHit();
          this.particles.spawn(b.x, b.y, { color: '#9fe8ff', speed: 90, life: 0.2, size: 3 });
          if (e.hp <= 0) this.killEnemy(e);
          break;
        }
      }
      if (!b.dead && this.boss && dist2(b, this.boss) < sq(this.boss.radius + b.r)) {
        if (this.boss.hit(b.dmg)) {
          b.dead = true;
          sfx.enemyHit();
          this.particles.spawn(b.x, b.y, { color: '#ffd166', speed: 110, life: 0.25, size: 3 });
        }
      }
    }

    if (!p.alive) return;

    // Tirs ennemis → joueur
    for (const b of this.enemyBullets.pool) {
      if (b.dead) continue;
      if (dist2(b, p) < sq(p.radius + b.r)) {
        b.dead = true;
        p.hit();
        if (!p.alive) return;
      }
    }

    // Contact ennemis → joueur
    for (const e of this.enemies) {
      if (!e.dead && dist2(e, p) < sq(e.radius + p.radius)) {
        e.hp -= 3;
        if (e.hp <= 0) this.killEnemy(e);
        p.hit();
        if (!p.alive) return;
      }
    }
    if (this.boss && this.boss.entered && this.boss.dying <= 0 &&
        dist2(this.boss, p) < sq(this.boss.contactRadius + p.radius)) {
      p.hit();
      if (!p.alive) return;
    }

    // Bonus → joueur (rayon d'attraction généreux pour le tactile)
    for (const pu of this.powerups.items) {
      if (dist2(pu, p) < sq(pu.r + p.radius + 14)) {
        pu.dead = true;
        this.applyPowerup(pu);
      }
    }
  }

  killEnemy(e) {
    e.dead = true;
    this.addScore(e.score, e.x, e.y);
    this.particles.explosion(e.x, e.y, e.def.behavior === 'heavy' ? 1.8 : 1);
    sfx.explosion();
    if (e.def.behavior === 'heavy') this.shake(0.25, 6);
    if (e.drop) this.powerups.spawn(e.x, e.y, e.drop);
    else if (e.def.behavior === 'heavy' && Math.random() < 0.65)
      this.powerups.spawnRandom(e.x, e.y, this.levelDef.bonusPool);
    else if (e.dropGem && Math.random() < 0.35) this.powerups.spawn(e.x, e.y, 'P');
  }

  applyPowerup(pu) {
    const p = this.player;
    switch (pu.type) {
      case 'W':
        if (p.weapon < PLAYER.maxWeapon) {
          p.weapon++;
          this.texts.add(pu.x, pu.y, 'ARME +', '#ff9d2e');
        } else {
          this.addScore(SCORE_POWERUP, pu.x, pu.y);
        }
        sfx.powerup();
        break;
      case 'S':
        p.shield = Math.min(PLAYER.shieldMax, p.shield + 2);
        this.texts.add(pu.x, pu.y, 'BOUCLIER', '#38c8ff');
        sfx.powerup();
        break;
      case 'L':
        p.lives = Math.min(6, p.lives + 1);
        this.texts.add(pu.x, pu.y, '1UP !', '#63ff7e');
        sfx.extraLife();
        break;
      case 'P':
        this.addScore(SCORE_GEM, pu.x, pu.y);
        sfx.powerup();
        break;
      case 'B': {
        // Smart bomb (télécommande) : efface tous les tirs ennemis
        // et inflige des dégâts à tout ce qui est à l'écran.
        this.enemyBullets.clear();
        for (const e of this.enemies) {
          if (e.dead) continue;
          e.hp -= 6;
          e.flash = 0.1;
          if (e.hp <= 0) this.killEnemy(e);
        }
        if (this.boss && this.boss.entered) this.boss.hit(10);
        this.texts.add(pu.x, pu.y, 'ZAP !', '#ff5e9c');
        this.shake(0.5, 12);
        sfx.smartBomb();
        break;
      }
      case 'M':
        // Masque de sommeil : invincibilité courte
        p.invincible = Math.max(p.invincible, 6);
        this.texts.add(pu.x, pu.y, 'Zzz… INVINCIBLE', '#b48cff');
        sfx.extraLife();
        break;
    }
  }

  /* ---------- rendu ---------- */
  draw() {
    const ctx = this.ctx;
    // Bandes latérales (desktop) : fond noir sous la zone de jeu centrée
    if (this.offsetX > 0) {
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = '#020208';
      ctx.fillRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
    }
    ctx.setTransform(this.renderScale, 0, 0, this.renderScale, this.offsetX * this.dpr, 0);

    // Secousse d'écran
    if (this.shakeT > 0) {
      const a = this.shakeAmp * (this.shakeT / 0.5);
      ctx.fillStyle = '#05030f';
      ctx.fillRect(-30, -30, this.w + 60, this.h + 60);
      ctx.translate((Math.random() - 0.5) * a, (Math.random() - 0.5) * a);
    }

    // Décor de la scène du boss (station + flotte) : image de couverture fixe,
    // sinon fond défilant neutre du niveau. Le niveau Bedroom Dimension utilise
    // un fond psychédélique 100 % procédural (tunnel animé).
    const bossBg = this.bossScene ? images[this.levelDef.bossBg] : null;
    if (this.levelDef.bgFx === 'psychedelic') {
      this.drawPsychedelicBg(ctx);
    } else if (bossBg) {
      const s = Math.max(this.w / bossBg.width, this.h / bossBg.height);
      const dw = bossBg.width * s, dh = bossBg.height * s;
      const drift = Math.sin(this.time * 0.15) * 8;
      ctx.drawImage(bossBg, (this.w - dw) / 2, (this.h - dh) / 2 + drift, dw, dh);
    } else {
      const bg = images[this.levelDef.bg];
      const bgH = this.w * (bg.height / bg.width);
      const off = this.bgScroll % bgH;
      ctx.drawImage(bg, 0, off - bgH, this.w, bgH + 1);
      ctx.drawImage(bg, 0, off, this.w, bgH + 1);
      if (off + bgH < this.h) ctx.drawImage(bg, 0, off + bgH, this.w, bgH + 1);
    }

    // Étoiles parallaxe
    for (const s of this.stars) {
      const tw = 0.5 + 0.5 * Math.sin(this.time * 3 + s.tw);
      ctx.globalAlpha = 0.35 + 0.5 * tw;
      ctx.fillStyle = s.speed > 100 ? '#cfe8ff' : '#8fa3c8';
      ctx.fillRect(s.x, s.y, s.size, s.size + s.speed * 0.012);
    }
    ctx.globalAlpha = 1;

    const inGame = this.state === 'playing' || this.state === 'paused' ||
                   this.state === 'dying' || this.state === 'won';
    if (inGame) {
      this.powerups.draw(ctx, this.time, this.levelDef.powerupSkin || null);
      for (const e of this.enemies) drawEnemy(e, ctx);
      if (this.boss) this.boss.draw(ctx, this.time);
      this.enemyBullets.draw(ctx);
      if (this.player.alive) this.player.draw(ctx, this.time);
      this.playerBullets.draw(ctx);
      this.particles.draw(ctx);
      this.texts.draw(ctx);
      this.drawHUD(ctx);
    } else {
      this.particles.draw(ctx);
    }
  }

  // Fond « quatrième dimension » : tunnel d'anneaux arc-en-ciel qui foncent vers
  // la caméra, rayons en rotation, objets du quotidien flottants. S'emballe
  // pendant les phases avancées du boss final (« le fond devient fou »).
  drawPsychedelicBg(ctx) {
    const t = this.time;
    const w = this.w, h = this.h;
    const boss = this.boss && this.boss.isFinal && this.boss.entered ? this.boss : null;
    const mad = boss ? (boss.phase >= 3 ? 2.4 : 1.6) : 1;

    // Base sombre violette
    ctx.fillStyle = '#0b0418';
    ctx.fillRect(-30, -30, w + 60, h + 60);

    // Centre du tunnel, légèrement flottant
    const cx = w / 2 + Math.sin(t * 0.6) * 46 * mad;
    const cy = h * 0.42 + Math.cos(t * 0.45) * 34 * mad;
    const maxR = Math.hypot(w, h) * 0.72;

    // Rayons en rotation (spirale lumineuse)
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.lineWidth = 3;
    for (let k = 0; k < 10; k++) {
      const a = t * 0.5 * mad + (k / 10) * Math.PI * 2;
      ctx.strokeStyle = `hsl(${(k * 36 + t * 50 * mad) % 360}, 95%, 62%)`;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.stroke();
    }
    ctx.restore();

    // Anneaux du tunnel : progression quadratique = effet de vitesse 3D
    for (let i = 0; i < 14; i++) {
      const p = ((i / 14) + t * 0.14 * mad) % 1;
      const r = p * p * maxR + 4;
      const hue = (i * 46 + t * 70 * mad) % 360;
      ctx.globalAlpha = 0.10 + p * 0.30;
      ctx.strokeStyle = `hsl(${hue}, 100%, ${52 + p * 18}%)`;
      ctx.lineWidth = 2 + p * 22;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Objets de la chambre en apesanteur (déco, jamais dangereux)
    if (!this.bedroomDeco) {
      const set = ['🛏️', '🧦', '⏰', '🪥', '☕', '📚', '👟', '🧸', '🎮', '🥐', '🧺', '👕'];
      this.bedroomDeco = set.map((emoji, i) => ({
        emoji,
        x: (i * 137) % 440 + 20,
        y0: (i * 263) % 900,
        speed: 26 + (i * 53) % 60,
        size: 22 + (i * 29) % 22,
        rot: 0.3 + (i % 5) * 0.22,
        ph: i * 1.7,
      }));
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const d of this.bedroomDeco) {
      const y = (d.y0 + t * d.speed * mad) % (h + 90) - 45;
      const x = d.x + Math.sin(t * 0.8 + d.ph) * 26;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(t * d.rot + d.ph) * 0.6);
      ctx.globalAlpha = 0.5;
      ctx.font = `${d.size}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      ctx.fillText(d.emoji, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.textBaseline = 'alphabetic';
  }

  drawHUD(ctx) {
    ctx.font = 'bold 17px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, this.w, 36);
    ctx.fillStyle = '#eaf6ff';
    ctx.fillText('SCORE ' + this.score, 10, 24);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9fb4d8';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText('HI ' + Math.max(this.hiscore, this.score), this.w / 2 + 20, 23);

    // Vies (mini vaisseaux) + niveau d'arme, en bas à gauche
    const img = images[this.shipDef.img] || images.player;
    for (let i = 0; i < this.player.lives; i++) {
      ctx.globalAlpha = 0.9;
      ctx.drawImage(img, 10 + i * 26, this.h - 38, 20, 20 * (img.height / img.width));
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff9d2e';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText('ARME ' + this.player.weapon, this.w - 10, this.h - 18);

    if (this.boss && this.boss.entered) this.boss.drawHealthBar(ctx, this.w);

    // Bannière WARNING
    if (this.warningT > 0 && Math.floor(this.time * 5) % 2 === 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff3344';
      ctx.font = 'bold 34px "Courier New", monospace';
      ctx.fillText('⚠ WARNING ⚠', this.w / 2, this.h * 0.4);
    }

    // Bannière « NIVEAU X » en début de niveau (fondu sortant)
    if (this.levelBannerT > 0) {
      const a = Math.min(1, this.levelBannerT / 0.5);
      ctx.textAlign = 'center';
      ctx.globalAlpha = a;
      ctx.fillStyle = '#9fe8ff';
      ctx.font = 'bold 20px "Courier New", monospace';
      ctx.fillText('NIVEAU ' + this.levelDef.id, this.w / 2, this.h * 0.36);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px "Courier New", monospace';
      ctx.fillText(this.levelDef.name, this.w / 2, this.h * 0.36 + 30);
      ctx.globalAlpha = 1;
    }
  }
}

/* utilitaires */
function dist2(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy;
}
function sq(v) { return v * v; }

// Timer lié au temps de jeu (gelé pendant la pause), contrairement à setTimeout.
function setTimeoutSafe(game, seconds, fn) {
  if (!game.deferred) game.deferred = [];
  game.deferred.push({ t: seconds, fn });
}
