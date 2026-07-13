# NOVA STRIKER — Mission Bydo

Shoot'em up vertical mobile-first inspiré des jeux d'arcade des années 90, jouable directement dans un navigateur, sans installation côté joueur.

**Jouer :** <https://mickaelknop.github.io/Shoot-em-up-by-MK/>

## Lancer le jeu en local

Le jeu utilise des modules ES et doit être servi en HTTP :

```bash
python -m http.server 8741
```

Ouvrir ensuite <http://localhost:8741>. Tout hébergement statique convient.

## Contrôles

- **Mobile** : glisser le doigt sur l'écran ; le vaisseau suit le doigt avec un décalage vertical. Le tir est automatique.
- **Ordinateur** : flèches ou ZQSD/WASD ; `P` ou `Échap` pour la pause.

## Contenu

- **3 niveaux** scénarisés, avec progression automatique jusqu'au niveau 3 :
  - **Mission Bydo** : secteur biomécanique, Gardien puis Bydo Core ;
  - **Guerre des étoiles** : chasseurs impériaux, Destroyer stellaire puis Croiseur impérial ;
  - **Bedroom Dimension** : tunnel psychédélique, Machine à café démoniaque puis Grand Lit suprême.
- Départ possible depuis n'importe quel niveau.
- Deux vaisseaux jouables aux caractéristiques identiques : NOVA-7 et AILE-X.
- Ennemis aux comportements distincts, boss à plusieurs phases, bonus d'arme, bouclier, vie et points. Le niveau 3 ajoute une smart bomb et une invincibilité courte.
- Score local persistant, pause automatique lorsque l'onglet passe en arrière-plan et sons chiptune synthétisés avec Web Audio.
- Classements Supabase : Top 10 mondial, Top 10 par niveau et rang personnel.

## Expérience mobile

L'écran titre utilise la hauteur dynamique du navigateur (`dvh`) et tient compte des zones de sécurité des smartphones. Sur les écrans bas, le logo et les commandes sont compactés. Si dix scores dépassent encore la hauteur disponible, l'écran titre entier défile verticalement : la dernière ligne reste accessible sans introduire un second défilement dans le classement.

## Architecture

```text
index.html          écrans HTML et canvas
css/style.css       interface mobile-first, safe areas et responsive
js/
  main.js           chargement, écrans, boucle d'animation et interactions
  constants.js      équilibrage, ennemis, boss et bonus
  game.js           états, collisions, HUD, rendu et progression
  level.js          scripts des trois niveaux, registre LEVELS et vaisseaux
  enemies.js        comportements des ennemis
  boss.js           phases et patterns des boss
  player.js         pilotage, armes, bouclier et vies
  bullets.js        projectiles et patterns
  powerups.js       bonus récupérables
  particles.js      particules et textes flottants
  input.js          tactile, souris et clavier
  audio.js          effets et musiques Web Audio
  assets.js         chargement des images
  storage.js        données locales du joueur
  config.js         configuration publique Supabase
  leaderboard.js    accès REST/RPC aux classements
assets/             sprites et illustrations
tests/              contrôles automatisés de l'interface mobile
```

## Classements et sécurité

La clé `anon` présente dans `js/config.js` est publique par conception. Les écritures directes dans les tables sont révoquées et les RPC Supabase assurent la validation, la propriété d'un pseudo et la conservation atomique du meilleur score. Le jeton `owner` stocké dans le navigateur sert à reconnaître un joueur ; ce n'est pas un secret d'authentification.

Le score est cependant calculé dans le navigateur puis envoyé à Supabase. Un utilisateur déterminé peut donc fabriquer une valeur en appelant directement l'API. Le classement doit être considéré comme un classement communautaire occasionnel, et non comme un système anti-triche. Une garantie forte demanderait un serveur de jeu capable de vérifier la partie, ainsi qu'une limitation de débit côté API.

## Tests

Le test Playwright injecte un Top 10 complet et vérifie les formats 320×568, 360×640, 390×844 et 430×932. Il contrôle que la dixième ligne est atteignable, qu'aucun débordement horizontal n'apparaît et qu'un clic sur un vaisseau ne lance qu'une seule partie.

```bash
npm ci
npx playwright install chromium
npm test
```

Le même contrôle s'exécute automatiquement dans GitHub Actions à chaque pull request.

## Étendre le jeu

- **Nouveau niveau** : créer un constructeur dans `js/level.js`, puis ajouter son entrée à `LEVELS`.
- **Nouvel ennemi** : compléter `ENEMY_TYPES`, le manifeste d'images et son comportement.
- **Nouvelle arme ou bonus** : ajouter sa constante puis son effet dans le joueur ou le jeu.
- **Nouveau boss** : ajouter sa définition et ses patterns.

Outils de développement : `?skip=midboss` ou `?skip=boss`, puis `window.__skipTo()` dans la console ; `window.__game` expose l'état courant du jeu.
