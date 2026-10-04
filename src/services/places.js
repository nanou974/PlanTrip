import { estimateItinerary, haversine, itineraryPoints } from '../domain/itinerary.js'
import { vehicleFor } from '../lib/tripInfo.js'

export const POI_CATEGORIES = [
  {
    id: 'restaurant',
    label: 'Restaurants et cafés',
    kind: 'restaurant',
    icon: 'utensils',
    filter: '["amenity"~"restaurant|cafe|fast_food|bar"]',
  },
  {
    id: 'fuel',
    label: 'Stations-service',
    kind: 'fuel',
    icon: 'fuel',
    filter: '["amenity"="fuel"]',
  },
  {
    id: 'rest-area',
    label: 'Aires de repos et parkings',
    kind: 'rest-area',
    icon: 'parking',
    filter: '["highway"~"rest_area|services"]',
  },
  {
    id: 'poi',
    label: 'Points d’intérêt',
    kind: 'poi',
    icon: 'flag',
    filter: '["tourism"~"attraction|viewpoint|museum|artwork|information"]',
  },
]

export function categoryFor(id) {
  return POI_CATEGORIES.find((c) => c.id === id) || POI_CATEGORIES[0]
}

/** Tracé en [lon, lat] : itinéraire enregistré, sinon estimation directe. */
export function routePolyline(trip) {
  const stored = trip?.itinerary
  if (Array.isArray(stored?.coordinates) && stored.coordinates.length >= 2) return stored.coordinates
  if (Array.isArray(stored?.polyline) && stored.polyline.length >= 2) return stored.polyline
  const vehicle = vehicleFor(trip) || {}
  const estimate = estimateItinerary(itineraryPoints(trip || {}), vehicle.routing?.avgSpeedKph || 90)
  return estimate.polyline
}

/** Bounding box englobante, pad en degrés. */
export function boundsOf(polyline, pad = 0.15) {
  const lons = polyline.map((p) => Number(p[0]))
  const lats = polyline.map((p) => Number(p[1]))
  return {
    south: Math.min(...lats) - pad,
    north: Math.max(...lats) + pad,
    west: Math.min(...lons) - pad,
    east: Math.max(...lons) + pad,
  }
}

/** Distance (m) d'un point au segment [a, b] en [lon, lat]. */
export function segmentDistanceMeters(point, a, b) {
  const lat0 = (Number(point.lat) * Math.PI) / 180
  const mLat = 111320
  const mLon = 111320 * Math.cos(lat0)

  const px = (Number(point.lon) - Number(a[0])) * mLon
  const py = (Number(point.lat) - Number(a[1])) * mLat
  const bx = (Number(b[0]) - Number(a[0])) * mLon
  const by = (Number(b[1]) - Number(a[1])) * mLat

  const len2 = bx * bx + by * by
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / len2))
  const dx = px - t * bx
  const dy = py - t * by
  return Math.sqrt(dx * dx + dy * dy)
}

/** Distance minimale d'un point à tout le tracé. */
export function distanceToPathMeters(point, polyline) {
  if (!polyline || polyline.length === 0) return Infinity
  if (polyline.length === 1) return haversine(point, { lon: polyline[0][0], lat: polyline[0][1] })
  let best = Infinity
  for (let i = 0; i < polyline.length - 1; i += 1) {
    const d = segmentDistanceMeters(point, polyline[i], polyline[i + 1])
    if (d < best) best = d
  }
  return best
}

export class PlacesError extends Error {
  constructor(message) {
    super(message)
    this.name = 'PlacesError'
  }
}

/**
 * Recherche Overpass le long du tracé : la requête couvre la bbox englobante,
 * le filtrage par rayon est fait côté client pour rester fidèle au couloir.
 */
export async function searchAlongRoute(trip, { category = 'restaurant', radiusMeters = 6000, limit = 20, signal } = {}) {
  const polyline = routePolyline(trip)
  if (polyline.length < 2) throw new PlacesError('Itinéraire incomplet : ajoutez un départ et une destination.')

  const { south, north, west, east } = boundsOf(polyline)
  const bbox = `${south},${west},${north},${east}`
  const cat = categoryFor(category)
  const query = `[out:json][timeout:25];(node${cat.filter}(${bbox});way${cat.filter}(${bbox}););out body 120;`

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    signal,
  })
  if (!res.ok) throw new PlacesError('Le service de recherche est momentanément indisponible.')

  const json = await res.json()
  const results = []
  for (const el of json.elements || []) {
    const tags = el.tags || {}
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (lat == null || lon == null) continue
    const distanceMeters = distanceToPathMeters({ lat, lon }, polyline)
    if (distanceMeters > radiusMeters) continue
    results.push({
      id: `osm-${el.type}-${el.id}`,
      name: tags.name || tags['name:fr'] || cat.label,
      lat,
      lon,
      kind: cat.kind,
      category: cat.id,
      context: [tags['addr:street'], tags['addr:city']].filter(Boolean).join(', ') || 'Le long du trajet',
      distanceMeters: Math.round(distanceMeters),
      website: tags.website || null,
    })
    if (results.length >= limit) break
  }
  results.sort((a, b) => a.distanceMeters - b.distanceMeters)
  return results
}
