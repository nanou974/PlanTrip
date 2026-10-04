import { beforeEach, describe, expect, it } from 'vitest'
import { clearTrips, draftToTrip, getTrip, upsertTrip } from './store.js'
import { createPlace } from '../domain/itinerary.js'
import { createDocument } from '../domain/documents.js'
import { createTask } from '../domain/checklist.js'
import { createEntry } from '../domain/budget.js'

const draft = () => ({
  name: '',
  departure: { name: 'Paris, Île-de-France', lat: 48.8566, lon: 2.3522 },
  destination: { name: 'Lyon, Auvergne-Rhône-Alpes', lat: 45.764, lon: 4.8357 },
  dates: { start: '2026-06-01', end: '2026-06-05' },
  departureTime: '08:00',
  arrivalTime: '18:00',
  travelers: 2,
  vehicle: { slug: 'voiture' },
  profile: { economies: 0.8, paysages: 0.3, confort: 0.7 },
  motivations: ['Nature'],
  preferences: { driveTime: 'balanced', returnTrip: false },
  budget: 800,
})

beforeEach(() => {
  clearTrips()
})

describe('draftToTrip', () => {
  it('crée un voyage neuf', () => {
    const trip = draftToTrip(draft(), null)
    expect(trip.id).toMatch(/^t_/)
    expect(trip.name).toBe('Paris → Lyon')
    expect(trip.budget.max).toBe(800)
    expect(trip.status).toBe('ready')
    expect(trip.profile.transport).toBe(0.8)
  })

  it('conserve les sections lors d’une édition', () => {
    const created = draftToTrip(draft(), null)
    const enriched = {
      ...created,
      places: [createPlace({ name: 'Dijon', lat: 47.3, lon: 5, order: 1 })],
      documents: [createDocument({ title: 'Passeport' })],
      checklist: [createTask({ title: 'Réserver' })],
      notes: 'Prendre la péciote',
      itinerary: { distanceKm: 465, durationSec: 16200, polyline: [[2.3, 48.8], [4.8, 45.7]] },
      budget: { ...created.budget, entries: [createEntry({ label: 'Péage', amount: 12 })] },
    }
    upsertTrip(enriched)

    const edited = draftToTrip({ ...draft(), tripId: enriched.id, budget: 1200 }, enriched.id)
    expect(edited.id).toBe(enriched.id)
    expect(edited.createdAt).toBe(enriched.createdAt)
    expect(edited.places).toHaveLength(1)
    expect(edited.documents).toHaveLength(1)
    expect(edited.checklist).toHaveLength(1)
    expect(edited.notes).toBe('Prendre la péciote')
    expect(edited.itinerary.distanceKm).toBe(465)
    expect(edited.budget.entries).toHaveLength(1)
    expect(edited.budget.max).toBe(1200)
  })

  it('remet l’itinéraire à zéro quand la route change', () => {
    const created = draftToTrip(draft(), null)
    upsertTrip({
      ...created,
      itinerary: { distanceKm: 465, durationSec: 16200, polyline: [[2.3, 48.8]] },
    })

    const moved = draftToTrip(
      { ...draft(), destination: { name: 'Nice, Provence', lat: 43.7, lon: 7.26 }, tripId: created.id },
      created.id,
    )
    expect(moved.itinerary.distanceKm).toBe(0)
    expect(moved.itinerary.polyline).toEqual([])
  })

  it('conserve le statut hors brouillon', () => {
    const created = draftToTrip(draft(), null)
    upsertTrip({ ...created, status: 'done' })
    const edited = draftToTrip({ ...draft(), tripId: created.id }, created.id)
    expect(edited.status).toBe('done')
    expect(getTrip(created.id).status).toBe('done')
  })

  it('garde un brouillon initial en brouillon prêt', () => {
    const trip = draftToTrip(draft(), null)
    expect(trip.status).toBe('ready')
  })
})
