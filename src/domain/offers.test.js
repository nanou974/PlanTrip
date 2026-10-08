import { describe, it, expect } from 'vitest'
import { offerLinks, stay22Url, shortPlaceName } from './offers.js'

describe('offerLinks', () => {
  const base = { destinationName: 'Briançon, Hautes-Alpes, France', start: '2026-12-10', end: '2026-12-12', travelers: 2 }

  it('pré-remplit destination, dates et voyageurs pour une voiture', () => {
    const links = offerLinks({ ...base, vehicleSlug: 'voiture' })
    expect(links.map((l) => l.id)).toEqual(['booking', 'hotels', 'airbnb', 'campings'])
    const booking = new URL(links[0].url)
    expect(booking.searchParams.get('ss')).toBe('Briançon')
    expect(booking.searchParams.get('checkin')).toBe('2026-12-10')
    expect(booking.searchParams.get('checkout')).toBe('2026-12-12')
    expect(booking.searchParams.get('group_adults')).toBe('2')
    expect(new URL(links[2].url).pathname).toBe('/s/Brian%C3%A7on/homes')
  })

  it("ne propose ni hôtel ni Airbnb à un camping-car, mais des aires", () => {
    const ids = offerLinks({ ...base, vehicleSlug: 'camping-car' }).map((l) => l.id)
    expect(ids).toEqual(['campings', 'park4night', 'campercontact'])
    expect(offerLinks({ ...base, vehicleSlug: 'van' }).map((l) => l.id)).toEqual(ids)
  })

  it("ne propose pas Airbnb au vélo", () => {
    expect(offerLinks({ ...base, vehicleSlug: 'velo' }).map((l) => l.id)).toEqual(['booking', 'hotels', 'campings'])
  })

  it('omet les dates absentes ou incohérentes', () => {
    const bad = offerLinks({ ...base, start: '2026-12-12', end: '2026-12-10' })[0]
    expect(new URL(bad.url).searchParams.has('checkin')).toBe(false)
    const none = offerLinks({ destinationName: 'Lyon' })[0]
    expect(new URL(none.url).searchParams.has('checkin')).toBe(false)
  })

  it('renvoie une liste vide sans destination', () => {
    expect(offerLinks({ destinationName: '' })).toEqual([])
  })
})

describe('stay22Url', () => {
  it('construit l’adresse de la carte', () => {
    const url = new URL(stay22Url({ aid: 'plantrip', destinationName: 'Nice, France', start: '2026-12-10', end: '2026-12-12', travelers: 3 }))
    expect(url.origin + url.pathname).toBe('https://www.stay22.com/embed/gm')
    expect(url.searchParams.get('aid')).toBe('plantrip')
    expect(url.searchParams.get('address')).toBe('Nice')
    expect(url.searchParams.get('adults')).toBe('3')
    expect(url.searchParams.get('checkin')).toBe('2026-12-10')
  })

  it('renvoie null sans identifiant valide ni destination', () => {
    expect(stay22Url({ destinationName: 'Nice' })).toBeNull()
    expect(stay22Url({ aid: 'a b/c', destinationName: 'Nice' })).toBeNull()
    expect(stay22Url({ aid: 'ok' })).toBeNull()
  })

  it('shortPlaceName garde le premier élément', () => {
    expect(shortPlaceName(' Lyon , Rhône')).toBe('Lyon')
  })
})
