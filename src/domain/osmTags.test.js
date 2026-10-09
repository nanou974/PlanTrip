import { describe, expect, it } from 'vitest'
import { describeOsmLodging, osmServices, parseCharge, parseOsmFee, pickTags, suggestedNightlyInput } from './osmTags.js'

describe('parseCharge', () => {
  it('lit les formats rencontrés sur OpenStreetMap', () => {
    expect(parseCharge('14.38 EUR')).toBe(14.38)
    expect(parseCharge('EUR 10')).toBe(10)
    expect(parseCharge('8 EUR/24 hours')).toBe(8)
    expect(parseCharge('3,50 €')).toBe(3.5)
    expect(parseCharge('€ 12')).toBe(12)
  })

  it('refuse les textes ambigus ou qui ne sont pas un prix de nuitée', () => {
    expect(parseCharge('10 EUR par personne')).toBeNull()
    expect(parseCharge('5 EUR per person')).toBeNull()
    expect(parseCharge('2 EUR/hour')).toBeNull()
    expect(parseCharge('50 EUR/week')).toBeNull()
    expect(parseCharge('10 EUR; 5 EUR electricity')).toBeNull()
    expect(parseCharge('8 EUR, 12 EUR')).toBeNull()
    expect(parseCharge('gratuit')).toBeNull()
    expect(parseCharge('')).toBeNull()
    expect(parseCharge(undefined)).toBeNull()
  })

  it('refuse un montant absurde', () => {
    expect(parseCharge('0 EUR')).toBeNull()
    expect(parseCharge('250 EUR')).toBeNull()
  })
})

describe('parseOsmFee', () => {
  it('distingue gratuit, payant avec prix et payant sans prix', () => {
    expect(parseOsmFee({ fee: 'no' })).toEqual({ fee: 'free', price: null })
    expect(parseOsmFee({ fee: 'yes', charge: '14.38 EUR' })).toEqual({ fee: 'paid', price: 14.38 })
    expect(parseOsmFee({ fee: 'yes' })).toEqual({ fee: 'paid', price: null })
    expect(parseOsmFee({ charge: '10 EUR' })).toEqual({ fee: 'paid', price: 10 })
    expect(parseOsmFee({})).toEqual({ fee: null, price: null })
  })

  it('un lieu déclaré gratuit n’affiche jamais de prix', () => {
    expect(parseOsmFee({ fee: 'no', charge: '10 EUR' })).toEqual({ fee: 'free', price: null })
  })
})

describe('osmServices', () => {
  it('ne signale que ce qui est explicitement indiqué', () => {
    expect(osmServices({ sanitary_dump_station: 'yes', drinking_water: 'yes' })).toEqual({ dump: true, water: true, power: false })
    expect(osmServices({ water_point: 'yes' }).water).toBe(true)
    expect(osmServices({ power_supply: 'no' })).toEqual({ dump: false, water: false, power: false })
    expect(osmServices()).toEqual({ dump: false, water: false, power: false })
  })
})

describe('pickTags', () => {
  it('écarte les étiquettes inutiles et les liens dangereux', () => {
    const out = pickTags({ name: 'Aire', tourism: 'caravan_site', note: 'x'.repeat(5000), website: 'javascript:alert(1)', fee: 'yes' })
    expect(out).toEqual({ name: 'Aire', tourism: 'caravan_site', fee: 'yes' })
    expect(pickTags({ website: 'https://exemple.fr' }).website).toBe('https://exemple.fr')
  })

  it('tronque les textes trop longs', () => {
    expect(pickTags({ name: 'a'.repeat(500) }).name).toHaveLength(160)
  })
})

describe('describeOsmLodging / suggestedNightlyInput', () => {
  it('décrit le tarif et les services', () => {
    expect(describeOsmLodging({ fee: 'free' }).price).toBe('Gratuit')
    expect(describeOsmLodging({ fee: 'paid', price: 14.38 }).price).toBe('≈ 14,38 € la nuit')
    expect(describeOsmLodging({ fee: 'paid', price: null }).price).toBe('Payant (tarif non indiqué)')
    expect(describeOsmLodging({ fee: null, price: null }).price).toBe('')
    expect(describeOsmLodging({ services: { dump: true, water: true, power: false } }).services).toBe('Vidange, eau')
    expect(describeOsmLodging({}).services).toBe('')
  })

  it('propose 0 pour un lieu gratuit, le prix s’il existe, sinon rien', () => {
    expect(suggestedNightlyInput({ fee: 'free' })).toBe('0')
    expect(suggestedNightlyInput({ fee: 'paid', price: 14.38 })).toBe('14,38')
    expect(suggestedNightlyInput({ fee: 'paid', price: null })).toBe('')
    expect(suggestedNightlyInput({})).toBe('')
  })
})
