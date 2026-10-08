import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { AuthCtx } from '../lib/authContext.js'

vi.mock('../services/syncService.js', () => ({
  runSync: vi.fn(() => Promise.resolve({ ok: true })),
  adoptSpaceIfNeeded: vi.fn(() => Promise.resolve({ ok: false })),
  syncModeOf: vi.fn(),
  useSyncStatus: vi.fn(),
}))

import { adoptSpaceIfNeeded, runSync, syncModeOf, useSyncStatus } from '../services/syncService.js'
import { clearTrips, forgetTombstones, getTombstones, upsertTrip } from '../state/store.js'
import { createTrip } from '../domain/trip.js'
import SyncManager from './SyncManager.jsx'

const renderWith = (user) =>
  render(
    <AuthCtx.Provider value={{ user }}>
      <SyncManager />
    </AuthCtx.Provider>,
  )

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  clearTrips()
  forgetTombstones(Object.keys(getTombstones()))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('SyncManager', () => {
  it('ne fait rien tant que la synchronisation est désactivée', () => {
    syncModeOf.mockReturnValue('off')
    useSyncStatus.mockReturnValue({ mode: 'off' })
    renderWith(null)
    window.dispatchEvent(new Event('online'))
    expect(runSync).not.toHaveBeenCalled()
  })

  it('synchronise au démarrage, au retour du réseau et après une modification (temporisée)', () => {
    syncModeOf.mockReturnValue('space')
    useSyncStatus.mockReturnValue({ mode: 'space' })
    renderWith(null)
    expect(runSync).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new Event('online'))
    expect(runSync).toHaveBeenCalledTimes(2)
    act(() => {
      upsertTrip(createTrip({ id: 't_1', name: 'A', departure: { name: 'P', lat: 1, lon: 1 }, destination: { name: 'L', lat: 2, lon: 2 }, dates: { start: '2026-11-01', end: '2026-11-02' } }))
      upsertTrip(createTrip({ id: 't_2', name: 'B', departure: { name: 'P', lat: 1, lon: 1 }, destination: { name: 'L', lat: 2, lon: 2 }, dates: { start: '2026-11-01', end: '2026-11-02' } }))
    })
    expect(runSync).toHaveBeenCalledTimes(2)
    act(() => vi.advanceTimersByTime(2600))
    // Une seule requête pour la série de modifications.
    expect(runSync).toHaveBeenCalledTimes(3)
  })

  it('à la connexion, reprend l’espace anonyme dans le compte', () => {
    syncModeOf.mockReturnValue('account')
    useSyncStatus.mockReturnValue({ mode: 'account' })
    const user = { id: 'u1', serverSession: true }
    renderWith(user)
    expect(adoptSpaceIfNeeded).toHaveBeenCalledWith(user)
  })

  it('un compte purement local ne tente aucune reprise', () => {
    syncModeOf.mockReturnValue('off')
    useSyncStatus.mockReturnValue({ mode: 'off' })
    renderWith({ id: 'local' })
    expect(adoptSpaceIfNeeded).not.toHaveBeenCalled()
  })
})
