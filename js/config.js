// Configuration du classement en ligne (Supabase).
//
// NOTE SÉCURITÉ : la clé "anon" ci-dessous est PUBLIQUE par conception.
// Elle est destinée à être exposée dans le navigateur. La sécurité repose sur
// les règles RLS (Row-Level Security) appliquées côté serveur par Supabase :
// lecture publique du classement + insertion validée (pseudo 2–12 car., score
// borné), aucune modification ni suppression possible. La clé "service_role"
// (secrète) n'est JAMAIS utilisée ici.

export const SUPABASE_URL = 'https://oyvyxxqufcofvyjmrlqh.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95dnl4eHF1ZmNvZnZ5am1ybHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyODA5NjcsImV4cCI6MjA5ODg1Njk2N30.9SC73rWVMA2ziZLF9mGiYdCv6rLMLpPd162I9RYRdrE';

export const LEADERBOARD_TABLE = 'nova_striker_scores';
export const LEVELBOARD_TABLE = 'nova_striker_level_scores';
export const LEADERBOARD_SIZE = 10;

// Contraintes de pseudo (doivent rester cohérentes avec les contraintes SQL).
export const PSEUDO_MIN = 2;
export const PSEUDO_MAX = 12;
export const PSEUDO_REGEX = /^[\p{L}\p{N} _.\-]{2,12}$/u;
