// Persistance locale (meilleur score, préférences audio).
import { STORAGE_KEYS } from './constants.js';

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch { return fallback; }
}

function write(key, value) {
  try { localStorage.setItem(key, String(value)); } catch { /* mode privé */ }
}

export function getHiscore() {
  return parseInt(read(STORAGE_KEYS.hiscore, '0'), 10) || 0;
}

export function setHiscore(score) {
  write(STORAGE_KEYS.hiscore, score);
}

export function getMuted() {
  return read(STORAGE_KEYS.muted, '0') === '1';
}

export function setMuted(muted) {
  write(STORAGE_KEYS.muted, muted ? '1' : '0');
}

export function getPseudo() {
  return read(STORAGE_KEYS.pseudo, '');
}

export function setPseudo(pseudo) {
  write(STORAGE_KEYS.pseudo, pseudo);
}

export function getShip() {
  return read(STORAGE_KEYS.ship, '');
}

export function setShip(id) {
  write(STORAGE_KEYS.ship, id);
}

// Jeton anonyme identifiant ce navigateur comme « propriétaire » d'un pseudo.
// Généré une fois et conservé localement (jamais exposé publiquement).
export function getOwner() {
  let o = read(STORAGE_KEYS.owner, '');
  if (!o) {
    o = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'own-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
    write(STORAGE_KEYS.owner, o);
  }
  return o;
}
