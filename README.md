# PlanTrip

> Itinéraire, budget, lieux, documents et checklists réunis dans un seul espace — adapté à votre véhicule et à vos envies. Vos voyages restent consultables hors connexion.

PlanTrip est une application web de préparation de voyage en français. Les voyages sont calculés et conservés **localement** dans le navigateur : aucune donnée de voyage sur un serveur, aucun traceur publicitaire. L'**authentification** (comptes, mots de passe, Magic Link) passe, elle, par le serveur fourni avec l'application — voir [Serveur et authentification](#serveur-et-authentification).

- Cahier des charges : `PlanTrip-main/PlanTrip-main/README.md` *(référence locale, hors dépôt Git)*
- Chartes graphiques : `PlanTrip-main/` *(référence locale, hors dépôt Git)* — planches sources de `src/design/`

## Documentation projet

Les documents du cahier des charges d'origine (`PlanTrip-main/`, ~24 Mo, plus l'archive
`PlanTrip-main.zip`) sont des **références historiques conservées en local** : ils sont ignorés
par `.gitignore` pour ne pas alourdir le dépôt, et sont donc absents d'un clone GitHub.

| Document | Description |
| --- | --- |
| `PlanTrip-main/PlanTrip-main/README.md` | Présentation et principes fondateurs |
| `PlanTrip-main/PlanTrip-main/VISUAL_IDENTITY_GUIDELINES.md` | Identité visuelle officielle |
| `PlanTrip-main/PlanTrip-main/DEVBOOK.md` | Vision technique et architecture |
| `PlanTrip-main/PlanTrip-main/ROADMAP.md` | Évolutions prévues |
| `PlanTrip-main/PlanTrip-main/FOUNDING_PRINCIPLES.md` | Principes qui guident le projet |
| `LICENSE` | Licence MIT (versionné) |

## Stack

| Rôle | Outil |
| --- | --- |
| Framework | React 19 + React Router 7 |
| Bundler | Vite 8 (rolldown) |
| Styles | Tailwind CSS 4.3, tokens `pt.*` déclarés via `@theme` dans `src/index.css` (Tailwind CSS 3.4 + `tailwind.config.js` historique, migré — parité visuelle vérifiée page par page) |
| Cartographie | Leaflet 1.9 (bundlé, CDN retiré) |
| Routage / géocodage | OSRM + Photon (OSM, public) |
| Tests | Vitest 5 + jsdom + Testing Library |
| Hors connexion | Service worker généré par Vite + Web App Manifest |
| Lint | oxlint |

## Démarrage

Prérequis : **Node.js 24 (LTS)** et npm. Le lockfile `package-lock.json` fait foi.

```bash
npm ci              # installation reproductible depuis le lockfile
npm run dev         # développement : Vite (proxy /api sur le serveur local)
npm run server      # serveur PlanTrip : dist/ + API auth (port 4174)
npm run verify      # lint + tests + build — qualité complète
npm run build && npm start   # production : build puis serveur (port 4174)
```

## Scripts

| Commande | Effet |
| --- | --- |
| `npm run dev` | serveur Vite en développement (proxy `/api` → `127.0.0.1:4174`) |
| `npm run lint` | oxlint sur `src/` (0 erreur / 0 warning attendus) |
| `npm run test` | `vitest run` — tests unitaires uniquement (22 fichiers, `src/**/*.test.*` + `server/*.test.js`) |
| `npm run test:watch` | mode suivi |
| `npm run build` | bundle de production dans `dist/` |
| `npm run server` / `npm start` | serveur Node (`server/index.js`) : fichiers `dist/` + API `/api/*` |
| `npm run preview` | aperçu statique Vite (sans API) |
| `npm run test:e2e` | Playwright contre le build servi par le serveur PlanTrip (parcours, routes, compte, Magic Link, hors connexion, accessibilité) |
| `npm run test:a11y` | audit axe-core seul (`e2e/a11y.spec.js`) |
| `npm run verify` | `lint && test && build` (gate de qualité) |

Les trois suites sont **séparées** : `npm test` ne lance jamais Playwright (Vitest ignore
`e2e/`), `npm run test:e2e` lance les specs Playwright, `npm run test:a11y` ne lance que
l'audit WCAG.

## CI GitHub Actions

`.github/workflows/verify.yml` exécute sur chaque **push** et chaque **pull request** :

