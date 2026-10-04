# PlanTrip

> Itinéraire, budget, lieux, documents et checklists réunis dans un seul espace — adapté à votre véhicule et à vos envies. Vos voyages restent consultables hors connexion.

PlanTrip est une application web de préparation de voyage en français. Tout est calculé et conservé **localement** dans le navigateur : aucun compte serveur, aucune base de données distante, aucun traceur publicitaire.

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
| Styles | Tailwind CSS 3.4, tokens `pt.*` dans `tailwind.config.js` |
| Cartographie | Leaflet 1.9 (bundlé, CDN retiré) |
| Routage / géocodage | OSRM + Photon (OSM, public) |
| Tests | Vitest 5 + jsdom + Testing Library |
| Hors connexion | Service worker généré par Vite + Web App Manifest |
| Lint | oxlint |

## Démarrage

Prérequis : **Node.js 24 (LTS)** et npm. Le lockfile `package-lock.json` fait foi.

```bash
npm ci           # installation reproductible depuis le lockfile
npm run dev      # serveur de développement
npm run verify   # lint + tests + build — qualité complète
npm run preview  # sert dist/ après build
```

## Scripts

| Commande | Effet |
| --- | --- |
| `npm run dev` | serveur Vite en développement |
| `npm run lint` | oxlint sur `src/` (0 erreur / 0 warning attendus) |
| `npm run test` | `vitest run` (17 fichiers de test) |
| `npm run test:watch` | mode suivi |
| `npm run build` | bundle de production dans `dist/` |
| `npm run preview` | sert le bundle généré |
| `npm run verify` | `lint && test && build` (gate de qualité) |

## CI GitHub Actions

`.github/workflows/verify.yml` exécute la même commande que le gate local, sur chaque
**push** et chaque **pull request** :

1. `actions/checkout@v4`
2. `actions/setup-node@v4` — Node 24 (LTS) + cache npm
3. `npm ci` — installation strictement depuis `package-lock.json`
4. `npm run verify` — oxlint, Vitest, Vite build

La CI a un accès réseau (elle s'exécute sur GitHub), mais **les tests n'en dépendent pas** :
`src/test/setup.js` neutralise `fetch`, un test le garantit
(`src/test/network.test.js`) et chaque service distant possède son propre repli.

## Architecture

```
src/
├── design/        tokens, Icon.jsx (~90 icônes), ui.jsx (design system)
├── layout/        PublicLayout, MarketingHeader, Footer, AppShell, BottomNav
├── components/    MapView, PlaceSearch, trip/TripLayout
├── domain/        logique pure + tests : trip, budget, estimate, itinerary,
│                  documents, checklist, format
├── services/      routing (OSRM, GPX), geocoding (Photon), places (Overpass)
├── state/         store.js — persistance localStorage + réactivité React
├── lib/           storage primitives, auth, tripInfo (véhicules), online (état réseau), connectivity (bandeau hors connexion)
├── pwa/           service worker (génération + enregistrement) et ses tests
├── data/          vehicles.json, questions
├── pages/         écrans publics, app/ (espace voyageur), app/trip/ (7 onglets), legal/
└── App.test.jsx   smoke tests de navigation
```

### Routes

**Public** : `/`, `/vehicules` (+ `/:slug`), `/fonctionnalites`, `/preparer-son-voyage`,
`/resultat-voyage`, `/login`, `/register`, `/blog`, `/faq`, `/contact`,
`/mentions-legales`, `/confidentialite`, `/accessibilite`.

**Connecté** (`AppShell`) : `/tableau-de-bord`, `/mes-voyages`, `/budget`, `/mon-profil`,
puis `/voyages/:tripId` avec `overview`, `itineraire`, `calendrier`, `budget`, `lieux`,
`documents`, `organisation`.

### Comptes locaux

`src/lib/auth.jsx` gère une authentification **entièrement locale** : les comptes, mots de passe
et codes à usage unique sont stockés dans `localStorage`, aucune requête réseau n'est émise.
Le mode « Magic Link » affiche le code dans l'interface (en production, il serait envoyé par
e-mail). `loginWithProvider` simule OAuth le temps d'un branchement Supabase/Firebase.

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

Couleurs : actions/sélection → `pt-green`, accents texte → `pt-orange-ink`, aplats →
`#FFBA3D`. Typographie : Space Grotesk (`font-display`) + Inter. Icônes : SVG ligne 24 px,
trait 2 px, `currentColor`.

## Tests

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
- `src/test/network.test.js` — garantit qu'aucun test ne dépend du réseau

Toute la suite est **hermétique** : `src/test/setup.js` remplace `fetch` par un stub qui refuse,
ce qui rend la CI déterministe (pas d'appel à OSRM, Photon ou Overpass pendant les tests).

## Déploiement local

Le bundle `dist/` peut être servi par n'importe quel serveur statique. Pour tester le
routage SPA (URL profondes comme `/voyages/abc/lieux`) :

```bash
npm run build
python serve.py      # http://localhost:8000, repli sur index.html
```

## Accessibilité

Lien d'évitement, focus visible, contrastes AA, navigation clavier complète, libellés de
formulaires, doubles signaux couleur/libellé. Déclaration détaillée sur `/accessibilite`.

## Licence

MIT. Données cartographiques © OpenStreetMap (ODbL).
