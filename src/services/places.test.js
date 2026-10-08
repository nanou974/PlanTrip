import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  POI_CATEGORIES,
  accommodationType,
  aroundClause,
  boundsOf,
  categoryFor,
  distanceToPathMeters,
  routePolyline,
  samplePolyline,
  searchAccommodations,
  searchAlongRoute,
  segmentDistanceMeters,
  thinByCell,
} from './places.js'

const line = [
  [2.35, 48.85],
  [4.83, 45.76],
]

describe('routePolyline', () => {
  it('utilise les coordonnées enregistrées', () => {
    expect(routePolyline({ itinerary: { coordinates: line } })).toEqual(line)
  })

  it("tombe sur l'estimation si l'itinéraire n'est pas calculé", () => {
    const polyline = routePolyline({
      departure: { name: 'Paris', lat: 48.85, lon: 2.35 },
      destination: { name: 'Lyon', lat: 45.76, lon: 4.83 },
      places: [],
    })
    expect(polyline.length).toBeGreaterThanOrEqual(2)
  })

  it('renvoie un tracé vide sans destination', () => {
    expect(routePolyline({ departure: { lat: 48.85, lon: 2.35 }, places: [] })).toEqual([])
  })
})

describe('distances', () => {
  it('mesure la distance à un segment', () => {
    const a = [0, 0]
    const b = [1, 0]
    expect(segmentDistanceMeters({ lat: 0, lon: 0.5 }, a, b)).toBeCloseTo(0, 0)
    expect(segmentDistanceMeters({ lat: 0.01, lon: 0.5 }, a, b)).toBeCloseTo(1113, -1)
  })

  it('borné aux extrémités du segment', () => {
    const onLine = segmentDistanceMeters({ lat: 0, lon: 2 }, [0, 0], [1, 0])
    expect(onLine).toBeCloseTo(111320, -1)
  })

  it('distance minimale au tracé', () => {
    const d = distanceToPathMeters({ lat: 48.85, lon: 3.5 }, line)
    expect(Number.isFinite(d)).toBe(true)
    expect(d).toBeGreaterThan(0)
    expect(d).toBeLessThan(500000)
  })

  it('sans tracé, distance infinie', () => {
    expect(distanceToPathMeters({ lat: 0, lon: 0 }, [])).toBe(Infinity)
  })
})

describe('boundsOf', () => {
  it('englobe le tracé avec du padding', () => {
    const b = boundsOf(line, 0.1)
    expect(b.west).toBeCloseTo(2.25, 5)
    expect(b.east).toBeCloseTo(4.93, 5)
    expect(b.south).toBeCloseTo(45.66, 5)
    expect(b.north).toBeCloseTo(48.95, 5)
  })
})

describe('catégories', () => {
  it('couvre les types du cahier des charges', () => {
    expect(POI_CATEGORIES.map((c) => c.kind)).toEqual(['restaurant', 'fuel', 'rest-area', 'poi'])
    expect(categoryFor('fuel').label).toContain('Stations')
    expect(categoryFor('inconnu').id).toBe('restaurant')
  })
})

describe('searchAlongRoute', () => {
  afterEach(() => vi.unstubAllGlobals())

  const trip = {
    departure: { name: 'Paris', lat: 48.85, lon: 2.35 },
    destination: { name: 'Lyon', lat: 45.76, lon: 4.83 },
    places: [],
    itinerary: { coordinates: line },
  }

  function respondWith(elements) {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ elements }),
    })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('filtre par rayon autour du tracé', async () => {
    const fetchMock = respondWith([
      { type: 'node', id: 1, lat: 48.85, lon: 2.4, tags: { name: 'Le Relais' } },
      { type: 'node', id: 2, lat: -33.9, lon: 151.2, tags: { name: 'Sydney Cafe' } },
      { type: 'way', id: 3, center: { lat: 45.76, lon: 4.9 }, tags: { name: 'Gare de Lyon' } },
    ])

    const results = await searchAlongRoute(trip, { category: 'restaurant' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(results.map((r) => r.name)).toEqual(['Le Relais', 'Gare de Lyon'])
    expect(results[0].kind).toBe('restaurant')
    expect(results[0].distanceMeters).toBeGreaterThanOrEqual(0)
    expect(results[0].id).toMatch(/^osm-/)
  })

  it('borne le nombre de résultats', async () => {
    respondWith(
      Array.from({ length: 30 }, (_, i) => ({
        type: 'node',
        id: i + 1,
        lat: 48.85,
        lon: 2.35 + i * 0.001,
        tags: { name: `Spot ${i + 1}` },
      })),
    )
    const results = await searchAlongRoute(trip, { limit: 5 })
    expect(results).toHaveLength(5)
  })

  it('refuse un trajet incomplet', async () => {
    await expect(searchAlongRoute({ places: [] })).rejects.toThrow(/Itinéraire incomplet/)
  })

  it('signale un service indisponible', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))
    await expect(searchAlongRoute(trip)).rejects.toThrow(/momentanément indisponible/)
  })

  it('garde les plus proches du tracé même au-delà de la limite (tri avant découpe)', async () => {
    const far = Array.from({ length: 25 }, (_, i) => ({
      type: 'node', id: i + 1, lat: 48.85 + 0.04, lon: 2.35 + i * 0.0001, tags: { name: `Loin ${i + 1}` },
    }))
    const near = { type: 'node', id: 99, lat: 48.85, lon: 2.35, tags: { name: 'Pile sur la route' } }
    respondWith([...far, near])
    const results = await searchAlongRoute(trip, { limit: 3 })
    expect(results[0].name).toBe('Pile sur la route')
    expect(results).toHaveLength(3)
  })

  it('demande un couloir around et out center (surfaces incluses)', async () => {
    const fetchMock = respondWith([])
    await searchAlongRoute(trip, { radiusMeters: 5000 })
    const body = decodeURIComponent(fetchMock.mock.calls[0][1].body.replace(/^data=/, ''))
    expect(body).toContain('nwr[')
    expect(body).toContain('(around:5000,48.85000,2.35000,45.76000,4.83000)')
    expect(body).toContain('out center')
    expect(body).not.toContain('out body')
  })
})

