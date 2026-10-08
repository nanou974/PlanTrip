import { describe, it, expect } from 'vitest'
import { estimateTripCosts, estimateDurationSec, RATES, fuelPriceFor, toNumber } from './estimate.js'

const car = { slug: 'voiture', category: 'car', fuel: 'essence', defaultConsumption: 7.5 }
const bike = { slug: 'velo', category: 'bike', fuel: 'aucune', defaultConsumption: null }

describe('estimateTripCosts — voiture', () => {
  const result = estimateTripCosts({
    vehicle: car,
    distanceKm: 100,
    days: 2,
    nights: 1,
    travelers: 2,
    profile: { confort: 0.5, decouverte: 0.5, nature: 0.5 },
  })

  it('carburant = distance × consommation × prix', () => {
    const fuel = result.lines.find((l) => l.id === 'fuel')
    expect(fuel.amount).toBeCloseTo((100 * 7.5) / 100 * RATES.fuelPricePerLiter.essence, 2)
    expect(fuel.category).toBe('transport')
  })

  it('péages proportionnels à la distance', () => {
    expect(result.lines.find((l) => l.id === 'tolls').amount).toBeCloseTo(7.5, 2)
  })

  it('total = somme des lignes', () => {
    expect(result.total).toBeCloseTo(
      result.lines.reduce((s, l) => s + l.amount, 0),
      2,
    )
  })

  it('totaux par catégorie cohérents', () => {
    const sum = Object.values(result.totals).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(result.total, 2)
    expect(result.totals.food ?? 0).toBe(0)
    expect(result.lines.some((l) => l.id === 'meals')).toBe(false)
    expect(result.totals.accommodation).toBeGreaterThan(0)
    expect(result.totals.activities).toBeGreaterThan(0)
  })

  it('la distance fournie est la distance totale : aucun doublement implicite', () => {
    const total = estimateTripCosts({ vehicle: car, distanceKm: 200, days: 1, nights: 0, travelers: 1 })
    const ignored = estimateTripCosts({ vehicle: car, distanceKm: 200, returnTrip: true, days: 1, nights: 0, travelers: 1 })
    expect(ignored.lines.find((l) => l.id === 'fuel').amount).toBe(total.lines.find((l) => l.id === 'fuel').amount)
  })
})

describe('estimateTripCosts — options', () => {
  it('avoidTolls supprime la ligne péages', () => {
    const r = estimateTripCosts({ vehicle: car, distanceKm: 100, avoidTolls: true, days: 1 })
    expect(r.lines.find((l) => l.id === 'tolls')).toBeUndefined()
  })

  it('consommation réelle prioritaire', () => {
    const r = estimateTripCosts({ vehicle: car, distanceKm: 100, customConsumption: 5, days: 1 })
    expect(r.lines.find((l) => l.id === 'fuel').detail).toContain('5 L/100 km')
  })

  it('vélo : ni carburant, ni péage, ni parking', () => {
    const r = estimateTripCosts({ vehicle: bike, distanceKm: 80, days: 3, nights: 2, travelers: 1 })
    const ids = r.lines.map((l) => l.id)
    expect(ids).not.toContain('fuel')
    expect(ids).not.toContain('tolls')
    expect(ids).not.toContain('parking')
    expect(r.lines.find((l) => l.id === 'accommodation').detail).toContain('22 €/nuit')
  })

  it('confort plus élevé → hébergement plus cher', () => {
    const low = estimateTripCosts({ vehicle: car, distanceKm: 100, days: 2, nights: 1, profile: { confort: 0 } })
    const high = estimateTripCosts({ vehicle: car, distanceKm: 100, days: 2, nights: 1, profile: { confort: 1 } })
    expect(high.totals.accommodation).toBeGreaterThan(low.totals.accommodation)
  })

  it('sans nuitée, pas de ligne hébergement', () => {
    const r = estimateTripCosts({ vehicle: car, distanceKm: 50, days: 1, nights: 0 })
    expect(r.lines.find((l) => l.id === 'accommodation')).toBeUndefined()
  })

  it('des valeurs numériques finies', () => {
    const r = estimateTripCosts({ vehicle: car, distanceKm: 0, days: 1, nights: 0, travelers: 1 })
    expect(Number.isFinite(r.total)).toBe(true)
    for (const l of r.lines) expect(Number.isFinite(l.amount)).toBe(true)
  })
})

describe('helpers', () => {
  it('durée estimée', () => {
    expect(estimateDurationSec({ distanceKm: 200, avgSpeedKph: 100 })).toBe(7200)
    expect(estimateDurationSec({ distanceKm: 0 })).toBe(0)
    expect(estimateDurationSec({ distanceKm: 90, avgSpeedKph: 90 })).toBe(3600)
  })

  it('prix du carburant selon l’énergie', () => {
    expect(fuelPriceFor(car)).toBe(1.86)
    expect(fuelPriceFor({ fuel: 'diesel' })).toBe(1.74)
    expect(fuelPriceFor({ fuel: 'inconnu' })).toBe(1.86)
    expect(fuelPriceFor(null)).toBe(1.86)
  })

  it('toNumber accepte la virgule française', () => {
    expect(toNumber('7,5')).toBe(7.5)
    expect(toNumber(7.5)).toBe(7.5)
    expect(toNumber(0)).toBe(0)
    expect(toNumber('')).toBeNull()
    expect(toNumber(null)).toBeNull()
    expect(toNumber('abc')).toBeNull()
  })

  it('consommation française « 7,5 » produite un carburant fini', () => {
    const r = estimateTripCosts({
      vehicle: { slug: 'voiture', category: 'car', fuel: 'essence', defaultConsumption: '7,5' },
      distanceKm: 200,
      days: 2,
      nights: 1,
      travelers: 2,
    })
    const fuel = r.lines.find((l) => l.id === 'fuel')
    expect(fuel).toBeTruthy()
    expect(Number.isFinite(fuel.amount)).toBe(true)
    expect(fuel.detail).toContain('7.5 L/100 km')
    expect(Number.isFinite(r.total)).toBe(true)
  })
})
