import { describe, expect, it } from 'vitest'
import {
  KIND_LABEL,
  PLACE_KINDS,
  ROUTE_KINDS,
  addPlace,
  createPlace,
  estimateItinerary,
  haversine,
  isRoutePlace,
  itineraryPoints,
  itineraryState,
  movePlace,
  nextOrder,
  removePlace,
  routePlaces,
  sortPlaces,
  withRoutePlaces,
} from './itinerary.js'

const paris = { name: 'Paris', lat: 48.8566, lon: 2.3522 }
const lyon = { name: 'Lyon', lat: 45.764, lon: 4.8357 }

const trip = () => ({
  departure: paris,
  destination: lyon,
  places: [],
  itinerary: { distanceKm: 0, durationSec: 0, polyline: [] },
})

describe('createPlace', () => {
  it('normalise les champs', () => {
    const place = createPlace({ name: '  Dijon  ', lat: '47.3', lon: '5.0', day: 0, kind: 'inconnu' })
    expect(place.name).toBe('Dijon')
    expect(place.lat).toBe(47.3)
    expect(place.lon).toBe(5)
    expect(place.day).toBe(1)
    expect(place.kind).toBe('stop')
    expect(place.order).toBe(0)
    expect(place.id).toMatch(/^p_/)
  })

  it('garde les types connus', () => {
    expect(createPlace({ name: 'Camping', kind: 'lodging' }).kind).toBe('lodging')
    expect(createPlace({ name: 'Musée', kind: 'poi' }).kind).toBe('poi')
  })
})

describe('triant des étapes', () => {
  it('trie puis réordonne', () => {
    const a = createPlace({ name: 'B', order: 2 })
    const b = createPlace({ name: 'A', order: 1 })
    expect(sortPlaces([a, b]).map((p) => p.name)).toEqual(['A', 'B'])
    const moved = movePlace([a, b], 0, 1)
    expect(moved.map((p) => p.name)).toEqual(['B', 'A'])
    expect(moved.map((p) => p.order)).toEqual([1, 2])
  })

  it('ignore un déplacement hors bornes', () => {
    const list = [createPlace({ name: 'A', order: 1 })]
    expect(movePlace(list, 0, -1)).toBe(list)
    expect(movePlace(list, 0, 1)).toBe(list)
  })

  it('retire et réattribue les ordres', () => {
    const a = createPlace({ name: 'A', order: 1 })
    const b = createPlace({ name: 'B', order: 2 })
    const next = removePlace([a, b], a.id)
    expect(next).toHaveLength(1)
    expect(next[0].order).toBe(1)
  })

  it('propose l’ordre suivant', () => {
    expect(nextOrder(trip())).toBe(1)
    const withPlaces = { places: [createPlace({ name: 'A', order: 1 }), createPlace({ name: 'B', order: 4 })] }
    expect(nextOrder(withPlaces)).toBe(5)
  })
})

describe('itineraryPoints', () => {
  it('ordonne départ → étapes → destination', () => {
    const t = {
      ...trip(),
      places: [createPlace({ name: 'Dijon', lat: 47.3, lon: 5, order: 1 })],
    }
    expect(itineraryPoints(t).map((p) => p.name)).toEqual(['Paris', 'Dijon', 'Lyon'])
  })

  it('n’intègre que les lieux routables', () => {
    const t = {
      ...trip(),
      places: [
        createPlace({ name: 'Dijon', lat: 47.3, lon: 5, order: 1 }),
        createPlace({ name: 'McDo', lat: 47.5, lon: 5.1, order: 2, kind: 'restaurant' }),
        createPlace({ name: 'Total', lat: 47.7, lon: 5.2, order: 3, kind: 'fuel' }),
        createPlace({ name: 'Gîte', lat: 46.9, lon: 4.9, order: 4, kind: 'lodging' }),
      ],
    }
    expect(itineraryPoints(t).map((p) => p.name)).toEqual(['Paris', 'Dijon', 'Gîte', 'Lyon'])
  })

  it('écarte les points sans coordonnées', () => {
    const t = {
      departure: paris,
      destination: { name: 'Inconnu', lat: null, lon: null },
      places: [],
    }
    expect(itineraryPoints(t)).toHaveLength(1)
  })

  it('ajoute une étape en fin de liste', () => {
    const t = addPlace(trip(), { name: 'Dijon', lat: 47.3, lon: 5 })
    expect(t).toHaveLength(1)
    expect(t[0].order).toBe(1)
  })
})