1. `actions/checkout@v4`
2. `actions/setup-node@v4` — Node 24 (LTS) + cache npm
3. `npm ci` — installation strictement depuis `package-lock.json`
4. `npm run verify` — oxlint, Vitest, Vite build
5. `npx playwright install --with-deps chromium` — navigateur de test (cache `~/.cache/ms-playwright`
   clé sur la version de `@playwright/test`)
6. `npm run test:e2e` — parcours, routes, espace applicatif, hors connexion **et** audit axe-core
7. en cas d'échec uniquement (`if: failure()`) : upload des artefacts Playwright
   (`playwright-report/`, `test-results/` — rapports HTML, traces, captures) avec
   `actions/upload-artifact@v4`, rétention 7 jours

La CI a un accès réseau (elle s'exécute sur GitHub), mais **les tests unitaires n'en dépendent pas** :
`src/test/setup.js` neutralise `fetch`, un test le garantit
(`src/test/network.test.js`) et chaque service distant possède son propre repli.
Les tests Playwright, eux, ont besoin des services GitHub pour installer Chromium ; les
services métier (Photon, OSRM, Overpass, tuiles OSM) y sont **mockés** (`e2e/helpers.js`),
donc aucune dépendance à un quota externe.

## Architecture

```
server/          serveur Node : index.js (entrée), api.js (auth REST),
                 db.js (node:sqlite), auth.js (scrypt), mailer.js,
                 static.js (dist/ + repli SPA)
src/
├── design/        tokens, Icon.jsx (~90 icônes), ui.jsx (design system)
├── layout/        PublicLayout, MarketingHeader, Footer, AppShell, BottomNav
├── components/    MapView, PlaceSearch, trip/TripLayout
├── domain/        logique pure + tests : trip, budget, estimate, itinerary,
│                  documents, checklist, format
├── services/      routing (OSRM, GPX), geocoding (Photon), places (Overpass)
├── state/         store.js — persistance localStorage + réactivité React
├── lib/           storage primitives, api (client REST + repli local), auth + password (hachage PBKDF2), tripInfo (véhicules), online (état réseau), connectivity (bandeau hors connexion)
├── pwa/           service worker (génération + enregistrement) et ses tests
├── data/          vehicles.json, questions
├── pages/         écrans publics (dont Faq, Contact, Blog), app/ (espace voyageur), app/trip/ (7 onglets), legal/
└── App.test.jsx   smoke tests de navigation
```

### Routes

**Public** : `/`, `/vehicules` (+ `/:slug`), `/fonctionnalites`, `/preparer-son-voyage`,
`/resultat-voyage`, `/login`, `/register`, `/blog`, `/faq`, `/contact`,
`/mentions-legales`, `/confidentialite`, `/accessibilite`.

**Connecté** (`AppShell`) : `/tableau-de-bord`, `/mes-voyages`, `/budget`, `/mon-profil`,
puis `/voyages/:tripId` avec `overview`, `itineraire`, `calendrier`, `budget`, `lieux`,
`documents`, `organisation`.

### Serveur et authentification

`server/` est un **serveur Node sans dépendance native** (HTTP + `node:sqlite` de Node 24) qui
sert `dist/` et l'API d'authentification :

| Fichier | Rôle |
| --- | --- |
| `server/index.js` | point d'entrée (`npm run server`), args `--port` / `--fresh` (base + boîte aux lettres vierges), variables d'environnement |
| `server/db.js` | schéma SQLite (`users`, `sessions`, `magic`), formes publiques — jamais les hachages en réponse, purge des sessions expirées |
| `server/auth.js` | mots de passe en **scrypt** (N=16384, sel 16 octets), jetons, comparaison à temps constant, limites de débit (auto-expirées) |
| `server/mailer.js` | emails Magic Link : `MAIL_MODE=file` (défaut, `.eml` datés dans `var/mailbox/`) ou `MAIL_MODE=smtp` + `SMTP_URL` (nodemailer) |
| `server/api.js` | routes JSON sous `/api/auth/*` : `register`, `login`, `password`, `logout`, `magic-link` (+ `verify`, `open`), `me`, `profile` (PATCH) |
| `server/static.js` | fichiers `dist/` avec repli SPA, cache `immutable` sur `/assets/`, en-têtes de sécurité (`nosniff`, `X-Frame-Options`, `Referrer-Policy`) |

**Session** : cookie `pt_session` (HttpOnly, SameSite=Lax, jeton 32 octets stocké haché SHA-256,
TTL 7 jours). **Magic Link** : code à 6 chiffres valable 10 minutes (5 tentatives) **et** lien
`/login?magique=<jeton>` à usage unique — c'est la solution de connexion privilégiée du cahier
des charges. Envois limités (1 demande / 15 s **par email** et 15 / 10 min **par adresse**,
5 vérifications / 10 min, 10 échecs de connexion / 5 min et 40 / 5 min par adresse) ; les
compteurs par adresse ne s'appliquent que si `TRUST_PROXY=1` (derrière un reverse proxy de
confiance qui pose `X-Forwarded-For`) ; la création de compte est limitée à 30 / 10 min par
adresse. À la **connexion** et au **Magic Link**, les erreurs sont génériques (pas
d'énumération d'emails) et les vérifications à durée dépassée retombent sur un scrypt factice
(pas d'écart de temps révélateur d'un compte existant). L'**inscription**, elle, répond
« Email déjà utilisé » : le compromis est assumé, borné par la limite ci-dessus.

