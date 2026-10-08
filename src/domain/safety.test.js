import { describe, expect, it } from 'vitest'
import vehicles from '../data/vehicles.json'
import { safetyChecksFor } from './safety.js'

describe('safetyChecksFor', () => {
  it('couvre tous les véhicules proposés par PlanTrip', () => {
    for (const v of vehicles) {
      const groups = safetyChecksFor(v.slug)
      expect(groups.length, v.slug).toBeGreaterThan(0)
      for (const g of groups) {
        expect(g.items.length).toBeGreaterThan(0)
        for (const item of g.items) expect(item.trim().length).toBeGreaterThan(10)
      }
    }
  })

  it('rappelle la pression des pneus pour les véhicules à moteur et le vélo', () => {
    for (const slug of ['voiture', 'camping-car', 'van', 'voiture-sans-permis', 'moto', 'velo']) {
      const text = safetyChecksFor(slug)
        .flatMap((g) => g.items)
        .join(' ')
      expect(text.toLowerCase(), slug).toContain('pression')
    }
  })

  it('ajoute la vie à bord pour le camping-car et le van uniquement', () => {
    expect(safetyChecksFor('camping-car').some((g) => g.id === 'habitation')).toBe(true)
    expect(safetyChecksFor('van').some((g) => g.id === 'habitation')).toBe(true)
    expect(safetyChecksFor('voiture').some((g) => g.id === 'habitation')).toBe(false)
  })

  it('ne propose ni gilet-triangle de voiture à moto ni équipement moto au vélo', () => {
    const moto = safetyChecksFor('moto').flatMap((g) => g.items).join(' ')
    const velo = safetyChecksFor('velo').flatMap((g) => g.items).join(' ')
    expect(moto).not.toContain('Triangle')
    expect(velo).not.toContain('Casque homologué')
  })

  it('renvoie une liste vide pour un véhicule inconnu et ne partage pas ses données', () => {
    expect(safetyChecksFor('inconnu')).toEqual([])
    const a = safetyChecksFor('voiture')
    a[0].items.push('x')
    expect(safetyChecksFor('voiture')[0].items).not.toContain('x')
  })
})