describe('classification des lieux', () => {
  it('couvre les catégories du cahier des charges', () => {
    expect(ROUTE_KINDS).toEqual(['stop', 'lodging'])
    for (const kind of ['stop', 'lodging', 'restaurant', 'poi', 'rest-area', 'fuel', 'address']) {
      expect(PLACE_KINDS).toContain(kind)
      expect(KIND_LABEL[kind]).toBeTruthy()
    }
    expect(isRoutePlace(createPlace({ kind: 'restaurant' }))).toBe(false)
    expect(isRoutePlace(createPlace({ kind: 'lodging' }))).toBe(true)
  })

  it('routePlaces ne garde que les étapes et hébergements', () => {
    const all = [
      createPlace({ name: 'Restaurant', kind: 'restaurant', order: 1 }),
      createPlace({ name: 'Étape', kind: 'stop', order: 2 }),
      createPlace({ name: 'Station', kind: 'fuel', order: 3 }),
      createPlace({ name: 'Gîte', kind: 'lodging', order: 4 }),
    ]
    expect(routePlaces(all).map((p) => p.name)).toEqual(['Étape', 'Gîte'])
  })

  it('withRoutePlaces réinjecte les lieux secondaires et réattribue les ordres', () => {
    const stop = createPlace({ name: 'Étape', kind: 'stop', order: 1 })
    const restaurant = createPlace({ name: 'Restaurant', kind: 'restaurant', order: 2 })
    const lodging = createPlace({ name: 'Gîte', kind: 'lodging', order: 3 })
    const all = [stop, restaurant, lodging]

    const moved = withRoutePlaces(all, routePlaces(all).slice().reverse())
    expect(moved.map((p) => p.name)).toEqual(['Gîte', 'Étape', 'Restaurant'])
    expect(moved.map((p) => p.order)).toEqual([1, 2, 3])
    expect(moved).toHaveLength(3)
  })
})

describe('estimation', () => {
  it('mesure une distance plausible Paris → Lyon', () => {
    const straight = haversine(paris, lyon) / 1000
    expect(straight).toBeGreaterThan(370)
    expect(straight).toBeLessThan(410)
  })

  it('produit un tracé et une durée', () => {
    const result = estimateItinerary([paris, lyon], 100)
    expect(result.distanceKm).toBeGreaterThan(400)
    expect(result.durationSec).toBeGreaterThan(3600)
    expect(result.polyline).toHaveLength(2)
    expect(result.estimated).toBe(true)
  })

  it('gère un trajet incomplet', () => {
    expect(estimateItinerary([paris])).toMatchObject({ distanceKm: 0, durationSec: 0, polyline: [] })
  })
})

describe('itineraryState', () => {
  it('distingue les états', () => {
    expect(itineraryState({ departure: paris, destination: paris, places: [], itinerary: { distanceKm: 0 } })).toBe('none')
    expect(
      itineraryState({ departure: paris, destination: paris, places: [], itinerary: { distanceKm: 120 } }),
    ).toBe('routed')
    expect(
      itineraryState({
        departure: paris,
        destination: paris,
        places: [],
        itinerary: { distanceKm: 120, estimated: true },
      }),
    ).toBe('estimated')
    expect(itineraryState({ departure: { name: '', lat: null, lon: null }, destination: paris, places: [] })).toBe(
      'incomplete',
    )
  })
})
