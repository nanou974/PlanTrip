import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/api.js', () => {
  class ApiError extends Error {
    constructor(message, { code = 'error', status = 0 } = {}) {
      super(message)
      this.name = 'ApiError'
      this.code = code
      this.status = status
    }
  }
  return {
    api: vi.fn(),
    apiEnabled: () => true,
    isApiError: (e) => e?.name === 'ApiError',
    isUnreachable: (e) => Boolean(e?.unreachable),
    ApiError,
  }
})

import { api, ApiError } from '../lib/api.js'
import { clearTrips, forgetTombstones, getStoredTrips, getTombstones, deleteTrip, upsertTrip } from '../state/store.js'
import { createTrip } from '../domain/trip.js'
import {
  __resetSyncForTests,
  adoptSpaceIfNeeded,
  createShare,
  disableSync,
  enableSync,
  parseResumeHash,
  resumeFromLink,
  resumeUrl,
  runSync,
  syncModeOf,
} from './syncService.js'

const SPACE = { id: 'a'.repeat(32), key: 'b'.repeat(64) }
const make = (name, id) =>
  createTrip({
    id,
    name,
    departure: { name: 'Paris', lat: 48.85, lon: 2.35 },
    destination: { name: 'Lyon', lat: 45.76, lon: 4.83 },
    dates: { start: '2026-11-01', end: '2026-11-03' },
  })
const unreachable = () => Object.assign(new Error('hors ligne'), { unreachable: true })

beforeEach(() => {
  api.mockReset()
  __resetSyncForTests()
  clearTrips()
  forgetTombstones(Object.keys(getTombstones()))
})

async function activateSpace() {
  api.mockResolvedValueOnce({ space: SPACE }) // POST /space
  api.mockResolvedValueOnce({ trips: [] }) // POST /sync
  return enableSync(null)
}

describe('modes de synchronisation', () => {
  it('sans espace ni session : désactivée, rien n’est envoyé', async () => {
    expect(syncModeOf(null)).toBe('off')
    expect(await runSync({ user: null })).toEqual({ ok: false, reason: 'off' })
    expect(api).not.toHaveBeenCalled()
  })

  it('compte avec session serveur : mode compte, sauf désactivation volontaire', () => {
    expect(syncModeOf({ serverSession: true })).toBe('account')
    expect(syncModeOf({ serverSession: true }, { optOut: true, hasSpace: false })).toBe('off')
    expect(syncModeOf({ id: 'local' })).toBe('off')
  })
})

describe('espace anonyme', () => {
  it('l’activation crée l’espace puis envoie tous les voyages avec la clé en en-tête', async () => {
    upsertTrip(make('Lyon', 't_1'))
    const res = await activateSpace()
    expect(res.ok).toBe(true)
    expect(api.mock.calls[0][0]).toBe('/space')
    const [path, opts] = api.mock.calls[1]
    expect(path).toBe('/sync')
    expect(opts.headers).toEqual({ 'X-PlanTrip-Space': `${SPACE.id}.${SPACE.key}` })
    expect(opts.body.trips.map((t) => t.id)).toEqual(['t_1'])
    expect(syncModeOf(null)).toBe('space')
    expect(resumeUrl()).toBe(`${window.location.origin}/reprendre#${SPACE.id}.${SPACE.key}`)
  })

  it('reçoit les voyages des autres appareils', async () => {
    await activateSpace()
    api.mockResolvedValueOnce({ trips: [{ id: 't_9', updatedAt: Date.now(), deleted: false, data: make('Venu d’ailleurs', 't_9') }] })
    expect((await runSync({ user: null })).ok).toBe(true)
    expect(getStoredTrips().map((t) => t.name)).toEqual(['Venu d’ailleurs'])
  })

  it('n’envoie ensuite que ce qui a changé, et les suppressions une seule fois', async () => {
    upsertTrip(make('A', 't_a'))
    upsertTrip(make('B', 't_b'))
    await activateSpace()
    deleteTrip('t_a')
    api.mockResolvedValueOnce({ trips: [] })
    await runSync({ user: null })
    const body = api.mock.calls.at(-1)[1].body
    expect(body.trips).toEqual([expect.objectContaining({ id: 't_a', deleted: true })])
    expect(getTombstones()).toEqual({})
    api.mockResolvedValueOnce({ trips: [] })
    await runSync({ user: null })
    expect(api.mock.calls.at(-1)[1].body.trips).toEqual([])
  })

  it('hors connexion : rien n’est perdu, les suppressions restent à envoyer', async () => {
    upsertTrip(make('A', 't_a'))
    await activateSpace()
    deleteTrip('t_a')
    api.mockRejectedValueOnce(unreachable())
    expect(await runSync({ user: null })).toEqual({ ok: false, reason: 'offline' })
    expect(Object.keys(getTombstones())).toEqual(['t_a'])
  })

  it('un espace disparu côté serveur désactive la synchronisation sans toucher aux voyages locaux', async () => {
    upsertTrip(make('A', 't_a'))
    await activateSpace()
    api.mockRejectedValueOnce(new ApiError('non', { code: 'no_sync_identity', status: 401 }))
    expect(await runSync({ user: null })).toEqual({ ok: false, reason: 'invalid' })
    expect(syncModeOf(null)).toBe('off')
    expect(getStoredTrips()).toHaveLength(1)
  })

  it('désactiver efface côté serveur puis oublie l’espace ; un échec réseau ne change rien', async () => {
    await activateSpace()
    api.mockRejectedValueOnce(unreachable())
    await expect(disableSync(null)).rejects.toThrow()
    expect(syncModeOf(null)).toBe('space')
    api.mockResolvedValueOnce(null)
    await disableSync(null)
    expect(api.mock.calls.at(-1)[0]).toBe('/sync')
    expect(api.mock.calls.at(-1)[1].method).toBe('DELETE')
    expect(syncModeOf(null)).toBe('off')
  })
})

