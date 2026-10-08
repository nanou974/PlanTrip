import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import App from '../../../App.jsx'
import { clearCurrentTrip, clearTrips, getTrip, saveTrip } from '../../../state/store.js'

function plannerDraft(patch = {}) {
  return {
    departure: { name: 'Toulouse, Occitanie', lat: 43.6047, lon: 1.4442 },
    destination: { name: 'Briançon, PACA', lat: 44.8941, lon: 6.6308 },
    dates: { start: '2026-10-10', end: '2026-10-12' },
    travelers: 1,
    vehicle: { slug: 'camping-car' },
    profile: { economies: 0.6, paysages: 0.6, confort: 0.6 },
    preferences: { driveTime: 'balanced' },
    budget: 100,
    ...patch,
  }
}

const serverRoute = {
  distance: 611500,
  duration: 48420,
  coordinates: [[1.44, 43.6], [6.63, 44.89]],
  steps: [],
}

beforeEach(() => {
  cleanup()
  clearTrips()
  clearCurrentTrip()
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('vue d’ensemble du voyage', () => {
  it('calcule et enregistre l’itinéraire quand il n’y en a pas, au lieu de rester sur la droite estimée', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url) === '/api/route') return { ok: true, status: 200, json: async () => serverRoute }
      throw new Error('offline')
    })
    vi.stubGlobal('fetch', fetchMock)
    const saved = saveTrip(plannerDraft({ preferences: { driveTime: 'balanced', avoidTolls: true, avoidHighways: true } }))
    expect(getTrip(saved.id).itinerary.distanceKm).toBe(0)

    window.history.pushState({}, '', `/voyages/${saved.id}`)
    render(<App />)

    await waitFor(() => expect(getTrip(saved.id).itinerary.distanceKm).toBe(611.5))
    const sent = JSON.parse(fetchMock.mock.calls.find((c) => String(c[0]) === '/api/route')[1].body)
    expect(sent).toMatchObject({ vehicle: 'camping-car', avoidTolls: true, avoidHighways: true })
  })

  it('ne recalcule pas quand un itinéraire est déjà enregistré', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => serverRoute }))
    vi.stubGlobal('fetch', fetchMock)
    const saved = saveTrip(plannerDraft())
    const stored = { distanceKm: 500, durationSec: 20000, polyline: [[1.44, 43.6], [6.63, 44.89]], estimated: false }
    const { upsertTrip } = await import('../../../state/store.js')
    upsertTrip({ ...getTrip(saved.id), itinerary: stored })

    window.history.pushState({}, '', `/voyages/${saved.id}`)
    render(<App />)
    await screen.findAllByText('Distance')
    expect(fetchMock.mock.calls.filter((c) => String(c[0]) === '/api/route')).toHaveLength(0)
    expect(getTrip(saved.id).itinerary.distanceKm).toBe(500)
  })

  it('garde l’estimation si le calcul échoue, sans boucle d’appels', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('offline')
    })
    vi.stubGlobal('fetch', fetchMock)
    const saved = saveTrip(plannerDraft())
    window.history.pushState({}, '', `/voyages/${saved.id}`)
    render(<App />)
    await screen.findAllByText('Distance')
    await new Promise((r) => setTimeout(r, 300))
    expect(getTrip(saved.id).itinerary.distanceKm).toBe(0)
    // 1 appel serveur + 1 repli OSRM, pas davantage.
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(2)
  })
})
