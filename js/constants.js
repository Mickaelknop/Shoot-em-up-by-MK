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
  // — Niveau 3 : Bedroom Dimension (meubles vivants) —
  pillow: {   // Oreiller Ninja : petit et rapide, dashs en piqué
    img: 'pillow', behavior: 'fighter', hp: 3, radius: 20, drawSize: 48, score: 300,
    speed: 260, fireInterval: [1.6, 2.6], bulletSpeed: 215,
  },
  sock: {     // Chaussette Mutante : minuscule, dure à toucher, gros score
    img: 'sock', behavior: 'drone', hp: 1, radius: 10, drawSize: 26, score: 800,
    speed: 175, fireInterval: [3.5, 5.0], bulletSpeed: 160,
  },
  alarm: {    // Réveil Explosif : descend, sonne, explose en cercle
    img: 'alarm', behavior: 'bomber', hp: 3, radius: 20, drawSize: 46, score: 350,
    speed: 150, fireInterval: [9, 9], bulletSpeed: 175, fuse: 1.4, ringN: 9,
  },
  bedmob: {   // Lit Furieux : lourd, barrage d'oreillers/ressorts
    img: 'bedmob', behavior: 'heavy', hp: 28, radius: 42, drawSize: 100, score: 1100,
    speed: 60, fireInterval: [1.6, 2.2], bulletSpeed: 185,
  },
  wardrobe: { // Armoire Carnivore : lourd, recrache cintres et vêtements
    img: 'wardrobe', behavior: 'heavy', hp: 32, radius: 44, drawSize: 104, score: 1300,
    speed: 55, fireInterval: [1.5, 2.0], bulletSpeed: 190,
  },
  vacuum: {   // Aspirateur Kamikaze : fonce en zigzag, aspire les bonus
    img: 'vacuum', behavior: 'kamikaze', hp: 5, radius: 22, drawSize: 52, score: 450,
    speed: 230, fireInterval: [99, 99], bulletSpeed: 0, zigAmp: 160, zigFreq: 5,
  },
  duvet: {    // Couette Fantôme : flotte doucement puis enveloppe le joueur
    img: 'duvet', behavior: 'kamikaze', hp: 8, radius: 30, drawSize: 72, score: 500,
    speed: 95, fireInterval: [99, 99], bulletSpeed: 0, zigAmp: 30, zigFreq: 1.2,
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

export const MIDBOSS3 = {
  img: 'coffee', hp: 460, radius: 76, drawSize: 185, score: 5500,
  contactRadius: 68, name: 'MACHINE À CAFÉ DÉMONIAQUE',
};

export const BOSS3 = {
  img: 'bigbed', hp: 1600, radius: 100, drawSize: 260, score: 30000,
  contactRadius: 94, name: 'LE GRAND LIT SUPRÊME',
};

// Types de bonus : poids relatifs pour les drops aléatoires
export const POWERUPS = {
  W: { color: '#ff9d2e', label: 'W' },   // amélioration d'arme
  S: { color: '#38c8ff', label: 'S' },   // bouclier
  L: { color: '#63ff7e', label: '1' },   // vie supplémentaire
  P: { color: '#ffe14d', label: 'P' },   // points
  B: { color: '#ff5e9c', label: 'B' },   // smart bomb (télécommande) — niveau 3
  M: { color: '#b48cff', label: 'Z' },   // invincibilité courte (masque) — niveau 3
};

// Habillage des bonus par niveau : émojis affichés à la place des lettres
// (niveau Bedroom Dimension). Mécaniques identiques, visuel à thème.
export const POWERUP_SKIN_BEDROOM = {
  W: '🪥',   // brosse à dents = arme
  S: '🛌',   // oreiller = bouclier
  L: '🥐',   // croissant = vie
  P: '🔑',   // clé de chambre = points
  B: '📺',   // télécommande = smart bomb
  M: '😴',   // masque de sommeil = invincibilité
};

export const SCORE_POWERUP = 500;
export const SCORE_GEM = 200;

export const STORAGE_KEYS = {
  hiscore: 'novastriker_hiscore',
  muted: 'novastriker_muted',
  pseudo: 'novastriker_pseudo',
  owner: 'novastriker_owner',   // jeton anonyme de propriété du pseudo
  ship: 'novastriker_ship',     // dernier vaisseau choisi (id)
};

// Croissance de la difficulté au fil du niveau (multiplie vitesse/fréquence des tirs)
export function difficulty(levelTime) {
  return 1 + Math.min(0.6, levelTime / 260);
}