describe('samplePolyline / aroundClause', () => {
  const long = Array.from({ length: 1000 }, (_, i) => [2 + i * 0.003, 48 - i * 0.002])

  it('limite le nombre de points en gardant les extrémités', () => {
    const s = samplePolyline(long, 50)
    expect(s).toHaveLength(50)
    expect(s[0]).toEqual(long[0])
    expect(s[49]).toEqual(long[999])
  })

  it('ne modifie pas un tracé court', () => {
    expect(samplePolyline(line, 50)).toEqual(line)
  })

  it('produit une clause around bornée pour un long trajet', () => {
    const clause = aroundClause(long, 6000, 60)
    expect(clause.startsWith('(around:6000,')).toBe(true)
    expect(clause.split(',').length).toBe(1 + 60 * 2)
  })
})

describe('hébergements le long du trajet', () => {
  afterEach(() => vi.unstubAllGlobals())

  const route = [
    [2.35, 48.85],
    [4.83, 45.76],
  ]

  function respondWith(elements, ok = true) {
    const fetchMock = vi.fn().mockResolvedValue({ ok, json: async () => ({ elements }) })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('bascule sur un autre serveur Overpass quand le premier est saturé', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 504 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ elements: [{ type: 'node', id: 1, lat: 47.0, lon: 3.5, tags: { tourism: 'hotel', name: 'H' } }] }),
      })
    vi.stubGlobal('fetch', fetchMock)
    const items = await searchAccommodations(route)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toContain('overpass-api.de')
    expect(fetchMock.mock.calls[1][0]).not.toContain('overpass-api.de')
    expect(Array.isArray(items)).toBe(true)
  })

  it('classe les étiquettes OSM, sans appeler « Airbnb » un appartement OSM', () => {
    expect(accommodationType({ tourism: 'hotel' })).toBe('hotel')
    expect(accommodationType({ tourism: 'guest_house' })).toBe('hotel')
    expect(accommodationType({ tourism: 'caravan_site' })).toBe('aire')
    expect(accommodationType({ tourism: 'camp_site' })).toBe('camping')
    expect(accommodationType({ tourism: 'apartment' })).toBe('apartment')
    expect(accommodationType({})).toBe('other')
  })

  it('interroge un couloir around, pas la boîte englobante, et inclut les surfaces', async () => {
    const fetchMock = respondWith([])
    await searchAccommodations(route, { radiusMeters: 5000 })
    const body = decodeURIComponent(fetchMock.mock.calls[0][1].body.replace(/^data=/, ''))
    expect(body).toContain('nwr[')
    expect(body).toContain('(around:5000,')
    expect(body).toContain('out center')
  })

  it('élimine ce qui est hors couloir et garde un hébergement par zone et par type', async () => {
    const nodes = [
      { type: 'node', id: 1, lat: 48.85, lon: 2.35, tags: { tourism: 'hotel' } },
      { type: 'node', id: 2, lat: 48.8501, lon: 2.3501, tags: { tourism: 'hotel', name: 'Hôtel du Pont', stars: '3' } },
      { type: 'node', id: 3, lat: 48.8502, lon: 2.3502, tags: { tourism: 'camp_site', name: 'Camping A' } },
      { type: 'way', id: 4, center: { lat: 45.76, lon: 4.83 }, tags: { tourism: 'hotel', name: 'Hôtel Lyon' } },
      { type: 'node', id: 5, lat: -33.9, lon: 151.2, tags: { tourism: 'hotel', name: 'Sydney' } },
    ]
    respondWith(nodes)
    const items = await searchAccommodations(route)
    expect(items.map((i) => i.name).sort()).toEqual(['Camping A', 'Hôtel Lyon', 'Hôtel du Pont'])
  })

  it('ne renvoie jamais des milliers de marqueurs', async () => {
    const many = Array.from({ length: 2400 }, (_, i) => ({
      type: 'node', id: i + 1, lat: 48.85 - (i % 60) * 0.0001, lon: 2.35 + (i % 60) * 0.0001, tags: { tourism: 'hotel', name: `H${i}` },
    }))
    respondWith(many)
    const items = await searchAccommodations(route)
    expect(items.length).toBeLessThanOrEqual(5)
  })

  it('renvoie null quand le service est injoignable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await searchAccommodations(route)).toBeNull()
    respondWith([], false)
    expect(await searchAccommodations(route)).toBeNull()
  })

  it('thinByCell garde le plus renseigné', () => {
    const a = { type: 'hotel', lat: 45.01, lon: 4.01, name: 'Sans nom', stars: null, website: null, distanceMeters: 10 }
    const b = { type: 'hotel', lat: 45.02, lon: 4.02, name: 'Bel Hôtel', stars: '4', website: null, distanceMeters: 500 }
    expect(thinByCell([a, b])).toEqual([b])
  })
})
