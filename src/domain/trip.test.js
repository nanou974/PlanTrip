import { describe, it, expect } from 'vitest'
import {
  createTrip,
  validateTrip,
  deriveStatus,
  deriveTrip,
  sortTrips,
  newTripId,
  TRIP_STATUSES,
} from './trip.js'

const base = () => ({
  departure: { name: 'Paris, France', lat: 48.85, lon: 2.35 },
  destination: { name: 'Lyon, France', lat: 45.75, lon: 4.85 },
  dates: { start: '2026-06-01', end: '2026-06-05' },
  travelers: 2,
  vehicleSlug: 'voiture',
  budgetMax: 800,
  profile: { transport: 0.8, sejour: 0.3, confort: 0.7 },
})

describe('createTrip', () => {
  it('normalise les champs obligatoires', () => {
    const trip = createTrip(base())
    expect(trip.id).toMatch(/^t_/)
    expect(trip.version).toBe(1)
    expect(trip.name).toBe('Paris → Lyon')
    expect(trip.dates).toMatchObject({ start: '2026-06-01', end: '2026-06-05', days: 5, nights: 4 })
    expect(trip.travelers).toBe(2)
    expect(trip.vehicle.slug).toBe('voiture')
    expect(trip.budget.max).toBe(800)
    expect(trip.status).toBe('draft')
  })

  it('propage le profil et calcule une allocation', () => {
    const trip = createTrip(base())
    expect(trip.profile.transport).toBe(0.8)
    expect(trip.profile.sejour).toBe(0.3)
    expect(trip.profile.confort).toBe(0.7)
    const sum = Object.values(trip.budget.plan).reduce((a, b) => a + b, 0)
    expect(sum).toBe(800)
  })

  it('garde le budget fourni plutôt que de le recalculer', () => {
    const trip = createTrip({ ...base(), budget: { max: 1200, entries: [] } })
    expect(trip.budget.max).toBe(1200)
    expect(trip.budget.plan).toBeTruthy()
  })

  it('tolère les champs manquants', () => {
    const trip = createTrip({})
    expect(trip.departure).toEqual({ name: '', lat: null, lon: null, country: '', context: '' })
    expect(trip.dates.days).toBe(1)
    expect(trip.budget.max).toBe(0)
    expect(trip.budget.plan).toBeNull()
  })

  it('des identifiants uniques', () => {
    expect(newTripId()).not.toBe(newTripId())
  })
})

describe('validateTrip', () => {
  it('accepte un voyage complet', () => {
    expect(validateTrip(base())).toEqual({ ok: true, errors: {} })
  })

  it('signale les champs manquants', () => {
    const { ok, errors } = validateTrip({ dates: {}, travelers: 0 })
    expect(ok).toBe(false)
    expect(errors.departure).toBeTruthy()
    expect(errors.destination).toBeTruthy()
    expect(errors.start).toBeTruthy()
    expect(errors.end).toBeTruthy()
    expect(errors.travelers).toBeTruthy()
    expect(errors.budgetMax).toBeTruthy()
    expect(errors.vehicleSlug).toBeTruthy()
  })

  it('refuse un retour avant le départ', () => {
    const { errors } = validateTrip({ ...base(), dates: { start: '2026-06-10', end: '2026-06-01' } })
    expect(errors.end).toMatch(/précède/)
  })

  it('refuse départ identique à la destination', () => {
    const input = base()
    input.destination = { ...input.departure }
    expect(validateTrip(input).errors.destination).toMatch(/différer/)
  })
})

describe('deriveStatus', () => {
  const trip = createTrip(base())

  it('avant le départ → prêt si budget défini', () => {
    expect(deriveStatus(trip, new Date('2026-05-01T12:00:00'))).toBe('ready')
  })

  it('pendant le voyage → en cours', () => {
    expect(deriveStatus(trip, new Date('2026-06-03T12:00:00'))).toBe('ongoing')
  })

  it('après le retour → terminé', () => {
    expect(deriveStatus(trip, new Date('2026-07-01T12:00:00'))).toBe('done')
  })

  it('statut terminé explicite conservé', () => {
    expect(deriveStatus({ ...trip, status: 'done' }, new Date('2026-01-01T12:00:00'))).toBe('done')
  })

  it('sans date → brouillon', () => {
    expect(deriveStatus({ dates: {} }, new Date())).toBe('draft')
  })

  it('deriveTrip recalcule dates et statut', () => {
    const d = deriveTrip(trip, new Date('2026-06-03T12:00:00'))
    expect(d.dates.days).toBe(5)
    expect(d.status).toBe('ongoing')
  })
})

describe('sortTrips', () => {
  const a = { name: 'A', status: 'ready', dates: { start: '2026-07-01' }, updatedAt: '2026-01-01' }
  const b = { name: 'B', status: 'draft', dates: { start: '2026-06-01' }, updatedAt: '2026-03-01' }
  const c = { name: 'C', status: 'done', dates: { start: '2026-05-01' }, updatedAt: '2026-02-01' }

  it('par défaut : en cours, puis prêts, puis brouillons, puis terminés', () => {
    expect(sortTrips([c, a, b]).map((t) => t.name)).toEqual(['A', 'B', 'C'])
  })

  it('par date de départ', () => {
    const list = sortTrips([a, b, c], 'start')
    expect(list[list.length - 1].name).toBe('A')
  })

  it('par dernière modification', () => {
    expect(sortTrips([a, b, c], 'updated').map((t) => t.name)).toEqual(['B', 'C', 'A'])
  })

  it('par nom', () => {
    expect(sortTrips([c, a, b], 'name').map((t) => t.name)).toEqual(['A', 'B', 'C'])
  })
})

describe('statuts', () => {
  it('liste cohérente', () => {
    expect(TRIP_STATUSES.map((s) => s.id)).toEqual(['draft', 'ready', 'ongoing', 'done'])
  })
})