describe('reprise sur un autre appareil', () => {
  it('lit un fragment valide et refuse les autres', () => {
    expect(parseResumeHash(`#${SPACE.id}.${SPACE.key}`)).toEqual(SPACE)
    expect(parseResumeHash(`${SPACE.id}.${SPACE.key}`)).toEqual(SPACE)
    expect(parseResumeHash('#abc.def')).toBeNull()
    expect(parseResumeHash('')).toBeNull()
  })

  it('rattache l’appareil à l’espace et fusionne dans les deux sens', async () => {
    upsertTrip(make('Local', 't_local'))
    api.mockResolvedValueOnce({ trips: [{ id: 't_remote', updatedAt: Date.now(), deleted: false, data: make('Distant', 't_remote') }] })
    const res = await resumeFromLink(SPACE)
    expect(res.ok).toBe(true)
    expect(api.mock.calls[0][1].body.trips.map((t) => t.id)).toEqual(['t_local'])
    expect(getStoredTrips().map((t) => t.id).sort()).toEqual(['t_local', 't_remote'])
    expect(syncModeOf(null)).toBe('space')
  })

  it('un lien faux ne laisse aucun espace en place', async () => {
    api.mockRejectedValueOnce(new ApiError('non', { code: 'no_sync_identity', status: 401 }))
    expect((await resumeFromLink(SPACE)).ok).toBe(false)
    expect(syncModeOf(null)).toBe('off')
    expect((await resumeFromLink({ id: 'x', key: 'y' })).reason).toBe('invalid')
  })
})

describe('compte et partage', () => {
  const user = { id: 'u1', serverSession: true }

  it('à la connexion, l’espace anonyme est repris dans le compte puis oublié', async () => {
    await activateSpace()
    api.mockResolvedValueOnce({ trips: [{ id: 't_1', updatedAt: Date.now(), deleted: false, data: make('Repris', 't_1') }] }) // adopt
    api.mockResolvedValueOnce({ trips: [] }) // sync
    await adoptSpaceIfNeeded(user)
    expect(api.mock.calls[2][0]).toBe('/sync/adopt')
    expect(api.mock.calls[2][1].headers['X-PlanTrip-Space']).toContain(SPACE.id)
    expect(getStoredTrips().map((t) => t.name)).toEqual(['Repris'])
    expect(syncModeOf(user)).toBe('account')
    // Mode compte : plus d'en-tête d'espace.
    expect(api.mock.calls[3][1].headers).toBeUndefined()
  })

  it('crée un lien de partage après synchronisation du voyage', async () => {
    upsertTrip(make('A', 't_a'))
    await activateSpace()
    api.mockResolvedValueOnce({ trips: [] }) // sync
    api.mockResolvedValueOnce({ share: { token: 'c'.repeat(32), tripId: 't_a', showDeparture: false } })
    const share = await createShare(null, 't_a', { showDeparture: false })
    expect(share.token).toBe('c'.repeat(32))
    const last = api.mock.calls.at(-1)
    expect(last[0]).toBe('/shares')
    expect(last[1].body).toEqual({ tripId: 't_a', showDeparture: false })
  })
})
