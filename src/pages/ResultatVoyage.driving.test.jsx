import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import App from '../App.jsx'
import { clearCurrentTrip, clearTrips, saveTrip } from '../state/store.js'
import { resetLodgingPriceCache } from '../services/lodgingPrices.js'

function draft(patch = {}) {
  return {
    departure: { name: 'Paris, Île-de-France', lat: 48.8566, lon: 2.3522 },
    destination: { name: 'Madrid, Espagne', lat: 40.4168, lon: -3.7038 },
    dates: { start: '2026-06-01', end: '2026-06-06' },
    travelers: 2,
    vehicle: { slug: 'voiture' },
    profile: { economies: 0.6, paysages: 0.6, confort: 0.6 },
    preferences: { driveTime: 'balanced' },
    budget: 900,
    ...patch,
  }
}

function renderResult() {
  window.history.pushState({}, '', '/resultat-voyage')
  return render(<App />)
}

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

describe('résultat du voyage — conduite et étapes de nuit', () => {
  it('découpe un long trajet en journées avec des étapes de nuit et des pauses', async () => {
    saveTrip(draft())
    renderResult()
    expect(await screen.findByRole('heading', { name: /Conduite, pauses et étapes de nuit/ }, { timeout: 5000 })).toBeTruthy()
    expect(screen.getAllByTestId('driving-stop').length).toBeGreaterThanOrEqual(1)
    const text = document.body.textContent || ''
    expect(text).toContain('15 à 20 min au moins toutes les 2 h')
    expect(text).toMatch(/nuits? en route/)
    expect(text).not.toContain('NaN')
    expect(screen.queryByText(/Vos dates sont trop courtes/)).toBeNull()
  })

  it('prévient quand les dates sont trop courtes pour le trajet', async () => {
    saveTrip(draft({ dates: { start: '2026-06-01', end: '2026-06-02' } }))
    renderResult()
    expect(await screen.findByText(/Vos dates sont trop courtes pour ce trajet/, {}, { timeout: 5000 })).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toMatch(/nuits? en\s+route/)
  })

  it('un trajet court ne demande aucune nuit en route', async () => {
    saveTrip(
      draft({
        destination: { name: 'Orléans, Centre-Val de Loire', lat: 47.9029, lon: 1.9093 },
        dates: { start: '2026-06-01', end: '2026-06-02' },
      }),
    )
    renderResult()
    expect(await screen.findByRole('heading', { name: /Conduite, pauses et étapes de nuit/ }, { timeout: 5000 })).toBeTruthy()
    expect(screen.queryAllByTestId('driving-stop')).toHaveLength(0)
    expect(screen.queryByText(/Vos dates sont trop courtes/)).toBeNull()
  })
})