**Mot de passe** : 8 caractères minimum (serveur et client).

**Pré-détournement de compte** : l'inscription par mot de passe ne prouve pas la possession de
l'adresse. Quand un Magic Link (code ou lien) prouve cette possession pour un compte encore non
vérifié, le serveur **supprime son mot de passe et coupe toutes ses sessions** (colonne
`users.verified`) : un tiers qui aurait inscrit l'adresse d'autrui perd tout accès. Conséquence
pour la personne légitime qui s'était elle-même inscrite : elle reste connectée par le lien
magique, mais son mot de passe n'existe plus (elle se reconnecte désormais par Magic Link).

**Lien magique et origine** : l'en-tête `Host` est contrôlé par l'appelant, il ne sert donc
jamais à construire un lien hors boucle locale. Sans `PUBLIC_URL`, l'envoi est refusé
(`503 public_url_required`) ; **`PUBLIC_URL` est obligatoire en production** (ex.
`https://plantrip.fr`). Avec une origine `https://`, le cookie de session est marqué `Secure`.

**Côté client** (`src/lib/api.js` + `src/lib/auth.jsx`) : les appels vont d'abord au serveur
(`credentials: include`), avec **repli local** si celui-ci est injoignable — l'application reste
utilisable hors connexion. Le miroir `localStorage.plantrip_users_db` (hachage PBKDF2 local,
jamais en clair) est conservé après inscription et changement de mot de passe : c'est lui qui
sert de vérification hors ligne et de source de vérité pour les données de l'appareil. En
`MODE=test`, l'API est coupée : les tests unitaires exercent le repli local. Il n'y a pas de
connexion par fournisseur (Google, Facebook) : elle n'existait qu'en simulation et a été retirée.
Une session ouverte par le serveur est marquée `serverSession` ; au démarrage, le client la
confirme par `GET /api/auth/me` et déconnecte l'interface si le serveur répond 401 (serveur
injoignable : l'état local est conservé).

Variables d'environnement du serveur : `HOST`, `PORT` (4174), `DATABASE_PATH`
(`var/plantrip.db`), `MAIL_MODE` (`file`), `MAILBOX_DIR` (`var/mailbox`), `SMTP_URL`,
`MAIL_FROM`, `MAGIC_TTL_MIN` (10), `SESSION_TTL_DAYS` (7), `PUBLIC_URL` (origine absolue des
liens magiques, **obligatoire en production** ; sans elle, seule la boucle locale est acceptée), `TRUST_PROXY` (`1` pour faire
confiance à `X-Forwarded-For`), `DIST_DIR` (`dist/`). En développement, le proxy Vite cible
`API_PORT` (4174 par défaut).

### Modèle de données

Un voyage (`domain/trip.js`) porte : `departure`, `destination`, `dates` (jours/nuitées),
`vehicle`, `travelers`, `profile`, `preferences`, `budget` (`max`, `plan`, `entries`),
`places` (lieux routables et secondaires), `itinerary` (distance, durée, source, steps),
`documents`, `checklist`, `notes`, `stats`, `status`.

`state/store.js` est la seule porte de sortie vers `localStorage` :
`useTrips()`, `useCurrentTrip()`, `getTrip()`, `saveTrip()`, `upsertTrip()`, `draftToTrip()`.
Les onglets se synchronisent via l'événement `storage` (`useCrossTabSync`).

### Lieux

