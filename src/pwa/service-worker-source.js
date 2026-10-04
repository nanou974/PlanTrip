/**
 * Génération du service worker PlanTrip.
 *
 * Pur : aucune dépendance au navigateur ni à Vite — la source produite est
 * vérifiable et exécutable en Node (tests `src/pwa/service-worker-source.test.js`).
 *
 * Stratégie :
 *  - navigation (SPA)  : réseau d'abord, repli sur l'index.html précache (aucun écran blanc hors connexion) ;
 *  - ressources same-origin : cache d'abord (fichiers hachés par Vite), puis réseau ;
 *  - ressources cross-origin (OSRM, Photon, Overpass, tuiles OSM, Google Fonts) : jamais interceptées,
 *    donc jamais mises en cache — elles restent « réseau seul ».
 */

export const CACHE_PREFIX = 'plantrip-'

/** Fichiers jamais servis depuis le cache. */
export const NEVER_CACHE_PATHS = ['/sw.js']

/** Hash FNV-1a déterministe sur la liste de fichiers précache. */
export function precacheVersion(files = []) {
  const input = [...files].map(String).sort().join('|')
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

/**
 * @param {{precache?: string[], version?: string}} options
 * @returns {string} source complète du service worker (script classique)
 */
export function generateServiceWorker({ precache = [], version = 'dev' } = {}) {
  const paths = [...new Set(precache.map(String))].sort()
  const cacheName = `${CACHE_PREFIX}${version}`

  return `/* PlanTrip — service worker généré à la construction (vite.config.js). */
const PRECACHE = ${JSON.stringify(paths, null, 2)};
const CACHE_NAME = ${JSON.stringify(cacheName)};
const CACHE_PREFIX = ${JSON.stringify(CACHE_PREFIX)};
const NEVER_CACHE = ${JSON.stringify(NEVER_CACHE_PATHS)};
const SHELL_URL = new URL('index.html', self.location.href).href;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (!request || request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (err) {
    return;
  }
  // Hors origine : on laisse le navigateur aller au réseau, jamais de cache.
  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE.some((path) => url.pathname === path)) return;

  event.respondWith(handleFetch(request));
});

async function handleFetch(request) {
  if (request.mode === 'navigate') {
    try {
      const res = await fetch(request);
      if (res && res.ok) return res;
    } catch (err) {
      /* hors ligne : on retombe sur le shell précache */
    }
    const shell = await caches.match(SHELL_URL);
    return shell || Response.error();
  }

  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const res = await fetch(request);
    if (res && res.ok && res.type === 'basic') {
      const copy = res.clone();
      caches
        .open(CACHE_NAME)
        .then((cache) => cache.put(request, copy))
        .catch(() => undefined);
    }
    return res;
  } catch (err) {
    return Response.error();
  }
}
`
}
