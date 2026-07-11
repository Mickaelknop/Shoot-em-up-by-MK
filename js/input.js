// Contrôles tactiles (pointer events) + clavier pour le test sur ordinateur.
import { PLAYER } from './constants.js';

export class Input {
  constructor(canvas, game) {
    this.game = game;
    this.canvas = canvas;
    this.active = false;        // un doigt est posé
    this.targetX = 0;           // cible du vaisseau en coordonnées jeu
    this.targetY = 0;
    this.keys = new Set();
    this.pointerId = null;

    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    canvas.addEventListener('pointerup', (e) => this.onUp(e));
    canvas.addEventListener('pointercancel', (e) => this.onUp(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key);
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') game.togglePause();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key));
  }

  toGame(e) {
    const r = this.canvas.getBoundingClientRect();
    const s = this.game.viewScale;
    return {
      x: (e.clientX - r.left - (this.game.offsetX || 0)) / s,
      y: (e.clientY - r.top) / s,
    };
  }

  onDown(e) {
    if (this.pointerId !== null) return;
    this.pointerId = e.pointerId;
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* pointeur synthétique */ }
    const p = this.toGame(e);
    this.active = true;
    this.targetX = p.x;
    this.targetY = p.y + PLAYER.fingerOffsetY;
  }

  onMove(e) {
    if (e.pointerId !== this.pointerId) return;
    const p = this.toGame(e);
    this.targetX = p.x;
    this.targetY = p.y + PLAYER.fingerOffsetY;
  }

  onUp(e) {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.active = false;
  }

  // Déplacement clavier (desktop) : renvoie un vecteur [-1..1]
  keyboardVector() {
    let x = 0, y = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('q') || this.keys.has('a')) x -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('d')) x += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('z') || this.keys.has('w')) y -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('s')) y += 1;
    return { x, y };
  }
}
