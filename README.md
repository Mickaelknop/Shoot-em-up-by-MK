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

- 1 niveau complet scénarisé (~3 min) : vagues progressives, mid-boss « Gardien »,
  boss final « Bydo Core » à 3 phases.
- 3 types d'ennemis aux comportements distincts : drone (sinusoïde), chasseur (piqué
  guidé), croiseur lourd (barrage en éventail).
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
  game.js           Machine à états, collisions, HUD, rendu, spawns
  level.js          Script du niveau 1 + exécuteur générique (LevelRunner)
  enemies.js        Types d'ennemis et comportements
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

- **Nouveau niveau** : écrire une fonction `buildLevel2(game)` dans `level.js`
  (liste d'événements `{wait}`, `{spawn}`, `{waitClear}`, `{midboss}`, `{boss}`)
  et la passer à `LevelRunner`.
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

- **Table** : `nova_striker_scores (id, pseudo, score, created_at)`, isolée dans le
  projet Supabase `KingofGolf` (org MikaHome), sans lien avec les autres tables.
- **Sécurité (RLS)** : la clé `anon` présente dans `config.js` est **publique par
  conception** — elle est faite pour être exposée dans le navigateur. La protection
  vient des règles Row-Level Security appliquées côté serveur :
  - lecture publique du classement ;
  - insertion publique **validée** (pseudo 2–12 caractères non vides, score borné
    à `[0 ; 100 000 000]`) ;
  - **aucune** règle UPDATE/DELETE → modification et suppression impossibles.
  - La clé `service_role` (secrète) n'est jamais utilisée côté client.
- **Vérifié** : les insertions invalides sont rejetées (HTTP 401) et les tentatives
  de PATCH/DELETE n'affectent aucune ligne, même en contournant le code du jeu.

Pour pointer vers un autre projet Supabase, il suffit de modifier `SUPABASE_URL` et
`SUPABASE_ANON_KEY` dans `js/config.js` et d'y créer la même table + policies.

## Outils de test (dev)

- `?skip=midboss` ou `?skip=boss` + `window.__skipTo()` dans la console : avance
  le script du niveau jusqu'au boss.
- `window.__game` : accès à l'état du jeu dans la console.
