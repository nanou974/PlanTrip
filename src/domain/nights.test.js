import { describe, expect, it } from 'vitest'
import { allocateNights, interpolate, priceNights } from './nights.js'

describe('interpolate', () => {
  it('suit le confort et reste borné', () => {
    expect(interpolate(60, 100, 0)).toBe(60)
    expect(interpolate(60, 100, 0.5)).toBe(80)
    expect(interpolate(60, 100, 1)).toBe(100)
    expect(interpolate(60, 100, 7)).toBe(100)
    expect(interpolate(60, 100, NaN)).toBe(80)
  })
})

describe('allocateNights', () => {
  it('aller simple : une nuit par étape, le reste sur place', () => {
    expect(allocateNights({ nights: 5, stopCount: 2 })).toEqual({ road: [0, 1], destination: 3 })
  })
  it('aller-retour : les étapes sont reprises à l’envers au retour', () => {
    expect(allocateNights({ nights: 6, stopCount: 2, roundTrip: true })).toEqual({ road: [0, 1, 1, 0], destination: 2 })
  })
  it('dates trop courtes : toutes les nuits sont en route, aucune sur place', () => {
    expect(allocateNights({ nights: 1, stopCount: 2 })).toEqual({ road: [0], destination: 0 })
    expect(allocateNights({ nights: 0, stopCount: 2 })).toEqual({ road: [], destination: 0 })
  })
  it('sans étape : tout sur place', () => {
    expect(allocateNights({ nights: 3, stopCount: 0 })).toEqual({ road: [], destination: 3 })
  })
})

describe('priceNights', () => {
  const allocation = { road: [0, 1], destination: 3 }
  it('chaque nuit au tarif de son lieu', () => {
    const r = priceNights({ allocation, stopNightly: [70, 90], destNightly: 80 })
    expect(r.total).toBe(70 + 90 + 3 * 80)
    expect(r.road).toEqual([70, 90])
    expect(r.perStopKnown).toBe(true)
  })
  it('étape sans tarif : on prend le tarif de la destination', () => {
    const r = priceNights({ allocation, stopNightly: [null, 90], destNightly: 80 })
    expect(r.road).toEqual([80, 90])
    expect(r.total).toBe(80 + 90 + 240)
  })
  it('le prix saisi remplace tous les tarifs', () => {
    const r = priceNights({ allocation, stopNightly: [70, 90], destNightly: 80, userNightly: 50 })
    expect(r.total).toBe(250)
    expect(r.perStopKnown).toBe(false)
  })
  it('arrondit le total, pas chaque nuit', () => {
    const r = priceNights({ allocation: { road: [], destination: 3 }, destNightly: 33.4 })
    expect(r.total).toBe(100)
  })
  it('sans tarif de destination : 0 € plutôt que NaN', () => {
    const r = priceNights({ allocation: { road: [], destination: 2 } })
    expect(r.total).toBe(0)
  })
})
