# NOVA STRIKER — Résumé du projet (pour reprise dans une nouvelle discussion)

Ce document résume l'état complet du jeu **NOVA STRIKER** afin de pouvoir reprendre
le travail dans une nouvelle conversation sans perte de contexte.

---

## 1. Le projet en bref

Shoot'em up vertical **mobile-first**, jouable dans un navigateur, sans installation
ni dépendance. Vanilla JS + Canvas 2D, modules ES. Deux ambiances : niveau 1 style
R-Type biomécanique, niveau 2 hommage à la guerre des étoiles.

- **Dossier local** : `D:\Dropbox\Mes Travaux IA\Mes essais\Claude-code\Demo-site\R-type-shootemup-claude-fable5`
- **Dépôt GitHub** : https://github.com/Mickaelknop/Shoot-em-up-by-MK (branche `main`)
- **En ligne (GitHub Pages)** : https://mickaelknop.github.io/Shoot-em-up-by-MK/
- **Dernier commit déployé** : `72a1bfe`

---

## 2. Contenu du jeu

- **3 niveaux** complets (~3 min chacun), choisis via un **sélecteur** sur l'écran
  d'accueil :
  - **Niveau 1 — Mission Bydo** : drones / chasseurs / croiseurs lourds, mid-boss
    « Gardien », boss final « Bydo Core » à 3 phases.
  - **Niveau 2 — Guerre des étoiles** : chasseurs et intercepteurs impériaux,
    canonnières, mid-boss **Destroyer stellaire**, boss final **Croiseur
    impérial**. **Lasers verts** (joueur) / **rouges** (tous les ennemis, boss
    compris). Fond neutre en jeu, bascule sur **Étoile de la Mort + flotte** à la
    scène du boss final.
  - **Niveau 3 — Bedroom Dimension** : dimension parallèle délirante où les
    meubles prennent vie (le gagnant dort dans le grand lit). Fond
    **psychédélique 100 % procédural** (tunnel d'anneaux arc-en-ciel + rayons en
    rotation + objets du quotidien flottants en émojis), qui **s'emballe** aux
    phases avancées du boss. Ennemis : Oreiller Ninja, Chaussette Mutante
    (minuscule, 800 pts), Réveil Explosif (comportement `bomber` : sonne puis
    explose en anneau), Lit Furieux, Armoire Carnivore, Aspirateur Kamikaze
    (comportement `kamikaze` : zigzag + aspire les bonus), Couette Fantôme.
    Mid-boss **Machine à café démoniaque**, boss final **Le Grand Lit Suprême**.
    Bonus à thème (émojis) + 2 mécaniques exclusives : **📺 smart bomb** (efface
    les tirs, dégâts à tout l'écran) et **😴 invincibilité 6 s**. Musique
    `stage3` sautillante (esprit Parodius).
- **Choix du vaisseau** : avant chaque partie (après « JOUER »), écran de
  sélection présentant les 2 vaisseaux sous forme de **cartes holographiques**
  (NOVA-7 / AILE-X). Purement cosmétique (mêmes stats). Le vaisseau choisi
  s'applique à n'importe quel niveau, sert de sprite en jeu + icône de vies, et
  s'affiche en petit à droite du pseudo dans le classement. Dernier choix
  mémorisé en `localStorage`. Cartes générées avec GPT-image-2 (low).
- **Progression enchaînée** : le niveau choisi est le point de départ ; après le
  boss final d'un niveau, on **enchaîne automatiquement** le niveau suivant
  (bannière « NIVEAU X »), en **conservant vies / arme / bouclier** et en
  **cumulant le score**. L'écran de victoire n'apparaît qu'après le **dernier**
  niveau. Démarrer au N2 joue 2→3 ; au N3, joue 3 seul. `REJOUER` relance depuis
  le niveau de départ (`game.startLevelIndex`), pas le dernier atteint. Le score
  soumis au classement est le cumul (ou le total atteint à la mort).
- Contrôle tactile : glisser le doigt (décalage vertical), tir auto.
- Bonus : **W** (arme, 5 niveaux), **S** (bouclier), **1** (vie), **P** (points).
- Écrans : titre, pause, game over, victoire. Pause auto si onglet en arrière-plan.
- Audio 100 % synthétisé Web Audio (SFX + 3 musiques : `stage`, `stage2`, `boss`).
- **Classements en ligne** : mondial (score total cumulé) **+ par niveau**
  (points marqués dans chaque niveau seul), avec onglets `[MONDIAL][N1][N2][N3]`
  sur l'écran titre et une **modale « ? »** expliquant l'enchaînement/le cumul
  (voir section 4).

---

## 3. Architecture des fichiers

```
index.html          Écrans HTML + canvas
css/style.css       UI mobile-first (safe-area, tactile, sélecteur, classement)
js/
  main.js           Entrée : chargement, boucle rAF, boutons, pseudo, classement UI
  constants.js      Équilibrage : ENEMY_TYPES, MIDBOSS/BOSS, MIDBOSS2/BOSS2, STORAGE_KEYS
  game.js           Machine à états, collisions, HUD, rendu, décor de boss, spawns
  level.js          Scripts des niveaux + registre LEVELS + LevelRunner
  enemies.js        Comportements : 'drone' / 'fighter' / 'heavy' / 'kamikaze' / 'bomber'
  boss.js           Boss paramétrable (def par niveau), phases, barre de vie
  player.js         Vaisseau (sprite par niveau via levelDef.playerImg)
  bullets.js        Projectiles + styles de tir ('default' / 'sw' / 'green')
  powerups.js       Bonus
  particles.js      Particules + textes flottants
  input.js          Pointer events + clavier
  audio.js          SFX + séquenceur musical
  assets.js         Chargeur d'images (avec réessais)
  storage.js        localStorage : hiscore, pseudo, owner, muted
  config.js         Config Supabase (URL + clé anon publique)
  leaderboard.js    Accès classement : checkPseudo, submitScore, fetchTop, fetchRank
assets/             Sprites détourés + fonds (générés fal.ai / GPT-image-2 low)
assets/raw/         Images sources brutes (fond magenta), non chargées
```

### Registre des niveaux (`level.js` → `LEVELS`)
Chaque niveau : `{ id, name, subtitle, playerImg, bg, bossBg, bolt, enemyBolt,
song, build, midboss, boss }` + champs optionnels : `bgFx: 'psychedelic'`
(fond procédural, `bg: null`), `bonusPool` (table de drop `powerups.js/POOLS`),
`powerupSkin` (émojis à la place des lettres). Le sélecteur de l'écran
d'accueil se construit automatiquement depuis `LEVELS`.

**Ajouter un niveau** = écrire `buildLevelN(game)` + une entrée dans `LEVELS`.

---

## 4. Classements (Supabase)

- **Projet** : `KingofGolf` (ref `oyvyxxqufcofvyjmrlqh`, org MikaHome, eu-west-3).
  Deux tables isolées, sans lien avec les tables golf :
  - `nova_striker_scores` — **classement mondial** (score total d'une partie).
  - `nova_striker_level_scores` — **classement par niveau** (points marqués dans
    un niveau seul). Colonnes `id, pseudo, level, score, owner, ship, created_at`,
    index unique `(level, lower(pseudo))`. Écriture via RPC
    `nova_submit_level_score(p_pseudo, p_level, p_score, p_owner, p_ship)` (même
    logique de propriété/meilleur score). Lecture `anon` limitée à
    `pseudo, score, ship, level, created_at` (⚠️ `created_at` **doit** être dans
    le GRANT SELECT car le tri PostgREST porte dessus). Soumission en fin de
    partie pour chaque niveau joué (`game.levelResults`).
  - UI : onglets sur l'écran titre (`renderTitleLeaderboard` selon `currentTab`)
    + modale `#lb-info-modal`.
- **Modèle** : **une seule ligne par pseudo** = son meilleur score. Colonnes
  `id, pseudo, score, owner, created_at, ship`. Index unique sur `lower(pseudo)`.
  `ship` (`nova`|`xwing`|NULL) = vaisseau du joueur, lisible en `anon`
  (GRANT SELECT), écrit via RPC, affiché en icône dans le classement.
- **Pseudo unique et possédé** : chaque navigateur génère un jeton anonyme `owner`
  (`localStorage`, jamais exposé). Un pseudo appartient au premier jeton qui
  l'enregistre ; un autre joueur ne peut pas le réutiliser (blocage à la saisie).
  Même joueur : mise à jour **uniquement** si nouveau record.
- **Écritures via RPC serveur** (aucune écriture directe) :
  - `nova_check_pseudo(p_pseudo, p_owner)` → `available` / `owned` / `taken`
  - `nova_submit_score(p_pseudo, p_score, p_owner, p_ship)` → JSON
    `{ status, best }`, status ∈ `inserted | updated | not_improved | taken |
    invalid`. `p_ship` validé (∈ `nova`|`xwing`, sinon NULL).
- **Sécurité** : clé `anon` publique par conception. Lecture limitée à
  `pseudo, score` (colonne `owner` non lisible, HTTP 401). `INSERT/UPDATE/DELETE`
  directs révoqués. Clé `service_role` jamais utilisée côté client.
- **Données actuelles** : 3 vrais joueurs (FlAV63 44150, MIKA 42800, SPITZETTE
  11550), `owner` NULL (revendicables au prochain jeu avec ce pseudo).

---

## 5. Génération des visuels

Skill **fal-image**, modèle `openai/gpt-image-2`, qualité `low`, fond magenta
`#FF00FF` pour détourage. Post-traitement Python/Pillow (chroma-key magenta +
flood-fill depuis les bords + décontamination du liseré + crop + resize).
Scripts dans le scratchpad : `process_assets.py`, `process_assets2.py`,
`process_assets3.py`.

> Note : le filtre de contenu fal bloque les descriptions trop proches des designs
> Star Wars trademarkés (ex. « famous space opera » + TIE). Décrire génériquement.

---

## 6. Développement local

Serveur de dev **no-cache + multi-thread** (évite cache de modules ES et
`ERR_CONNECTION_RESET`) : `scratchpad/devserver.py`, lancé via l'entrée
`novastriker` de `.claude/launch.json`. Port 8741.

> Piège rencontré : le serveur `python -m http.server` par défaut est mono-thread
> et met les modules en cache heuristique → le navigateur servait de l'ancien code.
> Le no-cache server règle ça. Pour forcer un rafraîchissement : `fetch(url,
> {cache:'reload'})` sur les modules puis reload.

Outils de test (dev) : `?skip=midboss|boss` + `window.__skipTo()` ; `window.__game`.

---

## 7. Déploiement GitHub

Le dossier local n'est **pas** un clone git connecté. Procédure de déploiement :
1. `gh repo clone Mickaelknop/Shoot-em-up-by-MK` dans le scratchpad
2. `git config core.autocrlf false` puis `git reset --hard HEAD` (checkout en LF)
3. Copier les fichiers modifiés, **normaliser CRLF→LF** (sinon diff pollué)
4. `git add -A` ; les fichiers non modifiés (stat-dirty) sortent au re-hash
5. commit + `git push origin main`

> GitHub Pages : l'API legacy `pages/builds/latest` peut retarder l'affichage du
> nouveau commit. Vérifier le déploiement réel en récupérant le contenu d'un
> fichier en ligne (`fetch` avec cache-buster).

Accès GitHub confirmé : `gh` authentifié `Mickaelknop`, droits admin/push sur le
dépôt.

---

## 8. Historique des commits déployés

- Jeu initial (niveau 1) : déploiement multipage.
- `47b1188` — Classement mondial en ligne (Supabase).
- `bdaea56` — Niveau 2 « Guerre des étoiles » + sélecteur de niveau.
- `72a1bfe` — Classement : pseudos uniques et possédés, meilleur score conservé.

---

## 9. Pistes d'évolution possibles

- Niveau 4 ; boss à phases pour le croiseur impérial.
- Arme spéciale (torpille à protons) déclenchée par bouton.
- Mode survie infini.
- Rejouer un niveau déjà terminé / progression sauvegardée.
- Reprendre un pseudo sur plusieurs appareils (nécessiterait un vrai login).
