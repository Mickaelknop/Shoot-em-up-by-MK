// Configuration et équilibrage global du jeu.
// Toutes les coordonnées sont exprimées dans un repère logique de largeur fixe :
// la hauteur dépend du ratio de l'écran (portrait).

export const GAME_W = 480;
export const MIN_H = 640;
export const MAX_H = 1120;

export const PLAYER = {
  speed: 14,            // facteur de lissage du suivi du doigt (lerp/s)
  radius: 14,           // hitbox volontairement réduite (standard shmup)
  drawSize: 64,
  fingerOffsetY: -90,   // le vaisseau vole au-dessus du doigt
  fireRate: 7.5,        // tirs/seconde au niveau 1
  bulletSpeed: 860,
  bulletDamage: 1,
  lives: 3,
  maxWeapon: 5,
  invincibleTime: 2.4,  // secondes après un coup / respawn
  shieldMax: 3,
};

// Chaque type d'ennemi référence un `behavior` réutilisable ('drone' = dérive
// sinusoïdale, 'fighter' = piqué guidé, 'heavy' = barrage en position).
export const ENEMY_TYPES = {
  // — Niveau 1 : Mission Bydo —
  drone: {
    img: 'drone', behavior: 'drone', hp: 2, radius: 20, drawSize: 44, score: 100,
    speed: 130, fireInterval: [2.2, 4.0], bulletSpeed: 170,
  },
  fighter: {
    img: 'fighter', behavior: 'fighter', hp: 4, radius: 22, drawSize: 54, score: 250,
    speed: 200, fireInterval: [1.6, 2.6], bulletSpeed: 210,
  },
  heavy: {
    img: 'heavy', behavior: 'heavy', hp: 26, radius: 40, drawSize: 96, score: 1000,
    speed: 60, fireInterval: [1.7, 2.2], bulletSpeed: 185,
  },
  // — Niveau 2 : hommage à la guerre des étoiles —
  tie: {
    img: 'tie', behavior: 'drone', hp: 2, radius: 20, drawSize: 46, score: 120,
    speed: 145, fireInterval: [2.0, 3.6], bulletSpeed: 180,
  },
  inter: {
    img: 'inter', behavior: 'fighter', hp: 4, radius: 22, drawSize: 54, score: 280,
    speed: 225, fireInterval: [1.5, 2.4], bulletSpeed: 225,
  },
  gunship: {
    img: 'gunship', behavior: 'heavy', hp: 30, radius: 42, drawSize: 100, score: 1200,
    speed: 60, fireInterval: [1.6, 2.1], bulletSpeed: 195,
  },
};

export const MIDBOSS = {
  img: 'midboss', hp: 420, radius: 78, drawSize: 190, score: 5000,
  contactRadius: 70, name: 'GARDIEN',
};

export const BOSS = {
  img: 'boss', hp: 1350, radius: 95, drawSize: 250, score: 20000,
  contactRadius: 85, name: 'BYDO CORE',
};

export const MIDBOSS2 = {
  img: 'destroyer', hp: 500, radius: 80, drawSize: 215, score: 6000,
  contactRadius: 72, name: 'DESTROYER STELLAIRE',
};

export const BOSS2 = {
  img: 'cruiser', hp: 1500, radius: 98, drawSize: 250, score: 25000,
  contactRadius: 92, name: 'CROISEUR IMPÉRIAL',
};

// Types de bonus : poids relatifs pour les drops aléatoires
export const POWERUPS = {
  W: { color: '#ff9d2e', label: 'W' },   // amélioration d'arme
  S: { color: '#38c8ff', label: 'S' },   // bouclier
  L: { color: '#63ff7e', label: '1' },   // vie supplémentaire
  P: { color: '#ffe14d', label: 'P' },   // points
};

export const SCORE_POWERUP = 500;
export const SCORE_GEM = 200;

export const STORAGE_KEYS = {
  hiscore: 'novastriker_hiscore',
  muted: 'novastriker_muted',
  pseudo: 'novastriker_pseudo',
  owner: 'novastriker_owner',   // jeton anonyme de propriété du pseudo
};

// Croissance de la difficulté au fil du niveau (multiplie vitesse/fréquence des tirs)
export function difficulty(levelTime) {
  return 1 + Math.min(0.6, levelTime / 260);
}
