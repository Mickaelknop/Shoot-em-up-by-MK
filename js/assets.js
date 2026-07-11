// Chargement des images du jeu.

const MANIFEST = {
  player: 'assets/player.png',
  drone: 'assets/drone.png',
  fighter: 'assets/fighter.png',
  heavy: 'assets/heavy.png',
  midboss: 'assets/midboss.png',
  boss: 'assets/boss.png',
  bg: 'assets/bg.jpg',
};

export const images = {};

export function loadAssets() {
  const jobs = Object.entries(MANIFEST).map(([key, src]) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { images[key] = img; resolve(); };
      img.onerror = () => reject(new Error('Image introuvable : ' + src));
      img.src = src;
    })
  );
  return Promise.all(jobs);
}
