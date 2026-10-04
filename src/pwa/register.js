/**
 * Enregistrement du service worker PlanTrip.
 *
 * Appelé depuis `main.jsx` uniquement en production : en développement, `sw.js`
 * n'existe pas et un service worker gênerait le HMR.
 *
 * Échec (hors ligne, refus du navigateur, site servi en http non local) : la
 * promesse se résout en `null` — l'application reste pleinement utilisable, seul
 * le mode installable/hors connexion est perdu.
 */

export const SW_URL = 'sw.js'

export async function registerServiceWorker({ swUrl = SW_URL } = {}) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register(swUrl)
  } catch {
    return null
  }
}
