// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { MAX_TRIPS, MAX_TRIP_BYTES, maskedDeparture, sanitizeForShare, trimPolylineAround, validateIncoming } from './sync.js'

const NOW = Date.UTC(2026, 9, 8, 12)

describe('validateIncoming', () => {
  it('accepte un lot vide ou absent', () => {
    expect(validateIncoming(undefined)).toEqual({ ok: true, items: [] })
    expect(validateIncoming([])).toEqual({ ok: true, items: [] })
  })

  it('normalise un voyage et force son identifiant', () => {
    const res = validateIncoming([{ id: 't_1', updatedAt: NOW, data: { id: 'autre', name: 'Lyon' } }], NOW)
    expect(res.ok).toBe(true)
    expect(res.items[0]).toMatchObject({ id: 't_1', deleted: false, data: { id: 't_1', name: 'Lyon' } })
  })

  it('accepte une suppression sans contenu', () => {
    const res = validateIncoming([{ id: 't_1', updatedAt: NOW, deleted: true }], NOW)
    expect(res.items[0]).toEqual({ id: 't_1', updatedAt: NOW, deleted: true, data: null })
  })

  it('refuse identifiants invalides, doublons, dates absurdes et contenus absents', () => {
    expect(validateIncoming([{ id: '../x', updatedAt: NOW, data: {} }], NOW).code).toBe('invalid_trip_id')
    expect(
      validateIncoming([{ id: 'a', updatedAt: NOW, data: {} }, { id: 'a', updatedAt: NOW, data: {} }], NOW).code,
    ).toBe('invalid_trip_id')
    expect(validateIncoming([{ id: 'a', updatedAt: 'x', data: {} }], NOW).code).toBe('invalid_date')
    expect(validateIncoming([{ id: 'a', updatedAt: NOW + 3 * 86_400_000, data: {} }], NOW).code).toBe('invalid_date')
    expect(validateIncoming([{ id: 'a', updatedAt: NOW }], NOW).code).toBe('invalid_trips')
    expect(validateIncoming('x').code).toBe('invalid_trips')
    expect(validateIncoming([null]).code).toBe('invalid_trips')
  })

  it('refuse un voyage trop gros et un lot trop long', () => {
    const big = { id: 'a', updatedAt: NOW, data: { notes: 'x'.repeat(MAX_TRIP_BYTES) } }
    expect(validateIncoming([big], NOW).code).toBe('trip_too_large')
    const many = Array.from({ length: MAX_TRIPS + 1 }, (_, i) => ({ id: `t${i}`, updatedAt: NOW, data: {} }))
    expect(validateIncoming(many, NOW).code).toBe('too_many_trips')
  })
})

const trip = {
  id: 't_1',
  name: 'Paris → Lyon',
  departure: { name: '12 rue des Lilas, Paris, Île-de-France', lat: 48.85661, lon: 2.35222, country: 'France', context: 'Paris, France' },
  destination: { name: 'Lyon', lat: 45.764, lon: 4.8357, country: 'France', context: 'Lyon, France' },
  returnTrip: true,
  dates: { start: '2026-11-01', end: '2026-11-03', days: 3, nights: 2 },
  travelers: 2,
  vehicle: { slug: 'camping-car', model: 'Fiat', heightM: 3, weightT: 3.5, customConsumption: 11 },
  preferences: { avoidTolls: true, avoidHighways: false, driveTime: 'balanced' },
  budget: { max: 900, entries: [{ label: 'Péage', amount: 20 }] },
  itinerary: {
    distanceKm: 465,
    durationSec: 17000,
    polyline: [
      [2.3522, 48.8566],
      [2.36, 48.86],
      [2.9, 48.0],
      [4.8357, 45.764],
      [2.9, 48.0],
      [2.36, 48.86],
      [2.3522, 48.8566],
    ],
  },
  places: [
    { name: 'Dijon', kind: 'stop', lat: 47.32, lon: 5.04, order: 1, notes: 'secret' },
    { name: 'Chez moi', kind: 'address', lat: 48.8566, lon: 2.3522 },
  ],
  notes: 'code de la maison 1234',
  documents: [{ name: 'passeport.pdf' }],
  checklist: [{ label: 'x' }],
}

describe('sanitizeForShare', () => {
  it('masque le départ par défaut : commune, coordonnées arrondies, tracé tronqué', () => {
    const pub = sanitizeForShare(trip)
    expect(pub.departureHidden).toBe(true)
    expect(pub.departure).toEqual({ name: 'Paris, France', lat: 48.9, lon: 2.4, country: 'France', context: '' })
    // Les points proches du départ (début et fin) disparaissent, le reste demeure.
    expect(pub.itinerary.polyline).toEqual([
      [2.9, 48],
      [4.8357, 45.764],
      [2.9, 48],
    ])
    expect(JSON.stringify(pub)).not.toContain('12 rue des Lilas')
    expect(JSON.stringify(pub)).not.toContain('48.85661')
  })

  it('montre le départ exact sur demande', () => {
    const pub = sanitizeForShare(trip, { showDeparture: true })
    expect(pub.departureHidden).toBe(false)
    expect(pub.departure.name).toContain('12 rue des Lilas')
    expect(pub.itinerary.polyline).toHaveLength(7)
  })

  it('ne diffuse jamais notes, documents, liste de contrôle, dépenses ni adresse personnelle', () => {
    const text = JSON.stringify(sanitizeForShare(trip, { showDeparture: true }))
    for (const secret of ['secret', 'code de la maison', 'passeport', 'Péage', 'Chez moi', 'customConsumption', 'checklist']) {
      expect(text).not.toContain(secret)
    }
    expect(sanitizeForShare(trip).places).toEqual([
      { name: 'Dijon', kind: 'stop', lat: 47.32, lon: 5.04, day: null, order: 1, context: '' },
    ])
  })

  it('conserve les informations utiles du voyage', () => {
    const pub = sanitizeForShare(trip)
    expect(pub).toMatchObject({
      name: 'Paris → Lyon',
      returnTrip: true,
      travelers: 2,
      budgetMax: 900,
      vehicle: { slug: 'camping-car', heightM: 3, weightT: 3.5 },
      dates: { start: '2026-11-01', end: '2026-11-03', days: 3, nights: 2 },
    })
  })

  it('supporte un voyage vide ou invalide', () => {
    expect(sanitizeForShare(null).name).toBe('Voyage')
    expect(sanitizeForShare({}).itinerary.polyline).toEqual([])
  })
})

describe('maskedDeparture / trimPolylineAround', () => {
  it('sans contexte, garde les segments du nom sans chiffre', () => {
    expect(maskedDeparture({ name: '5 avenue Foch, Nantes, Pays de la Loire', lat: 47.2, lon: -1.55 }).name).toBe(
      'Nantes, Pays de la Loire',
    )
    expect(maskedDeparture({ name: '12', lat: 1, lon: 1 }).name).toBe('Point de départ masqué')
    expect(maskedDeparture({ name: 'Paris, Île-de-France', country: 'France', context: 'France', lat: 48.85, lon: 2.35 }).name).toBe('Paris, Île-de-France')
  })

  it('ne renvoie aucun tracé sans centre valide', () => {
    expect(trimPolylineAround([[1, 1]], null)).toEqual([])
  })
})
