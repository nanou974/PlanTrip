import '@testing-library/jest-dom/vitest'
import { webcrypto } from 'node:crypto'
import { vi } from 'vitest'

/**
 * jsdom n'expose pas `crypto.subtle` (seulement `getRandomValues`) alors que
 * le hachage des mots de passe en a besoin : on injecte l'implémentation Node.
 */
if (!globalThis.crypto?.subtle) {
  vi.stubGlobal('crypto', webcrypto)
}

/**
 * Aucun test ne doit dépendre du réseau (CI déterministe, rapide, hors ligne) :
 * `fetch` est neutralisé ici et renvoie une rejection. Les tests qui ont besoin
 * d'un comportement précis le remplacent avec `vi.stubGlobal('fetch', …)`.
 */
vi.stubGlobal(
  'fetch',
  vi.fn(() => Promise.reject(new Error('réseau désactivé pendant les tests'))),
)