describe('résultat du voyage — tarifs relevés', () => {
  const observed = { available: true, type: 'hotel', n: 9, low: 60, median: 80, high: 100, radiusKm: 30, updatedAt: '2026-09-15', source: 'DATAtourisme' }

  it('affiche les tarifs relevés et les utilise dans le budget', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url) =>
        String(url).includes('/api/lodging-prices')
          ? Promise.resolve(new Response(JSON.stringify(observed), { status: 200 }))
          : Promise.reject(new Error('offline')),
      ),
    )
    saveTrip(draft({ profile: { economies: 0.5, paysages: 0.5, confort: 0.5 }, dates: { start: '2026-06-01', end: '2026-06-06' } }))
    renderResult()
    const box = await screen.findByTestId('observed-prices', {}, { timeout: 5000 })
    expect(box.textContent).toContain('60–100 €')
    expect(box.textContent).toContain('9')
    expect(box.textContent).toContain('DATAtourisme')
    expect(box.textContent).toContain('15/09/2026')
    expect(document.body.textContent).toContain('tarifs relevés par lieu')
    // 5 nuits × 80 € (confort 0,5 → milieu de la fourchette)
    expect(document.body.textContent).toContain('400')
  })

  it('sans tarifs relevés, garde l’estimation PlanTrip', async () => {
    saveTrip(draft())
    renderResult()
    expect(await screen.findByText(/estimation PlanTrip/, {}, { timeout: 5000 })).toBeTruthy()
    expect(screen.queryByTestId('observed-prices')).toBeNull()
  })

  it('chiffre chaque nuit au tarif de son lieu : étapes en route puis destination', async () => {
    const byLat = (lat) => (lat >= 44 ? { low: 60, high: 100 } : lat >= 41 ? { low: 40, high: 60 } : { low: 100, high: 140 })
    vi.stubGlobal(
      'fetch',
      vi.fn((url) => {
        const u = String(url)
        if (u.includes('/api/lodging-prices')) {
          const lat = Number(new URL(u, 'http://x').searchParams.get('lat'))
          return Promise.resolve(new Response(JSON.stringify({ ...observed, ...byLat(lat), n: 8 }), { status: 200 }))
        }
        if (u.includes('/api/route')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                distance: 1270000,
                duration: 54720,
                coordinates: [
                  [2.3522, 48.8566],
                  [-3.7038, 40.4168],
                ],
                steps: [],
                provider: 'openrouteservice',
              }),
              { status: 200 },
            ),
          )
        }
        return Promise.reject(new Error('offline'))
      }),
    )
    saveTrip(draft({ profile: { economies: 0.5, paysages: 0.5, confort: 0.5 }, dates: { start: '2026-06-01', end: '2026-06-09' } }))
    renderResult()
    const line = await screen.findByTestId('night-breakdown', {}, { timeout: 5000 })
    await vi.waitFor(() => expect(screen.getByTestId('night-breakdown').textContent).toContain('≈ 80 €, ≈ 50 €'), { timeout: 5000 })
    expect(screen.getByTestId('night-breakdown').textContent).toContain('6 nuits sur place (≈ 120 € la nuit)')
    expect(line).toBeTruthy()
    // 80 + 50 + 6 × 120
    expect(document.body.textContent).toContain('850')
  })

  it('chiffre les alternatives d’hébergement avec les mêmes tarifs relevés que le total', async () => {
    const byType = { hotel: { low: 100, high: 140 }, apartment: { low: 60, high: 80 }, camping: { low: 20, high: 30 } }
    vi.stubGlobal(
      'fetch',
      vi.fn((url) => {
        const u = String(url)
        if (u.includes('/api/lodging-prices')) {
          const type = new URL(u, 'http://x').searchParams.get('type')
          return Promise.resolve(new Response(JSON.stringify({ ...observed, type, n: 8, ...byType[type] }), { status: 200 }))
        }
        return Promise.reject(new Error('offline'))
      }),
    )
    // Trajet court (aucune nuit en route) : 8 nuits sur place, budget volontairement trop juste.
    saveTrip(
      draft({
        destination: { name: 'Orléans, Centre-Val de Loire', lat: 47.9029, lon: 1.9093 },
        profile: { economies: 0.5, paysages: 0.5, confort: 0.5 },
        dates: { start: '2026-06-01', end: '2026-06-09' },
        budget: 300,
      }),
    )
    renderResult()
    const box = await screen.findByTestId('accom-alternatives', {}, { timeout: 5000 })
    await vi.waitFor(() => expect(screen.getByTestId('accom-alternatives').textContent).toContain('Camping'), { timeout: 5000 })
    const text = screen.getByTestId('accom-alternatives').textContent
    // camping relevé : 25 €/nuit × 8 nuits = 200 € (l'estimation seule donnerait 140 €)
    expect(text).toContain('≈ 25')
    expect(text).toMatch(/200/)
    expect(text).not.toMatch(/\b140,00/)
    expect(box).toBeTruthy()
    // la carte du type affiche le même tarif relevé (et plus l'estimation) par nuit
    const campingCard = screen.getAllByRole('button').find((b) => b.hasAttribute('aria-pressed') && /Camping/.test(b.textContent) && /\/nuit/.test(b.textContent))
    expect(campingCard.textContent).toContain('relevé')
    expect(campingCard.textContent).toMatch(/25/)
  })
})

