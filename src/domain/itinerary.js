/**
 * Itinéraire — points d'étape, ordre, estimation de repli.
 * Le tronçon « brut » (OSRM) vit dans services/routing ; ici, la logique métier.
 */

export const PLACE_KINDS = ['stop', 'lodging', 'restaurant', 'poi', 'rest-area', 'fuel', 'address']
export const KIND_LABEL = {
  stop: 'Étape',
  lodging: 'Hébergement',
  restaurant: 'Restaurant',
  poi: 'Point d’intérêt',
  'rest-area': 'Aire de repos',
  fuel: 'Station-service',
  address: 'Adresse personnelle',
}
export const KIND_ICON = {
  stop: 'pin',
  lodging: 'bed',
  restaurant: 'utensils',
  poi: 'star',
  'rest-area': 'parking',
  fuel: 'fuel',
  address: 'address',
}
/** Seuls ces lieux sont intégrés au calcul de la route. */
export const ROUTE_KINDS = ['stop', 'lodging']

export function isRoutePlace(place) {
  return ROUTE_KINDS.includes(place?.kind)
}

/** Points du trajet, dans l’ordre : les seuls lieux routables. */
export function routePlaces(places = []) {
  return sortPlaces(places).filter(isRoutePlace)
}

/** Réinjecte la sélection routable dans la liste complète, en réattribuant les ordres. */
export function withRoutePlaces(all = [], nextRoute = []) {
  const others = sortPlaces(all).filter((p) => !isRoutePlace(p))
  return [...nextRoute, ...others].map((place, index) => ({ ...place, order: index + 1 }))
}

export function createPlace(input = {}) {
  const now = new Date().toISOString()
  return {
    id: input.id || `p_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`,
    name: String(input.name || '').trim() || 'Étape',
    lat: isCoord(input.lat) ? Number(input.lat) : null,
    lon: isCoord(input.lon) ? Number(input.lon) : null,
    context: String(input.context || ''),
    country: String(input.country || ''),
    kind: PLACE_KINDS.includes(input.kind) ? input.kind : 'stop',
    day: Math.max(1, Math.round(Number(input.day) || 1)),
    order: Number.isFinite(Number(input.order)) ? Number(input.order) : 0,
    dwellMinutes: Number.isFinite(Number(input.dwellMinutes)) ? Number(input.dwellMinutes) : null,
    notes: String(input.notes || ''),
    createdAt: input.createdAt || now,
  }
}

export function isCoord(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
}

export function isGeoPoint(p) {
  return Boolean(p) && isCoord(p.lat) && isCoord(p.lon)
}

export function sortPlaces(places = []) {
  return [...places].sort(
    (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name).localeCompare(String(b.name), 'fr'),
  )
}

/** Départ → étapes routables (dans l’ordre) → destination. */
export function itineraryPoints(trip, { withReturn = false } = {}) {
  if (!trip) return []
  const stops = routePlaces(trip.places)
  const points = [trip.departure, ...stops, trip.destination]
  if (withReturn && trip.returnTrip) points.push(...[...stops].reverse(), trip.departure)
  return points.filter(isGeoPoint)
}

export function nextOrder(trip) {
  const orders = (trip?.places || []).map((p) => Number(p.order) || 0)
  return orders.length ? Math.max(...orders) + 1 : 1
}

/** Insert un point en le plaçant juste avant la destination. */
export function addPlace(trip, input) {
  const place = createPlace({ ...input, order: nextOrder(trip) })
  return [...(trip.places || []), place]
}

export function movePlace(places = [], index, delta) {
  const sorted = sortPlaces(places)
  const target = index + delta
  if (target < 0 || target >= sorted.length) return places
  const next = [...sorted]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next.map((p, i) => ({ ...p, order: i + 1 }))
}

export function removePlace(places = [], id) {
  return sortPlaces(places)
    .filter((p) => p.id !== id)
    .map((p, i) => ({ ...p, order: i + 1 }))
}

/* ————————————————————————————————
   Estimation de repli (hors ligne / service indisponible)
   ———————————————————————————————— */

const ROAD_FACTOR = 1.25

export function durationForDistanceKm(distanceKm, avgSpeedKph = 90) {
  const speed = Math.max(5, Number(avgSpeedKph) || 90)
  return (Number(distanceKm) / speed) * 3600
}

/** Itinéraire droit entre tous les points, avec la vitesse moyenne du véhicule. */
export function estimateItinerary(points, avgSpeedKph = 90) {
  const valid = points.filter(isGeoPoint)
  if (valid.length < 2) return { distanceKm: 0, durationSec: 0, polyline: [] }

  let meters = 0
  const polyline = []
  for (let i = 0; i < valid.length - 1; i += 1) {
    meters += haversine(valid[i], valid[i + 1])
    if (i === 0) polyline.push([Number(valid[i].lon), Number(valid[i].lat)])
    polyline.push([Number(valid[i + 1].lon), Number(valid[i + 1].lat)])
  }
  const distanceKm = (meters * ROAD_FACTOR) / 1000
  return {
    distanceKm: round1(distanceKm),
    durationSec: Math.round(durationForDistanceKm(distanceKm, avgSpeedKph)),
    polyline,
    estimated: true,
  }
}

export function haversine(a, b) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(Number(b.lat) - Number(a.lat))
  const dLon = toRad(Number(b.lon) - Number(a.lon))
  const lat1 = toRad(Number(a.lat))
  const lat2 = toRad(Number(b.lat))
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

function round1(n) {
  return Math.round(n * 10) / 10
}

/** Statut d'un itinéraire pour l'affichage. */
export function itineraryState(trip) {
  const points = itineraryPoints(trip)
  if (points.length < 2) return 'incomplete'
  if (trip?.itinerary?.distanceKm > 0) return trip.itinerary.estimated ? 'estimated' : 'routed'
  return 'none'
}
