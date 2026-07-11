# NOVA STRIKER — Mission Bydo

Shoot'em up vertical mobile-first inspiré des jeux d'arcade des années 90 (style R-Type),
jouable directement dans un navigateur, sans installation ni dépendance.

## Lancer le jeu

Le jeu utilise des modules ES : il doit être servi en HTTP (pas en `file://`).

```bash
python -m http.server 8741
# puis ouvrir http://localhost:8741 sur le téléphone ou l'ordinateur
```

N'importe quel hébergement statique fonctionne (GitHub Pages, Netlify, etc.).

## Contrôles

- **Mobile** : glisser le doigt n'importe où sur l'écran — le vaisseau suit le doigt
  (avec un décalage vertical pour ne pas être masqué). Tir automatique.
- **Desktop** (pour tester) : flèches ou ZQSD/WASD, `P` ou `Échap` pour la pause.

## Contenu

- **2 niveaux** complets scénarisés (~3 min chacun), choisis via un **sélecteur de
  niveau** sur l'écran d'accueil :
  - **Niveau 1 — Mission Bydo** (style R-Type biomécanique) : vagues progressives,
    mid-boss « Gardien », boss final « Bydo Core » à 3 phases.
  - **Niveau 2 — Guerre des étoiles** (hommage) : le joueur pilote un **X-Wing**,
    affronte chasseurs et intercepteurs impériaux puis un **croiseur impérial** en
    boss final ; **lasers rouges** (rebelles) et **verts** (impériaux) ; le fond
    reste neutre pendant le niveau et bascule sur l'**Étoile de la Mort + la flotte
    impériale** uniquement à la scène du boss.
- Comportements d'ennemis distincts et réutilisables : drone (sinusoïde), chasseur
  (piqué guidé), lourd (barrage en éventail) — déclinés par niveau via des sprites
  différents.
- Bonus : **W** (arme +, 5 niveaux), **S** (bouclier), **1** (vie), **P** (points).
- Score, meilleur score persistant (`localStorage`), écrans titre / pause / game over /
  victoire, pause automatique quand l'onglet passe en arrière-plan.
- **Classement mondial en ligne** (Supabase) : saisie d'un pseudo avant la partie,
  soumission automatique du score en fin de partie, affichage du **Top 10 + rang
  personnel** sur les écrans titre, game over et victoire.
- Effets : particules, secousses d'écran, textes flottants, fond défilant + étoiles
  en parallaxe ; sons et musiques chiptune 100 % synthétisés en Web Audio (aucun
  fichier audio).

## Architecture

```
index.html          Écrans HTML (titre, pause, game over, victoire) + canvas
css/style.css       UI mobile-first (safe-area, tactile)
js/
  main.js           Point d'entrée : chargement, boucle rAF, liaison des boutons
  constants.js      Équilibrage central (vitesses, HP, scores, difficulté)
  game.js           Machine à états, collisions, HUD, rendu, décor de boss, spawns
  level.js          Scripts des niveaux + registre LEVELS + exécuteur (LevelRunner)
  enemies.js        Comportements d'ennemis génériques (drone/fighter/heavy)
  boss.js           Mid-boss et boss final (phases, patterns, barre de vie)
  player.js         Vaisseau : suivi tactile, armes, bouclier, vies
  bullets.js        Projectiles avec pool d'objets + patterns (anneau, éventail)
  powerups.js       Bonus récupérables
  particles.js      Particules et textes flottants
  input.js          Pointer events (tactile + souris) et clavier
  audio.js          SFX synthétisés + séquenceur musical Web Audio
  assets.js         Chargeur d'images
  storage.js        Persistance localStorage (meilleur score, pseudo, audio)
  config.js         Config Supabase du classement (URL + clé anon publique)
  leaderboard.js    Accès REST au classement en ligne (fetch, zéro dépendance)
assets/             Sprites détourés (générés par IA via fal.ai / GPT-image-2)
assets/raw/         Images sources brutes (fond magenta) — non chargées par le jeu
```

## Étendre le jeu

- **Nouveau niveau** : écrire un `buildLevelN(game)` dans `level.js` (liste
  d'événements `{wait}`, `{spawn}`, `{waitClear}`, `{midboss}`, `{boss}`) puis
  ajouter une entrée au registre `LEVELS` (nom, sprite du joueur `playerImg`, fond
  `bg`, décor de boss optionnel `bossBg`, style de tir `bolt`/`enemyBolt`, musique
  `song`, mid-boss et boss). Le sélecteur de l'écran d'accueil se construit
  automatiquement à partir de `LEVELS`.
- **Nouvel ennemi** : ajouter une entrée dans `ENEMY_TYPES` (`constants.js`),
  son sprite dans `assets.js`, et son comportement dans `enemies.js`
  (`updateEnemy` / `enemyFire`).
- **Nouvelle arme** : ajouter un `case` dans `Player.fire()`.
- **Nouveau bonus** : ajouter le type dans `POWERUPS` (`constants.js`) et son effet
  dans `Game.applyPowerup()`.
- **Nouveau boss** : ajouter une définition dans `constants.js` et ses patterns
  dans `boss.js`.

## Classement en ligne (Supabase)

Le classement utilise **Supabase** (Postgres + API REST PostgREST), sans backend à
maintenir et sans dépendance JS (appels via `fetch`).

- **Table** : `nova_striker_scores (id, pseudo, score, owner, created_at)`, isolée dans
  le projet Supabase `KingofGolf` (org MikaHome). **Une seule ligne par pseudo** =
  son meilleur score (index unique sur `lower(pseudo)`).
- **Pseudo unique et « possédé »** : chaque navigateur génère un jeton anonyme
  (`owner`, stocké en `localStorage`, jamais exposé). Un pseudo appartient au premier
  jeton qui l'enregistre ; un **autre** joueur ne peut pas le réutiliser. Le **même**
  joueur qui rejoue ne met à jour son entrée **que** s'il bat son record.
- **Écritures via fonctions serveur (RPC)** — aucune écriture directe possible :
  - `nova_check_pseudo(pseudo, owner)` → `available` / `owned` / `taken`
    (vérifié à la saisie du pseudo, avant de lancer la partie) ;
  - `nova_submit_score(pseudo, score, owner)` → `inserted` / `updated` /
    `not_improved` / `taken`, en conservant le meilleur score de façon atomique.
- **Sécurité** : la clé `anon` de `config.js` est **publique par conception** ; la
  protection vient du serveur — lecture limitée aux colonnes `pseudo, score`
  (la colonne `owner` n'est **pas** lisible publiquement), `INSERT/UPDATE/DELETE`
  directs révoqués, toutes les règles (validation, propriété, meilleur score)
  appliquées dans les RPC. La clé `service_role` (secrète) n'est jamais utilisée.
- **Vérifié** : lecture de `owner` refusée (HTTP 401), insertion directe refusée
  (401), et impossibilité pour un tiers d'écraser un pseudo — même en contournant
  le code du jeu.

Pour pointer vers un autre projet Supabase : modifier `SUPABASE_URL` /
`SUPABASE_ANON_KEY` dans `js/config.js` et recréer la table, l'index unique et les
deux fonctions RPC.

## Outils de test (dev)

- `?skip=midboss` ou `?skip=boss` + `window.__skipTo()` dans la console : avance
  le script du niveau jusqu'au boss.
- `window.__game` : accès à l'état du jeu dans la console.