`domain/itinerary.js` distingue :
- **lieux routables** (`stop`, `lodging`) → apparaissent dans le tracé et l'ordre des étapes ;
- **lieux secondaires** (`restaurant`, `poi`, `rest-area`, `fuel`, `address`) → affichés sur
  la carte, filtrés hors du calcul d'itinéraire (`routePlaces`, `withRoutePlaces`).

### Services externes

| Service | Usage | Données envoyées |
| --- | --- | --- |
| Photon (komoot) | recherche d'adresses/villes | terme saisi |
| OSRM | calcul d'itinéraire | coordonnées du trajet |
| Overpass (OSM) | lieux le long du trajet : restaurants, stations, aires, POI | bbox englobante du tracé |
| OpenStreetMap | tuiles cartographiques | coordonnées visibles |
| Google Fonts | Inter + Space Grotesk | requête navigateur |

Le bundle Leaflet est embarqué (chargé à la demande sur `MapView` et `/resultat-voyage`),
mais les **tuiles** restent un service réseau : hors connexion, la carte affiche son propre
bandeau d'état plutôt qu'un fond blanc.

## Hors connexion

L'application est installable et utilisable sans réseau **après une première visite** :
service worker (`dist/sw.js`, généré par Vite) + Web App Manifest (`public/manifest.webmanifest`).

### Stratégie de cache

| Ressource | Stratégie |
| --- | --- |
| Navigation SPA (`/mes-voyages`, `/voyages/:id/…`) | réseau d'abord, repli sur `index.html` précache → **aucun écran blanc** |
| Fichiers applicatifs (`index.html`, JS/CSS hachés, manifeste) | précachés à l'installation du service worker (nom de cache versionné par hash des fichiers) |
| Images, icônes, logo (`/images`, `/icons`) | cache d'abord après un premier passage |
| Stockage des voyages | `localStorage` — indépendant du réseau |
| Services externes (OSRM, Photon, Overpass, tuiles OSM, Google Fonts) | **jamais interceptés, jamais mis en cache** : réseau seul |

