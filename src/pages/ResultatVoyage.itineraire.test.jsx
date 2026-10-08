import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import App from '../App.jsx'
import { clearCurrentTrip, clearTrips, getTrips, saveTrip } from '../state/store.js'
import { resetLodgingPriceCache } from '../services/lodgingPrices.js'

vi.mock('../services/routing.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    fetchRoute: vi.fn(async () => ({
      distance: 465_000,
      duration: 16_800,
      coordinates: [
        [2.3522, 48.8566],
        [3.5, 47.2],
        [4.8357, 45.764],
      ],
      steps: [],
    })),
  }
})

beforeEach(() => {
  resetLodgingPriceCache()
  cleanup()
  clearTrips()
  clearCurrentTrip()
  sessionStorage.clear()
  window.localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('résultat du voyage - enregistrement de l’itinéraire', () => {
  it('enregistre la distance et le tracé calculés dans le voyage (synchronisation et partage)', async () => {
    saveTrip({
      departure: { name: 'Paris, Île-de-France', lat: 48.8566, lon: 2.3522 },
      destination: { name: 'Lyon, Auvergne-Rhône-Alpes', lat: 45.764, lon: 4.8357 },
      dates: { start: '2026-11-14', end: '2026-11-16' },
      travelers: 2,
      vehicle: { slug: 'voiture' },
      preferences: { driveTime: 'balanced' },
      budget: 800,
    })
    window.history.pushState({}, '', '/resultat-voyage')
    render(<App />)
    await screen.findByRole('heading', { name: /Conduite, pauses et étapes de nuit/ }, { timeout: 5000 })
    await vi.waitFor(() => {
      const it = getTrips()[0].itinerary
      expect(it.distanceKm).toBeGreaterThan(400)
      expect(it.polyline.length).toBe(3)
    })
  })
})