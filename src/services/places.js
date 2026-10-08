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

/** Réduit un tracé à au plus `max` points (extrémités conservées), répartis régulièrement. */
export function samplePolyline(polyline, max = 80) {
  if (!Array.isArray(polyline) || polyline.length <= max) return polyline || []
  const out = []
  const step = (polyline.length - 1) / (max - 1)
  for (let i = 0; i < max; i += 1) out.push(polyline[Math.round(i * step)])
  return out
}

/** Filtre Overpass `around` : couloir de `radiusMeters` autour de la ligne brisée. */
export function aroundClause(polyline, radiusMeters, maxPoints = 80) {
  const coords = samplePolyline(polyline, maxPoints)
    .map(([lon, lat]) => `${Number(lat).toFixed(5)},${Number(lon).toFixed(5)}`)
    .join(',')
  return `(around:${Math.round(radiusMeters)},${coords})`
}

/**
 * Recherche Overpass le long du tracé. La requête ne demande que le couloir
 * autour de la route (filtre `around`), `out center` renvoie un point aussi bien
 * pour les nœuds que pour les surfaces (way/relation). Le filtrage exact par
 * rayon, le tri par distance puis la limite sont appliqués côté client, dans cet ordre.
 */
/** Serveurs Overpass publics : le premier est souvent saturé (504), on essaie les suivants. */
export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

/** Exécute une requête Overpass ; renvoie le JSON, ou null si aucun serveur n'a répondu. */
async function overpassQuery(query, signal) {
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(url, { method: 'POST', body: `data=${encodeURIComponent(query)}`, signal })
      if (res.ok) return await res.json()
    } catch (err) {
      if (err?.name === 'AbortError') throw err
    }
  }
  return null
}

export async function searchAlongRoute(trip, { category = 'restaurant', radiusMeters = 6000, limit = 20, signal } = {}) {
  const polyline = routePolyline(trip)
  if (polyline.length < 2) throw new PlacesError('Itinéraire incomplet : ajoutez un départ et une destination.')

  const cat = categoryFor(category)
  const around = aroundClause(polyline, radiusMeters)
  const query = `[out:json][timeout:25];nwr${cat.filter}${around};out center 500;`

  const json = await overpassQuery(query, signal)
  if (!json) throw new PlacesError('Le service de recherche est momentanément indisponible.')
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
  }
  results.sort((a, b) => a.distanceMeters - b.distanceMeters)
  return results.slice(0, limit)
}

const ACCOMMODATION_FILTER = '["tourism"~"hotel|hostel|motel|guest_house|camp_site|caravan_site|apartment"]'

/** Type d'hébergement affiché sur la carte, d'après les étiquettes OSM. */
export function accommodationType(tags = {}) {
  const t = tags.tourism
  if (t === 'hotel' || t === 'hostel' || t === 'motel' || t === 'guest_house') return 'hotel'
  if (t === 'caravan_site') return 'aire'
  if (t === 'camp_site') return 'camping'
  if (t === 'apartment') return 'apartment'
  return 'other'
}

function infoScore(item) {
  return (item.name !== 'Sans nom' ? 4 : 0) + (item.stars ? 2 : 0) + (item.website ? 1 : 0)
}

/**
 * Garde au plus un hébergement par zone (carré d'environ `cellDeg` degrés) et par type,
 * le plus renseigné d'abord : la carte reste lisible et couvre tout le trajet.
 */
export function thinByCell(items, cellDeg = 0.15) {
  const best = new Map()
  for (const item of items) {
    const key = `${item.type}|${Math.floor(item.lat / cellDeg)}|${Math.floor(item.lon / cellDeg)}`
    const current = best.get(key)
    if (!current || infoScore(item) > infoScore(current) || (infoScore(item) === infoScore(current) && item.distanceMeters < current.distanceMeters)) {
      best.set(key, item)
    }
  }
  return [...best.values()]
}

/**
 * Hébergements dans un couloir autour du tracé (Overpass, réseau requis).
 * @returns {Promise<Array|null>} `null` = service injoignable
 */
export async function searchAccommodations(polyline, { radiusMeters = 5000, signal } = {}) {
  if (!Array.isArray(polyline) || polyline.length < 2) return []
  // Overpass public est souvent saturé : un second essai, plus léger (tracé simplifié, plafond réduit).
  const attempts = [
    { points: 120, radius: radiusMeters, cap: 2500 },
    { points: 40, radius: radiusMeters + 1000, cap: 1200 },
  ]
  let json = null
  let used = attempts[0]
  for (const attempt of attempts) {
    used = attempt
    json = await runAccommodationQuery(polyline, attempt, signal)
    if (json) break
  }
  if (!json) return null

  const items = []
  for (const el of json.elements || []) {
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (lat == null || lon == null) continue
    const distanceMeters = distanceToPathMeters({ lat, lon }, polyline)
    if (distanceMeters > used.radius) continue
    const tags = el.tags || {}
    items.push({
      id: `${el.type}-${el.id}`,
      name: tags.name || tags['name:fr'] || 'Sans nom',
      lat,
      lon,
      type: accommodationType(tags),
      stars: tags.stars || null,
      website: tags.website || null,
      distanceMeters: Math.round(distanceMeters),
    })
  }
  return thinByCell(items).sort((a, b) => a.distanceMeters - b.distanceMeters)
}

async function runAccommodationQuery(polyline, { points, radius, cap }, signal) {
  const query = `[out:json][timeout:25];nwr${ACCOMMODATION_FILTER}${aroundClause(polyline, radius, points)};out center ${cap};`
  return overpassQuery(query, signal)
}
