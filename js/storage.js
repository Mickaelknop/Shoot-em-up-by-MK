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
