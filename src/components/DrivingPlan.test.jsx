import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import DrivingPlan from './DrivingPlan.jsx'
import { lodgingNear, planDriving } from '../domain/driving.js'
import { resetLodgingPriceCache } from '../services/lodgingPrices.js'

const H = 3600
const line = [
  [2.35, 48.85],
  [-3.7, 40.4],
]

beforeEach(() => {
  resetLodgingPriceCache()
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('lodgingNear', () => {
  const stop = { lat: 45, lon: 3 }
  const items = [
    { id: 'far', name: 'Loin', type: 'hotel', lat: 46, lon: 3 },
    { id: 'near', name: 'Près', type: 'hotel', lat: 45.05, lon: 3 },
    { id: 'mid', name: 'Moyen', type: 'camping', lat: 45.15, lon: 3 },
  ]
  it('garde les hébergements à moins de 25 km, du plus proche au plus loin', () => {
    expect(lodgingNear(stop, items).map((a) => a.id)).toEqual(['near', 'mid'])
  })
  it('ne plante pas sans position', () => {
    expect(lodgingNear({}, items)).toEqual([])
  })
})

describe('DrivingPlan', () => {
  it('affiche les étapes et les hébergements proches', () => {
    const plan = planDriving({ durationSec: 13.5 * H, nights: 5, coordinates: line })
    const mid = plan.stops[0]
    render(
      <DrivingPlan
        plan={plan}
        roundTrip={false}
        nights={5}
        accommodations={[{ id: 'h1', name: 'Hôtel du Centre', type: 'hotel', lat: mid.lat + 0.05, lon: mid.lon }]}
        accomLoading={false}
        vehicleSlug="voiture"
      />,
    )
    expect(screen.getAllByTestId('driving-stop')).toHaveLength(2)
    expect(screen.getByText('Hôtel du Centre')).toBeTruthy()
    expect(screen.getByText(/Aucun hébergement référencé/)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('indique la conduite de chaque journée, pas le cumul', () => {
    // 13 h 30, équilibré : 3 journées de 4 h 30
    const plan = planDriving({ durationSec: 13.5 * H, nights: 5, coordinates: line })
    render(<DrivingPlan plan={plan} roundTrip={false} nights={5} accommodations={[]} accomLoading={false} vehicleSlug="voiture" />)
    const days = screen.getAllByTestId('driving-day').map((el) => el.textContent)
    expect(days[0]).toContain('Jour 1')
    expect(days[0]).toContain('4 h 30')
    expect(days[1]).toContain('Jour 2')
    expect(days[1]).toContain('4 h 30')
    expect(days[1]).not.toContain('9 h')
    expect(screen.getByTestId('driving-last-day').textContent).toMatch(/Jour 3.*4 h 30/s)
  })

  it('alerte quand les dates sont trop courtes', () => {
    const plan = planDriving({ durationSec: 13.5 * H, nights: 1, coordinates: line })
    render(<DrivingPlan plan={plan} roundTrip={false} nights={1} accommodations={[]} accomLoading={false} vehicleSlug="voiture" />)
    expect(screen.getByRole('alert').textContent).toContain('trop courtes')
  })

  it('ne rend rien sans plan', () => {
    const { container } = render(<DrivingPlan plan={null} accommodations={[]} />)
    expect(container.textContent).toBe('')
  })
})

describe('DrivingPlan — tarifs relevés', () => {
  it('affiche les tarifs relevés autour de chaque étape, selon le véhicule', async () => {
    const data = { available: true, n: 7, low: 55, median: 70, high: 90, radiusKm: 30, updatedAt: null, source: 'DATAtourisme' }
    const fetchMock = vi.fn((url) =>
      String(url).includes('/api/lodging-prices') ? Promise.resolve(new Response(JSON.stringify(data), { status: 200 })) : Promise.reject(new Error('offline')),
    )
    vi.stubGlobal('fetch', fetchMock)
    const plan = planDriving({ durationSec: 13.5 * H, nights: 5, coordinates: line })
    render(<DrivingPlan plan={plan} roundTrip={false} nights={5} accommodations={[]} accomLoading={false} vehicleSlug="voiture" />)
    await waitFor(() => expect(screen.getAllByTestId('stop-prices').length).toBe(2))
    expect(screen.getAllByTestId('stop-prices')[0].textContent).toContain('Hôtel 55–90 €')
    expect(screen.getAllByTestId('stop-prices')[0].textContent).toContain('Camping 55–90 €')
    const types = fetchMock.mock.calls.map((c) => new URL(String(c[0]), 'http://x').searchParams.get('type'))
    expect(types).not.toContain('aire')
  })
})
