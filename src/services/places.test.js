import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  POI_CATEGORIES,
  boundsOf,
  categoryFor,
  distanceToPathMeters,
  routePolyline,
  searchAlongRoute,
  segmentDistanceMeters,
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
})
