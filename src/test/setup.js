import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

/**
 * Aucun test ne doit dépendre du réseau (CI déterministe, rapide, hors ligne) :
 * `fetch` est neutralisé ici et renvoie une rejection. Les tests qui ont besoin
 * d'un comportement précis le remplacent avec `vi.stubGlobal('fetch', …)`.
 */
vi.stubGlobal(
  'fetch',
  vi.fn(() => Promise.reject(new Error('réseau désactivé pendant les tests'))),
)
