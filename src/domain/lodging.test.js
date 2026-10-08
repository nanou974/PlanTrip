import { describe, it, expect } from 'vitest'
import { lodgingTypesFor, isLodgingAllowed, parseNightlyPrice, LODGING_TYPES } from './lodging.js'

describe('hébergements par véhicule', () => {
  it("n'autorise l'aire de camping-car que pour camping-car et van", () => {
    expect(isLodgingAllowed('camping-car', 'aire')).toBe(true)
    expect(isLodgingAllowed('van', 'aire')).toBe(true)
    for (const slug of ['voiture', 'voiture-sans-permis', 'moto', 'velo']) {
      expect(isLodgingAllowed(slug, 'aire')).toBe(false)
    }
  })

  it("ne propose pas d'hôtel ni d'appartement au camping-car et au van", () => {
    expect(lodgingTypesFor('camping-car')).toEqual(['aire', 'camping'])
    expect(lodgingTypesFor('van')).toEqual(['aire', 'camping'])
  })

  it('traite un véhicule inconnu comme une voiture', () => {
    expect(lodgingTypesFor('inconnu')).toEqual(lodgingTypesFor('voiture'))
  })

  it('chaque type autorisé existe avec une fourchette cohérente', () => {
    for (const types of Object.values({ a: lodgingTypesFor('voiture'), b: lodgingTypesFor('van'), c: lodgingTypesFor('velo') })) {
      for (const t of types) {
        const [min, max] = LODGING_TYPES[t].range
        expect(min).toBeLessThanOrEqual(max)
      }
    }
  })
})

describe('parseNightlyPrice', () => {
  it('accepte virgule et point, refuse le reste', () => {
    expect(parseNightlyPrice('45')).toBe(45)
    expect(parseNightlyPrice('45,5')).toBe(45.5)
    expect(parseNightlyPrice(' 0 ')).toBe(0)
    expect(parseNightlyPrice('')).toBeNull()
    expect(parseNightlyPrice('abc')).toBeNull()
    expect(parseNightlyPrice('-3')).toBeNull()
    expect(parseNightlyPrice('99999')).toBeNull()
  })
})
