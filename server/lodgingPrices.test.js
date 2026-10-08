// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createLodgingPriceService, extractNightlyPrice, summarizePrices, validateQuery } from './lodgingPrices.js'

const TODAY = '2026-10-07'
const spec = (extra) => ({ priceCurrency: 'EUR', ...extra })
const offer = (...specs) => [{ priceSpecification: specs }]

describe('extractNightlyPrice', () => {
  it('prend le tarif le plus bas, en cours de validité', () => {
    const offers = offer(
      spec({ minPrice: [159], maxPrice: [240], name: { '@fr': 'Chambre de 1 à 4 personnes' }, appliesOnPeriod: [{ startDate: '2026-01-01', endDate: '2026-12-31' }] }),
      spec({ minPrice: [94], maxPrice: [180], name: { '@fr': 'chambre confort de 1 à 2 personnes' }, appliesOnPeriod: [{ startDate: '2026-01-01', endDate: '2026-12-31' }] }),
    )
    expect(extractNightlyPrice(offers, 'hotel', TODAY)).toBe(94)
  })

  it('ignore les périodes terminées', () => {
    const offers = offer(spec({ minPrice: [320], appliesOnPeriod: [{ startDate: '2025-01-01', endDate: '2025-12-31' }] }))
    expect(extractNightlyPrice(offers, 'hotel', TODAY)).toBeNull()
  })

  it('ignore suppléments, petit-déjeuner, caution, semaine et week-end', () => {
    const offers = offer(
      spec({ minPrice: [12], name: { '@fr': 'Supplément animaux' } }),
      spec({ minPrice: [15], name: { '@fr': 'Petit déjeuner (par personne)' } }),
      spec({ minPrice: [200], name: { '@fr': 'Caution' } }),
      spec({ minPrice: [300], name: { '@fr': 'Week-end ou 2 nuits' }, hasPricingMode: [{ key: 'Weekend2Nights' }] }),
      spec({ minPrice: [700], name: { '@fr': 'Semaine' }, hasPricingMode: [{ key: 'PerWeek' }] }),
    )
    expect(extractNightlyPrice(offers, 'apartment', TODAY)).toBeNull()
  })

  it('garde les tarifs par chambre et les chambres d’hôtes', () => {
    const offers = offer(
      spec({ minPrice: [120], name: { '@fr': 'Chambre twin sans petit déjeuner' }, hasPricingMode: [{ key: 'PerRoom' }] }),
      spec({ minPrice: [95], hasPricingMode: [{ key: 'TwoPeopleBAndB' }] }),
    )
    expect(extractNightlyPrice(offers, 'apartment', TODAY)).toBe(95)
  })

  it('camping : emplacement 2 personnes gardé, tarifs enfant et plafonds exclus', () => {
    const offers = offer(
      spec({ minPrice: [20], maxPrice: [20], additionalInformation: { '@fr': 'Prix TTC, électricité en sus, \nBase 2 personnes' } }),
      spec({ minPrice: [3], additionalInformation: { '@fr': '< 18 ans' } }),
      spec({ minPrice: [5], additionalInformation: { '@fr': '4 pers. maxi/emplacement' } }),
      spec({ minPrice: [546], name: { '@fr': 'Pour 5 personnes max.' } }),
    )
    expect(extractNightlyPrice(offers, 'camping', TODAY)).toBe(20)
  })

  it('rejette les prix hors plage plausible et les offres sans tarif', () => {
    expect(extractNightlyPrice(offer(spec({ minPrice: [2] })), 'hotel', TODAY)).toBeNull()
    expect(extractNightlyPrice(offer(spec({})), 'hotel', TODAY)).toBeNull()
    expect(extractNightlyPrice([{ acceptedPaymentMethod: [{ key: 'Visa' }] }], 'hotel', TODAY)).toBeNull()
    expect(extractNightlyPrice(undefined, 'hotel', TODAY)).toBeNull()
    expect(extractNightlyPrice(offer(spec({ minPrice: [80] })), 'aire', TODAY)).toBeNull()
  })
})

