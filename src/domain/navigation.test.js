import { describe, expect, it } from 'vitest'
import {
  MAX_GOOGLE_WAYPOINTS,
  appleMapsUrl,
  googleMapsUrl,
  intermediatePoints,
  limitWaypoints,
  navigationLinks,
  wazeUrl,
} from './navigation.js'

const A = { lat: 48.85, lon: 2.35 }
const B = { lat: 43.6, lon: 1.44 }
// Tracé nord → sud en trois sommets [lon, lat]
const line = [
  [2.35, 48.85],
  [2.0, 46.0],
  [1.44, 43.6],
]

describe('navigation', () => {
  it('construit le lien Google Maps avec départ, arrivée et étapes', () => {
    const url = googleMapsUrl({ origin: A, destination: B, waypoints: [{ lat: 46, lon: 2 }] })
    expect(url).toContain('origin=48.85000,2.35000')
    expect(url).toContain('destination=43.60000,1.44000')
    expect(url).toContain('waypoints=46.00000,2.00000')
    expect(url).toContain('travelmode=driving')
  })

  it('sépare plusieurs étapes par une barre verticale encodée', () => {
    const url = googleMapsUrl({ origin: A, destination: B, waypoints: [{ lat: 47, lon: 2 }, { lat: 45, lon: 2 }] })
    expect(url).toContain('waypoints=47.00000,2.00000%7C45.00000,2.00000')
  })

  it('renvoie une chaîne vide sans coordonnées valides', () => {
    expect(googleMapsUrl({ origin: A, destination: { lat: null, lon: null } })).toBe('')
    expect(wazeUrl(undefined)).toBe('')
    expect(appleMapsUrl({ lat: 'x', lon: 1 })).toBe('')
  })

  it('Waze et Apple Plans ne reçoivent que la destination', () => {
    expect(wazeUrl(B)).toBe('https://www.waze.com/ul?ll=43.60000,1.44000&navigate=yes')
    expect(appleMapsUrl(B)).toBe('https://maps.apple.com/?daddr=43.60000,1.44000&dirflg=d')
  })

  it('limite les étapes à 9 en les répartissant, premier et dernier conservés', () => {
    const pts = Array.from({ length: 20 }, (_, i) => ({ lat: 40 + i, lon: 2 }))
    const kept = limitWaypoints(pts)
    expect(kept).toHaveLength(MAX_GOOGLE_WAYPOINTS)
    expect(kept[0]).toBe(pts[0])
    expect(kept[kept.length - 1]).toBe(pts[19])
    expect(limitWaypoints(pts.slice(0, 3))).toHaveLength(3)
  })

  it('ordonne étapes du voyageur et nuits le long du tracé', () => {
    const chosen = [{ lat: 44.0, lon: 1.5 }] // proche de l'arrivée
    const nights = [{ lat: 46.1, lon: 2.0 }] // milieu du tracé
    const pts = intermediatePoints({ places: chosen, nightStops: nights, coordinates: line })
    expect(pts.map((p) => p.lat)).toEqual([46.1, 44.0])
  })

  it('sans tracé, ne garde que les étapes du voyageur', () => {
    const pts = intermediatePoints({
      places: [{ lat: 45, lon: 2 }],
      nightStops: [{ lat: 46, lon: 2 }],
      coordinates: [],
    })
    expect(pts).toEqual([{ lat: 45, lon: 2 }])
  })

  it('ignore les étapes sans coordonnées', () => {
    expect(intermediatePoints({ places: [{ lat: null, lon: null }, { lat: 45, lon: 2 }] })).toHaveLength(1)
  })

  it('inverse départ, arrivée et étapes pour le retour', () => {
    const via = [{ lat: 47, lon: 2 }, { lat: 45, lon: 2 }]
    const back = navigationLinks({ departure: A, destination: B, waypoints: via, reverse: true })
    expect(back.google).toContain('origin=43.60000,1.44000')
    expect(back.google).toContain('destination=48.85000,2.35000')
    expect(back.google).toContain('waypoints=45.00000,2.00000%7C47.00000,2.00000')
    expect(back.waze).toContain('ll=48.85000,2.35000')
  })

  it('signale la réduction des étapes', () => {
    const via = Array.from({ length: 12 }, (_, i) => ({ lat: 40 + i, lon: 2 }))
    const links = navigationLinks({ departure: A, destination: B, waypoints: via })
    expect(links.waypointCount).toBe(9)
    expect(links.truncated).toBe(true)
  })
})
