import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchLodgingPrices, formatObservedRange, priceFromObserved, resetLodgingPriceCache } from './lodgingPrices.js'

const good = { available: true, n: 8, low: 60, median: 80, high: 100, radiusKm: 30, updatedAt: '2026-09-01', source: 'DATAtourisme' }

beforeEach(() => resetLodgingPriceCache())
afterEach(() => vi.unstubAllGlobals())

describe('fetchLodgingPrices', () => {
  it('interroge le serveur une seule fois pour une même maille', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(good), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const a = await fetchLodgingPrices({ lat: 45.76, lon: 4.84, type: 'hotel' })
    const b = await fetchLodgingPrices({ lat: 45.78, lon: 4.83, type: 'hotel' })
    expect(a.median).toBe(80)
    expect(b).toBe(a)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/lodging-prices?')
  })

  it('renvoie null si indisponible, trop peu de données ou type sans tarif', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ available: false }), { status: 200 })))
    expect(await fetchLodgingPrices({ lat: 1, lon: 1, type: 'hotel' })).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })))
    expect(await fetchLodgingPrices({ lat: 2, lon: 2, type: 'hotel' })).toBeNull()
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
    expect(await fetchLodgingPrices({ lat: 3, lon: 3, type: 'hotel' })).toBeNull()
    expect(await fetchLodgingPrices({ lat: 3, lon: 3, type: 'aire' })).toBeNull()
  })
})

describe('priceFromObserved / formatObservedRange', () => {
  it('interpole selon le confort', () => {
    expect(priceFromObserved(good, 0)).toBe(60)
    expect(priceFromObserved(good, 1)).toBe(100)
    expect(priceFromObserved(good, 0.5)).toBe(80)
    expect(priceFromObserved(good, NaN)).toBe(80)
    expect(priceFromObserved(null)).toBeNull()
  })
  it('formate la fourchette', () => {
    expect(formatObservedRange(good)).toBe('60–100 €')
    expect(formatObservedRange({ low: 40, high: 40 })).toBe('40 €')
  })
})
