import { describe, it, expect } from 'vitest'
import { lodgingAlternatives, pricePerNight } from './lodgingAlternatives.js'

const options = [
  { id: 'hotel', label: 'Hôtel', priceRange: [50, 90] },
  { id: 'airbnb', label: 'Airbnb', priceRange: [35, 70] },
  { id: 'camping', label: 'Camping', priceRange: [8, 20] },
]

describe('lodgingAlternatives', () => {
  it('calcule le prix par nuit selon le confort', () => {
    expect(pricePerNight(options[0], 0)).toBe(50)
    expect(pricePerNight(options[0], 1)).toBe(90)
    expect(pricePerNight(options[0], 0.5)).toBe(70)
    expect(pricePerNight(options[0], undefined)).toBe(70)
  })

  it('ne propose rien tant que le budget est respecté', () => {
    expect(lodgingAlternatives({ options, current: options[0], currentLodging: 140, nights: 2, otherCosts: 50, max: 500 })).toEqual([])
  })

  it('propose les options moins chères, de la moins chère à la plus chère, avec leur verdict', () => {
    const res = lodgingAlternatives({ options, current: options[0], currentLodging: 140, confort: 0.5, nights: 2, otherCosts: 100, max: 200 })
    expect(res.map((a) => a.option.id)).toEqual(['camping', 'airbnb'])
    expect(res[0]).toMatchObject({ perNight: 14, lodging: 28, total: 128, remaining: 72, fits: true })
    expect(res[1]).toMatchObject({ perNight: 53, lodging: 106, total: 206, remaining: -6, fits: false })
  })

  it('renvoie une liste vide quand le choix actuel est déjà le moins cher', () => {
    expect(lodgingAlternatives({ options, current: options[2], currentLodging: 28, nights: 2, otherCosts: 300, max: 100 })).toEqual([])
  })

  it('fonctionne aussi avec un hébergement choisi sur la carte ou avec un prix saisi', () => {
    const res = lodgingAlternatives({
      options,
      current: { id: 'map-1', label: 'Hôtel du Lac' },
      currentLodging: 200,
      confort: 0.5,
      nights: 2,
      otherCosts: 100,
      max: 200,
    })
    expect(res.map((a) => a.option.id)).toEqual(['camping', 'airbnb', 'hotel'])
  })

  it('ignore une absence de budget, de nuits ou de choix', () => {
    expect(lodgingAlternatives({ options, current: options[0], currentLodging: 140, nights: 2, otherCosts: 100, max: 0 })).toEqual([])
    expect(lodgingAlternatives({ options, current: options[0], currentLodging: 0, nights: 0, otherCosts: 100, max: 50 })).toEqual([])
    expect(lodgingAlternatives({ options, current: null, currentLodging: null, nights: 2, otherCosts: 100, max: 50 })).toEqual([])
  })
})
