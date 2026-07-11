// Couche d'accès au classement en ligne via l'API REST de Supabase (PostgREST).
// Aucune dépendance : uniquement fetch(). Toutes les fonctions échouent en
// douceur (retour null / false) pour ne jamais bloquer le jeu si le réseau
// est indisponible.
import {
  SUPABASE_URL, SUPABASE_ANON_KEY, LEADERBOARD_TABLE, LEADERBOARD_SIZE,
  PSEUDO_MIN, PSEUDO_MAX, PSEUDO_REGEX,
} from './config.js';

const REST = `${SUPABASE_URL}/rest/v1/${LEADERBOARD_TABLE}`;
const HEADERS = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

function withTimeout(ms) {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, done: () => clearTimeout(id) };
}

// Valide et nettoie un pseudo. Renvoie { ok, value, error }.
export function validatePseudo(raw) {
  const value = (raw || '').trim();
  if (value.length < PSEUDO_MIN) return { ok: false, error: `Minimum ${PSEUDO_MIN} caractères` };
  if (value.length > PSEUDO_MAX) return { ok: false, error: `Maximum ${PSEUDO_MAX} caractères` };
  if (!PSEUDO_REGEX.test(value)) return { ok: false, error: 'Caractères non autorisés' };
  return { ok: true, value };
}

// Appel générique d'une fonction RPC Supabase (PostgREST).
async function rpc(fn, body) {
  const t = withTimeout(8000);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: t.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    t.done();
  }
}

// Disponibilité d'un pseudo pour ce propriétaire.
// Renvoie 'available' | 'owned' | 'taken' | 'invalid' | null (erreur réseau).
export async function checkPseudo(pseudo, owner) {
  const v = validatePseudo(pseudo);
  if (!v.ok) return 'invalid';
  return await rpc('nova_check_pseudo', { p_pseudo: v.value, p_owner: owner });
}

// Soumet un score via la fonction serveur (une ligne par pseudo, meilleur conservé).
// Renvoie { status, best } — status : inserted|updated|not_improved|taken|invalid — ou null.
export async function submitScore(pseudo, score, owner) {
  const v = validatePseudo(pseudo);
  if (!v.ok) return null;
  const s = Math.max(0, Math.min(100000000, Math.round(score)));
  return await rpc('nova_submit_score', { p_pseudo: v.value, p_score: s, p_owner: owner });
}

// Récupère les N meilleurs scores. Renvoie un tableau [{pseudo, score}] ou null.
export async function fetchTop(limit = LEADERBOARD_SIZE) {
  const url = `${REST}?select=pseudo,score&order=score.desc,created_at.asc&limit=${limit}`;
  const t = withTimeout(8000);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: t.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    t.done();
  }
}

// Rang mondial d'un score = (nombre de scores strictement supérieurs) + 1.
// Renvoie { rank, total } ou null.
export async function fetchRank(score) {
  const s = Math.max(0, Math.round(score));
  const t = withTimeout(8000);
  try {
    // total de joueurs
    const totalRes = await fetch(`${REST}?select=id`, {
      headers: { ...HEADERS, 'Prefer': 'count=exact', 'Range': '0-0' },
      signal: t.signal,
    });
    const total = parseCount(totalRes);
    // scores strictement supérieurs
    const betterRes = await fetch(`${REST}?select=id&score=gt.${s}`, {
      headers: { ...HEADERS, 'Prefer': 'count=exact', 'Range': '0-0' },
      signal: t.signal,
    });
    const better = parseCount(betterRes);
    if (better === null) return null;
    return { rank: better + 1, total: total ?? better + 1 };
  } catch {
    return null;
  } finally {
    t.done();
  }
}

// Extrait le total depuis l'en-tête content-range (format "0-0/123").
function parseCount(res) {
  if (!res || !res.ok) return null;
  const cr = res.headers.get('content-range');
  if (!cr) return null;
  const slash = cr.split('/')[1];
  if (!slash || slash === '*') return null;
  const n = parseInt(slash, 10);
  return Number.isFinite(n) ? n : null;
}
