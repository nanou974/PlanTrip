import { describe, expect, it, vi } from 'vitest'

/**
 * Garantie de CI : aucun test ne dépend du réseau.
 * `src/test/setup.js` neutralise `fetch` pour tout le monde.
 */
describe('environnement de test', () => {
  it('neutralise le réseau par défaut', async () => {
    await expect(fetch('https://router.project-osrm.org/route')).rejects.toThrow(
      /réseau désactivé/,
    )
  })

  it('permet à un test de remplacer fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
    await expect(fetch('https://example.test/route')).resolves.toEqual({ ok: true, status: 200 })
  })
})