describe('summarizePrices', () => {
  it('refuse un échantillon trop petit', () => {
    expect(summarizePrices([50, 60, 70, 80])).toBeNull()
  })
  it('donne fourchette interquartile et médiane', () => {
    expect(summarizePrices([40, 50, 60, 70, 80, 90, 100])).toEqual({ n: 7, low: 55, median: 70, high: 85 })
  })
})

describe('validateQuery', () => {
  it('arrondit à la maille de 0,1° et contrôle le type', () => {
    expect(validateQuery({ lat: '45.764', lon: '4.8357', type: 'hotel' })).toEqual({ lat: 45.8, lon: 4.8, type: 'hotel' })
    expect(validateQuery({ lat: 'x', lon: '1', type: 'hotel' }).error).toBeTruthy()
    expect(validateQuery({ lat: '45', lon: '4', type: 'aire' }).error).toBeTruthy()
  })
})

function objects(prices) {
  return prices.map((p, i) => ({ uuid: `u${i}`, lastUpdate: `2026-0${(i % 9) + 1}-15T10:00:00`, offers: offer(spec({ minPrice: [p] })) }))
}
const silent = { warn: () => {} }
const json = (body, status = 200) => new Response(JSON.stringify(body), { status })

describe('createLodgingPriceService', () => {
  const base = { datatourismeApiKey: 'k', logger: silent }
  const q = { lat: '45.76', lon: '4.84', type: 'hotel' }

  it('sans clé : 503', async () => {
    const svc = createLodgingPriceService({ config: { logger: silent }, fetchImpl: vi.fn() })
    expect((await svc.compute(q)).status).toBe(503)
  })

  it('renvoie une fourchette et ne l’appelle qu’une fois (cache)', async () => {
    const fetchImpl = vi.fn(async () => json({ objects: objects([60, 70, 80, 90, 100, 110]) }))
    const svc = createLodgingPriceService({ config: base, fetchImpl })
    const a = await svc.compute(q)
    expect(a.status).toBe(200)
    expect(a.payload).toMatchObject({ available: true, type: 'hotel', n: 6, median: 85, radiusKm: 30, source: 'DATAtourisme' })
    expect(a.payload.updatedAt).toMatch(/^2026-/)
    await svc.compute(q)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(init.headers['X-API-Key']).toBe('k')
    expect(String(url)).not.toContain('api_key')
  })

  it('élargit à 60 km quand 30 km ne suffisent pas, puis abandonne', async () => {
    const fetchImpl = vi.fn(async () => json({ objects: objects([60, 70]) }))
    const svc = createLodgingPriceService({ config: base, fetchImpl })
    const r = await svc.compute(q)
    expect(r.payload).toEqual({ available: false, type: 'hotel' })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('retente sans filtre de prix si l’API refuse le filtre (400)', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json({ error: 'bad filter' }, 400))
      .mockResolvedValueOnce(json({ objects: objects([60, 70, 80, 90, 100]) }))
    const svc = createLodgingPriceService({ config: base, fetchImpl })
    const r = await svc.compute(q)
    expect(r.payload.available).toBe(true)
    expect(String(fetchImpl.mock.calls[0][0])).toContain('minPrice')
    expect(String(fetchImpl.mock.calls[1][0])).not.toContain('minPrice')
  })

  it('traduit les erreurs amont', async () => {
    const make = (status) => createLodgingPriceService({ config: base, fetchImpl: vi.fn(async () => json({}, status)) })
    expect((await make(429).compute(q)).status).toBe(429)
    expect((await make(403).compute(q)).payload.error).toBe('upstream_forbidden')
    expect((await make(500).compute(q)).status).toBe(502)
    const down = createLodgingPriceService({ config: base, fetchImpl: vi.fn(async () => { throw new Error('boom') }) })
    expect((await down.compute(q)).status).toBe(502)
  })

  it('respecte la limite par adresse sur les appels réellement émis', async () => {
    const fetchImpl = vi.fn(async () => json({ objects: [] }))
    const svc = createLodgingPriceService({ config: base, fetchImpl })
    const r = await svc.compute(q, { allowUpstream: () => false })
    expect(r.status).toBe(429)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
