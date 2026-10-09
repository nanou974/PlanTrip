import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { findAccommodations, searchAccommodationsViaServer, toAccommodations } from './places.js'

const route = [
  [2.35, 48.85],
  [2.6, 48.6],
  [2.9, 48.3],
]

const aire = {
  type: 'node',
  id: 11,
  lat: 48.6,
  lon: 2.6,
  tags: { tourism: 'caravan_site', name: 'Aire de Test', fee: 'yes', charge: '14.38 EUR', sanitary_dump_station: 'yes', water_point: 'yes' },
}
const gratuite = { type: 'node', id: 12, lat: 48.3, lon: 2.9, tags: { tourism: 'caravan_site', name: 'Aire gratuite', fee: 'no' } }
const loin = { type: 'node', id: 13, lat: 49.5, lon: 3.5, tags: { tourism: 'caravan_site', name: 'Trop loin' } }

describe('toAccommodations', () => {
  it('ajoute le prix, la gratuité et les services indiqués par OpenStreetMap', () => {
    const items = toAccommodations([aire, gratuite, loin], route, 5000)
    expect(items.map((i) => i.name).sort()).toEqual(['Aire de Test', 'Aire gratuite'])
    const a = items.find((i) => i.id === 'node-11')
    expect(a).toMatchObject({ type: 'aire', fee: 'paid', price: 14.38, services: { dump: true, water: true, power: false } })
    expect(items.find((i) => i.id === 'node-12')).toMatchObject({ fee: 'free', price: null })
  })

  it('reste valable pour un lieu sans aucune information tarifaire', () => {
    const [item] = toAccommodations([{ type: 'node', id: 1, lat: 48.6, lon: 2.6, tags: { tourism: 'hotel' } }], route, 5000)
    expect(item).toMatchObject({ type: 'hotel', fee: null, price: null })
  })
})

describe('recherche via le serveur PlanTrip', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('interroge /api/lodging-map avec un tracé allégé et renvoie les hébergements', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ elements: [aire], source: 'OpenStreetMap' }) })
    const items = await searchAccommodationsViaServer(route, { radiusMeters: 5000 })
    expect(items).toHaveLength(1)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('/api/lodging-map')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body).polyline.length).toBe(3)
  })

  it('renvoie null si le serveur répond une erreur, une réponse illisible ou est injoignable', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 502 })
    expect(await searchAccommodationsViaServer(route)).toBeNull()
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ nope: true }) })
    expect(await searchAccommodationsViaServer(route)).toBeNull()
    fetch.mockRejectedValueOnce(new Error('offline'))
    expect(await searchAccommodationsViaServer(route)).toBeNull()
  })

  it('findAccommodations se replie sur Overpass direct quand le serveur ne répond pas', async () => {
    fetch.mockImplementation(async (url) => {
      if (url === '/api/lodging-map') return { ok: false, status: 502 }
      return { ok: true, json: async () => ({ elements: [aire] }) }
    })
    const items = await findAccommodations(route)
    expect(items).toHaveLength(1)
    expect(fetch.mock.calls.some(([u]) => String(u).includes('overpass'))).toBe(true)
  })

  it('findAccommodations n’appelle pas Overpass quand le serveur a répondu', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ elements: [aire] }) })
    await findAccommodations(route)
    expect(fetch.mock.calls.every(([u]) => u === '/api/lodging-map')).toBe(true)
  })

  it('findAccommodations renvoie null quand ni le serveur ni Overpass ne répondent', async () => {
    fetch.mockRejectedValue(new Error('offline'))
    expect(await findAccommodations(route)).toBeNull()
  })
})