Le service worker ne traite que les requêtes `GET` d'origine identique ; tout
cross-origin est laissé au navigateur (aucun service distant n'est simulé ni mis en cache.
`/sw.js` lui-même n'est jamais servi depuis le cache.

### Ce qui fonctionne / ce qui nécessite Internet

**Sans réseau** : ouverture de l'application, navigation complète, consultation et modification
des voyages, budget, lieux, documents, checklists, notes, comptes locaux, export GPX,
lecture du parcours déjà calculé.

**Avec réseau** : recherche d'adresses (Photon), calcul d'itinéraire (OSRM), hébergements et
points d'intérêt (Overpass), fonds de carte (tuiles OSM), polices Google Fonts. Chacun de ces
cas affiche un état explicite (bandeau global `OfflineIndicator`, message d'erreur de
recherche, indicateur « fond de carte hors connexion », indicateur « hébergements
indisponibles ») au lieu de prétendre réussir.

### Vérifier manuellement

```bash
npm run build && npm run preview   # ou : python serve.py
```

1. Ouvrir l'application, visiter au moins une page → DevTools ▸ *Application* ▸ *Service Workers* : `plantrip-v… (activated)` ;
2. *Application* ▸ *Cache Storage* : `plantrip-v…` contient `index.html` + les fichiers émis ;
3. DevTools ▸ *Network* ▸ *Offline*, ou couper le réseau, puis recharger / ouvrir une route profonde (`/mes-voyages`) : la page s'affiche, le bandeau « Hors connexion. » apparaît ;
4. Revenir en ligne : le bandeau disparaît, les services distants reprennent.

> `vite.config.js` utilise `base: '/'` : le service worker doit être servi **à la racine du
> domaine** (scope `/`). Servi dans un sous-dossier, `sw.js` ne couvrirait pas toutes les routes.

## Design system

`src/design/ui.jsx` : `Button`, `IconButton`, `Card`, `PageHeader`, `SectionHeader`,
`Pill`, `Progress`, `Field`, `TextInput`, `TextArea`, `SelectInput`, `Toggle`, `Checkbox`,
`EmptyState`, `ErrorState`, `StatTile`, `Modal`, `Spinner`, `Skeleton`.

Couleurs : actions/sélection → `pt-green`, texte vert sur fond clair → `pt-green-ink`
(`#2C7857`, variante AA), accents texte → `pt-orange-ink`, aplats →
`#FFBA3D`. Typographie : Space Grotesk (`font-display`) + Inter. Icônes : SVG ligne 24 px,
trait 2 px, `currentColor`.

## Tests

Trois suites distinctes : **232 tests unitaires** (22 fichiers, `npm run test` — dont
l'API serveur), **45 tests en navigateur** (`npm run test:e2e`, dont **21 tests d'audit
accessibilité** couvrant 27 pages/états) et le gate `npm run verify` (lint + unitaires + build).

```bash
npm run test
```

- `src/domain/*.test.js` — budget, estimation, itinéraire, documents, checklist, format, trip
- `src/services/{routing,places}.test.js` — haversine, estimation, GPX, profils véhicule, recherche de lieux
- `src/state/store.test.js` — persistance et cycles de sauvegarde
- `src/App.test.jsx` — navigation publique, app, 404, onglets de voyage
- `src/App.offline.test.jsx` — écran rendu avec réseau injoignable : bandeau, données locales, échec explicite de la recherche, reprise en ligne
- `src/pages/ResultatVoyage.test.jsx` — écran de résultat : modèle de voyage, hors ligne, hébergements par véhicule, repas, GPX
- `src/pwa/service-worker-source.test.js` — script du service worker **exécuté** (précache, repli de navigation, purge, cross-origin jamais intercepté)
- `src/pwa/pwa.test.js` — manifeste, dimensions des icônes PNG, câblage `index.html` / `main.jsx`, enregistrement du service worker
- `src/lib/connectivity.test.jsx` — état `online` / `offline` et bandeau explicite
- `src/lib/password.test.js`, `src/lib/auth.test.jsx` — hachage PBKDF2, inscription/connexion
  sans mot de passe en clair, migration des anciens comptes, changement de mot de passe,
  absence de WebCrypto
- `server/server.test.js` — API réelle (serveur sur un port libre, boîte aux lettres temporaire) :
  inscription, connexion, sessions, changement de mot de passe, Magic Link (code, lien,
  réutilisation), profil (`PATCH profile`), origine des liens (`PUBLIC_URL`), en-têtes de
  sécurité et repli SPA des fichiers statiques, purge des sessions expirées, limites de débit
  (globales et par adresse avec `TRUST_PROXY`), absence de hachages dans les réponses, corps JSON non objet (400), cookie mal encodé, lien magique refusé sur Host non maîtrisé, cookie `Secure` sous `PUBLIC_URL` https, pré-détournement de compte, limite des inscriptions, migration de la colonne `verified`
- `src/components/AuthSecurityNotice.test.jsx` — bandeau d'honnêteté sur les pages de compte
- `src/pages/Contact.test.jsx` — lien `mailto:` construit par le formulaire, aucun faux envoi
- `src/test/network.test.js` — garantit qu'aucun test ne dépend du réseau

Toute la suite est **hermétique** : `src/test/setup.js` remplace `fetch` par un stub qui refuse,
ce qui rend la CI déterministe (pas d'appel à OSRM, Photon ou Overpass pendant les tests).
`server/server.test.js` restaure le `fetch` natif : il ne parle qu'au serveur local qu'il lance.

### Tests de bout en bout (Playwright)

```bash
npx playwright install chromium   # une fois
npm run test:e2e
```

- `playwright.config.js` — `testDir: e2e`, URL de base `http://127.0.0.1:4173`, Chromium,
  `webServer` = `npm run build && node server/index.js --fresh --port 4173` : les parcours
  s'exécutent sur le **bundle de production servi par le serveur PlanTrip** (API
  d'authentification et service worker compris), base vierge à chaque session.
  Trace + captures en cas d'échec.
- `e2e/helpers.js` — mocks Photon/OSRM/Overpass/tuiles OSM (déterminisme), surveillance
  des erreurs JS/console, `createTrip()` : le voyage est créé dans le contexte du test,
  **aucun compte ni mot de passe réel n'est stocké dans le dépôt**.
- `e2e/journey.spec.js` — accueil → préparation → véhicule → calcul → résultat → les 7 sections du voyage
- `e2e/routes.spec.js` — 13 routes publiques + 404 : pas d'écran blanc, pas de `NaN` / `undefined`, aucune erreur JS
- `e2e/app.spec.js` — création d'un compte (mot de passe haché côté serveur **et** en clair
  jamais présent dans le miroir local), profil (nom sauvegardé sur le serveur **et** dans le
  miroir local), export de sauvegarde (téléchargement réel),
  changement de mot de passe, déconnexion/reconnexion, session serveur expirée (cookie supprimé → interface déconnectée au rechargement), tableau de bord, onglets
- `e2e/auth.spec.js` — Magic Link de bout en bout : le code et le lien sont lus dans les
  fichiers `.eml` du serveur, connexion par code, connexion par `?magique=`, refus d'un lien
  déjà consommé
- `e2e/offline.spec.js` — perte réseau réelle (`context.setOffline(true)`), rechargement hors ligne : SW actif, données locales, bandeau explicite
- `e2e/a11y.spec.js` — audit axe-core (ci-dessous)

45 tests Playwright au total, commandes séparées de la suite unitaire.

### Audit accessibilité automatisé

```bash
npm run test:a11y
```

`@axe-core/playwright`, règles WCAG 2.1 A/AA (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`)
sur **27 pages/états** (21 tests) : accueil, préparation, résultat, tableau de bord, connexion,
création de compte, 10 pages publiques (dont le 404), 3 pages applicatives, mon profil
connecté (formulaire de sécurité) et les 7 sections de l'espace voyage. Une seule violation
fait échouer le test ; le détail
(nœud + résumé) est écrit dans `test-results/a11y/<page>.json`.

**Zéro violation**, aucune règle désactivée (ni `disableRules`, ni `exclude`) : les
correctifs sont dans le code.

- **Contraste (196 nœuds signalés au premier passage)** — paliers de texte relevés au
  minimum AA sur tous les fonds clairs utilisés (`text-pt-neutral/30…65` → `/70…80`) ;
  blanc translucide sur fonds foncés/verts remplacé par du blanc plein (`Footer`,
  bandeau d'appel de l'accueil, puces de repas sélectionnées) ; numéros d'étape
  `text-pt-orange-ink/30` → encre pleine ; `text-pt-danger/70` → `text-pt-danger` ;
  variante de texte `pt.green-ink` (`#2C7857`) pour le vert sur fonds clairs — le vert
  d'identité `#2E7D5B` reste inchangé pour les fonds, bordures et le manifeste.
- **Libellés de formulaire** — `aria-label` sur les champs date, heure, budget et les
  trois curseurs de priorité ; `htmlFor`/`id` sur les champs ville et les heures.
- **Noms accessibles** — marqueurs Leaflet nommés via `src/lib/leaflet-a11y.js`
  (l'icône n'existe qu'à l'événement `add` de Leaflet), barres `role="progressbar"`
  nommées par la prop `label` de `Progress`, boutons « +/− voyageurs ».

Aucune exception documentée n'est nécessaire : les sept priorités (nom accessible,
libellés, contraste, titres, boutons/liens, focus, ARIA) sont satisfaites.

## Déploiement local

Le serveur fourni (`server/index.js`) sert `dist/` **avec repli SPA** (URL profondes comme
`/voyages/abc/lieux`) et l'API d'authentification :

```bash
npm run build
npm start          # http://127.0.0.1:4174 (HOST / PORT / MAIL_MODE : voir ci-dessus)
```

Pour tester le routage SPA sans API, n'importe quel serveur statique convient :

```bash
npm run preview    # Vite, port 4173
python serve.py    # http://localhost:8000, repli sur index.html
```

## Accessibilité

Lien d'évitement, focus visible, contrastes AA, navigation clavier complète, libellés de
formulaires, doubles signaux couleur/libellé. Déclaration détaillée sur `/accessibilite`.

Contrôlé en continu par l'audit automatisé décrit plus haut (`npm run test:a11y`, 27
pages/états en 21 tests, règles WCAG 2.1 A/AA, aucune règle désactivée) et exécuté dans la
CI à chaque push.

## Audit des dépendances

- `npm audit --omit=dev` → **0 vulnérabilité** : aucune dépendance de production
  (`react`, `react-dom`, `react-router-dom`, `leaflet`, `nodemailer`) n'est concernée.
- `npm audit` complet → **0 vulnérabilité** (octobre 2026). Les 5 alertes *high*
  historiques venaient de `braces` (GHSA-vfj7-8cjw-p6xm, épuisement de pile sur motifs
  imbriqués), remonté par `micromatch` → `fast-glob` / `chokidar` → `tailwindcss@3.4.x` :
  advisory couvrant *toutes* les versions publiées de `braces`, donc sans correctif sur
  la branche 3.x. La migration vers **Tailwind CSS 4** (lot « migration ») a fait disparaître
  cette chaîne de dépendances : `npm audit fix --force` n'est plus nécessaire.

## Licence

MIT. Données cartographiques © OpenStreetMap (ODbL).
