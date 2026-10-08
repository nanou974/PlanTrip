import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyRemoteTrips,
  clearTrips,
  deleteTrip,
  forgetTombstones,
  getStoredTrips,
  getTombstones,
  upsertTrip,
} from './store.js'
import { createTrip } from '../domain/trip.js'

const make = (name, id) =>
  createTrip({
    id,
    name,
    departure: { name: 'Paris', lat: 48.85, lon: 2.35 },
    destination: { name: 'Lyon', lat: 45.76, lon: 4.83 },
    dates: { start: '2026-11-01', end: '2026-11-03' },
  })

beforeEach(() => {
  clearTrips()
  forgetTombstones(Object.keys(getTombstones()))
})

describe('suppressions suivies pour la synchronisation', () => {
  it('note un voyage supprimé, pas un voyage conservé', () => {
    upsertTrip(make('A', 't_a'))
    upsertTrip(make('B', 't_b'))
    deleteTrip('t_a')
    expect(Object.keys(getTombstones())).toEqual(['t_a'])
    expect(getStoredTrips().map((t) => t.id)).toEqual(['t_b'])
  })

  it('oublie les suppressions transmises', () => {
    upsertTrip(make('A', 't_a'))
    deleteTrip('t_a')
    forgetTombstones(['t_a'])
    expect(getTombstones()).toEqual({})
  })

  it('« tout effacer » note tous les voyages', () => {
    upsertTrip(make('A', 't_a'))
    upsertTrip(make('B', 't_b'))
    clearTrips()
    expect(Object.keys(getTombstones()).sort()).toEqual(['t_a', 't_b'])
  })
})

describe('applyRemoteTrips — le plus récent gagne', () => {
  it('ajoute un voyage inconnu avec la date du serveur', () => {
    const changed = applyRemoteTrips([{ id: 't_x', updatedAt: Date.parse('2026-10-01T10:00:00Z'), deleted: false, data: make('Distant', 't_x') }])
    expect(changed).toBe(true)
    expect(getStoredTrips()[0]).toMatchObject({ id: 't_x', name: 'Distant', updatedAt: '2026-10-01T10:00:00.000Z' })
  })

  it('remplace un voyage local plus ancien, ignore un plus récent', () => {
    upsertTrip(make('Local', 't_a'))
    const localTs = Date.parse(getStoredTrips()[0].updatedAt)
    expect(applyRemoteTrips([{ id: 't_a', updatedAt: localTs - 5000, deleted: false, data: make('Vieux distant', 't_a') }])).toBe(false)
    expect(getStoredTrips()[0].name).toBe('Local')
    expect(applyRemoteTrips([{ id: 't_a', updatedAt: localTs + 5000, deleted: false, data: make('Nouveau distant', 't_a') }])).toBe(true)
    expect(getStoredTrips()[0].name).toBe('Nouveau distant')
  })

  it('applique une suppression plus récente, pas une plus ancienne', () => {
    upsertTrip(make('Local', 't_a'))
    const localTs = Date.parse(getStoredTrips()[0].updatedAt)
    expect(applyRemoteTrips([{ id: 't_a', updatedAt: localTs - 1000, deleted: true, data: null }])).toBe(false)
    expect(getStoredTrips()).toHaveLength(1)
    expect(applyRemoteTrips([{ id: 't_a', updatedAt: localTs + 1000, deleted: true, data: null }])).toBe(true)
    expect(getStoredTrips()).toHaveLength(0)
  })

  it('ne ressuscite pas un voyage supprimé ici plus récemment', () => {
    upsertTrip(make('A', 't_a'))
    deleteTrip('t_a')
    const tombTs = getTombstones().t_a
    expect(applyRemoteTrips([{ id: 't_a', updatedAt: tombTs - 10, deleted: false, data: make('A', 't_a') }])).toBe(false)
    expect(getStoredTrips()).toHaveLength(0)
    // …mais une modification encore plus récente ailleurs le restaure.
    expect(applyRemoteTrips([{ id: 't_a', updatedAt: tombTs + 10, deleted: false, data: make('A bis', 't_a') }])).toBe(true)
    expect(getStoredTrips()[0].name).toBe('A bis')
  })

  it('ignore les données qui ne ressemblent pas à un voyage', () => {
    expect(applyRemoteTrips([{ id: 't_x', updatedAt: Date.now(), deleted: false, data: { name: 'sans dates' } }])).toBe(false)
    expect(applyRemoteTrips([{ id: '', updatedAt: Date.now(), deleted: false, data: make('X', 'x') }])).toBe(false)
    expect(applyRemoteTrips(null)).toBe(false)
    expect(getStoredTrips()).toEqual([])
  })
})
