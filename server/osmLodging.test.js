import { describe, expect, it, vi } from 'vitest'
import { MAX_TILES, createOsmLodgingService, tilesFor, validateRequest } from './osmLodging.js'

const PARIS_LYON = [
  [2.35, 48.85],
  [3.5, 47.2],
  [4.83, 45.76],
]

function overpassAnswer(elements = []) {
  return { ok: true, status: 200, json: async () => ({ elements }) }
}

const aire = { type: 'node', id: 1, lat: 47.2, lon: 3.5, tags: { tourism: 'caravan_site', name: 'Aire', fee: 'yes', charge: '10 EUR', secret: 'x', 'addr:street': 'rue' } }

function service(fetchImpl) {
  return createOsmLodgingService({ config: { logger: { warn: () => {} } }, fetchImpl, endpoints: ['https://overpass.test/api'] })
}

describe('validateRequest', () => {
  it('accepte un tracé valide et borne le rayon', () => {
    expect(validateRequest({ polyline: PARIS_LYON }).radiusMeters).toBe(5000)
    expect(validateRequest({ polyline: PARIS_LYON, radiusMeters: 99999 }).radiusMeters).toBe(8000)
    expect(validateRequest({ polyline: PARIS_LYON, radiusMeters: 10 }).radiusMeters).toBe(1000)
  })

  it('refuse un tracé absent, trop court, trop long ou non numérique', () => {
    expect(validateRequest({}).error).toBeTruthy()
    expect(validateRequest({ polyline: [[1, 1]] }).error).toBeTruthy()
    expect(validateRequest({ polyline: Array.from({ length: 401 }, () => [1, 1]) }).error).toBeTruthy()
    expect(validateRequest({ polyline: [[1, 1], ['a', 2]] }).error).toBeTruthy()
    expect(validateRequest({ polyline: [[1, 1], [2, 95]] }).error).toBeTruthy()
  })
})

describe('tilesFor', () => {
  it('couvre tout le couloir, sans sauter de tuile sur un long segment', () => {
    const tiles = tilesFor([[2.35, 48.85], [4.83, 45.76]], 5000)
    expect(tiles.length).toBeGreaterThan(6)
    const keys = new Set(tiles.map((t) => t.key))
    expect(keys.size).toBe(tiles.length)
    expect(tiles.some((t) => t.south <= 48.85 && t.north > 48.85 && t.west <= 2.35 && t.east > 2.35)).toBe(true)
    expect(tiles.some((t) => t.south <= 45.76 && t.north > 45.76 && t.west <= 4.83 && t.east > 4.83)).toBe(true)
  })

  it('un trajet très long dépasse le plafond de tuiles', () => {
    expect(tilesFor([[-5, 36], [25, 60]], 5000).length).toBeGreaterThan(MAX_TILES)
  })
})

describe('createOsmLodgingService', () => {
  it('interroge Overpass en s’identifiant, ne garde que les étiquettes utiles et dédoublonne', async () => {
    const fetchImpl = vi.fn(async () => overpassAnswer([aire]))
    const { status, payload } = await service(fetchImpl).compute({ polyline: PARIS_LYON })
    expect(status).toBe(200)
    expect(payload.elements).toHaveLength(1)
    expect(payload.elements[0].tags).toEqual({ tourism: 'caravan_site', name: 'Aire', fee: 'yes', charge: '10 EUR' })
    const [, init] = fetchImpl.mock.calls[0]
    expect(init.headers['User-Agent']).toMatch(/PlanTrip/)
    expect(decodeURIComponent(init.body)).toContain('caravan_site')
    expect(payload.partial).toBe(false)
  })

  it('met chaque tuile en cache : un second trajet identique ne refait aucune requête', async () => {
    const fetchImpl = vi.fn(async () => overpassAnswer([aire]))
    const svc = service(fetchImpl)
    await svc.compute({ polyline: PARIS_LYON })
    const calls = fetchImpl.mock.calls.length
    const allow = vi.fn(() => true)
    const again = await svc.compute({ polyline: PARIS_LYON }, { allowUpstream: allow })
    expect(again.status).toBe(200)
    expect(fetchImpl.mock.calls.length).toBe(calls)
    expect(allow).not.toHaveBeenCalled()
  })

  it('applique la limite anti-abus seulement quand il faut interroger Overpass', async () => {
    const fetchImpl = vi.fn(async () => overpassAnswer([]))
    const { status } = await service(fetchImpl).compute({ polyline: PARIS_LYON }, { allowUpstream: () => false })
    expect(status).toBe(429)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('refuse un trajet trop long et une requête invalide', async () => {
    const svc = service(vi.fn())
    expect((await svc.compute({ polyline: [[-5, 36], [25, 60]] })).status).toBe(422)
    expect((await svc.compute({ polyline: 'x' })).status).toBe(400)
  })

  it('essaie le serveur suivant puis signale un résultat partiel si une tuile échoue', async () => {
    let n = 0
    const fetchImpl = vi.fn(async () => {
      n += 1
      if (n === 1) return { ok: false, status: 504, json: async () => ({}) }
      if (n === 2) return overpassAnswer([aire])
      return { ok: false, status: 504, json: async () => ({}) }
    })
    const svc = createOsmLodgingService({
      config: { logger: { warn: () => {} } },
      fetchImpl,
      endpoints: ['https://a.test/api', 'https://b.test/api'],
    })
    const { status, payload } = await svc.compute({ polyline: [[2.35, 48.85], [2.4, 48.9]] })
    expect(status).toBe(200)
    expect(payload.elements.length).toBeGreaterThanOrEqual(1)
  })

  it('renvoie 502 quand aucun serveur Overpass ne répond', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('réseau')
    })
    const { status } = await service(fetchImpl).compute({ polyline: [[2.35, 48.85], [2.4, 48.9]] })
    expect(status).toBe(502)
  })
})