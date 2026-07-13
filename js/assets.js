// Chargement des images du jeu.

const MANIFEST = {
  player: 'assets/player.png',
  // Niveau 1 — Mission Bydo
  drone: 'assets/drone.png',
  fighter: 'assets/fighter.png',
  heavy: 'assets/heavy.png',
  midboss: 'assets/midboss.png',
  boss: 'assets/boss.png',
  bg: 'assets/bg.jpg',
  // Niveau 2 — hommage à la guerre des étoiles
  xwing: 'assets/xwing.png',        // vaisseau joueur du niveau 2
  tie: 'assets/tie.png',
  inter: 'assets/inter.png',
  gunship: 'assets/gunship.png',
  destroyer: 'assets/destroyer.png',
  cruiser: 'assets/cruiser.png',    // boss : croiseur impérial
  bg2: 'assets/bg2.jpg',            // fond neutre en jeu
  bg2boss: 'assets/bg2boss.jpg',    // décor de la scène du boss (station + flotte)
  // Niveau 3 — Bedroom Dimension (fond 100 % procédural, pas d'image de fond)
  pillow: 'assets/pillow.png',      // Oreiller Ninja
  sock: 'assets/sock.png',          // Chaussette Mutante
  alarm: 'assets/alarm.png',        // Réveil Explosif
  bedmob: 'assets/bedmob.png',      // Lit Furieux
  wardrobe: 'assets/wardrobe.png',  // Armoire Carnivore
  vacuum: 'assets/vacuum.png',      // Aspirateur Kamikaze
  duvet: 'assets/duvet.png',        // Couette Fantôme
  coffee: 'assets/coffee.png',      // mid-boss : Machine à café démoniaque
  bigbed: 'assets/bigbed.png',      // boss : Le Grand Lit Suprême
  // Cartes de sélection du vaisseau (illustrations holographiques)
  card_nova: 'assets/card_nova.jpg',
  card_xwing: 'assets/card_xwing.jpg',
};

export const images = {};

// Charge une image avec réessais (réseau mobile instable, connexions coupées…).
function loadImage(key, src, tries = 3) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const img = new Image();
      img.onload = () => { images[key] = img; resolve(); };
      img.onerror = () => {
        if (n > 1) setTimeout(() => attempt(n - 1), 250 * (tries - n + 1));
        else reject(new Error('Image introuvable : ' + src));
      };
      // Cache-buster sur les réessais pour forcer une requête fraîche.
      img.src = n === tries ? src : `${src}?r=${tries - n}`;
    };
    attempt(tries);
  });
}

export function loadAssets() {
  return Promise.all(Object.entries(MANIFEST).map(([key, src]) => loadImage(key, src)));
}
