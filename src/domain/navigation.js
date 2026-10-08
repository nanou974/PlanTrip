/**
 * Navigation GPS : liens d'ouverture du trajet dans les applications de guidage du téléphone.
 * PlanTrip ne guide pas lui-même : l'application choisie recalcule son propre itinéraire.
 */

/** Google Maps accepte au plus 9 points de passage entre le départ et l'arrivée. */
export const MAX_GOOGLE_WAYPOINTS = 9

function isPoint(p) {
  return Boolean(p) && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)) && p.lat !== null && p.lon !== null
}

function coord(p) {
  return `${Number(p.lat).toFixed(5)},${Number(p.lon).toFixed(5)}`
}

/** Rang du sommet du tracé ([lon, lat]) le plus proche du point : sert à ordonner les étapes le long de la route. */
function positionAlong(point, coordinates) {
  let best = 0
  let bestDist = Infinity
  const cosLat = Math.cos((Number(point.lat) * Math.PI) / 180)
  for (let i = 0; i < coordinates.length; i += 1) {
    const dLat = coordinates[i][1] - Number(point.lat)
    const dLon = (coordinates[i][0] - Number(point.lon)) * cosLat
    const d = dLat * dLat + dLon * dLon
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best
}

/**
 * Points intermédiaires du trajet aller, dans l'ordre : étapes choisies par le voyageur et étapes de nuit.
 * Sans tracé calculé, impossible de les ordonner entre eux : seules les étapes du voyageur sont conservées.
 */
export function intermediatePoints({ places = [], nightStops = [], coordinates = [] } = {}) {
  const chosen = places.filter(isPoint)
  const nights = nightStops.filter(isPoint)
  if (!Array.isArray(coordinates) || coordinates.length < 2 || nights.length === 0) return chosen
  return [...chosen, ...nights]
    .map((p, index) => ({ p, index, pos: positionAlong(p, coordinates) }))
    .sort((a, b) => a.pos - b.pos || a.index - b.index)
    .map(({ p }) => p)
}

/** Réduit la liste à `max` points répartis régulièrement (premier et dernier conservés). */
export function limitWaypoints(points, max = MAX_GOOGLE_WAYPOINTS) {
  if (points.length <= max) return points
  if (max <= 0) return []
  if (max === 1) return [points[Math.floor(points.length / 2)]]
  const out = []
  for (let i = 0; i < max; i += 1) out.push(points[Math.round((i * (points.length - 1)) / (max - 1))])
  return out
}

export function googleMapsUrl({ origin, destination, waypoints = [] }) {
  if (!isPoint(origin) || !isPoint(destination)) return ''
  const via = limitWaypoints(waypoints.filter(isPoint))
  const params = [
    'api=1',
    `origin=${coord(origin)}`,
    `destination=${coord(destination)}`,
    'travelmode=driving',
  ]
  if (via.length) params.push(`waypoints=${via.map(coord).join('%7C')}`)
  return `https://www.google.com/maps/dir/?${params.join('&')}`
}

/** Waze et Apple Plans ne prennent qu'une destination : l'appli guide depuis la position actuelle. */
export function wazeUrl(destination) {
  return isPoint(destination) ? `https://www.waze.com/ul?ll=${coord(destination)}&navigate=yes` : ''
}

export function appleMapsUrl(destination) {
  return isPoint(destination) ? `https://maps.apple.com/?daddr=${coord(destination)}&dirflg=d` : ''
}

/**
 * Liens pour un sens de circulation. `reverse` : trajet retour (arrivée → départ, étapes inversées).
 * @returns {{google:string, waze:string, apple:string, waypointCount:number, truncated:boolean}}
 */
export function navigationLinks({ departure, destination, waypoints = [], reverse = false } = {}) {
  const via = waypoints.filter(isPoint)
  const origin = reverse ? destination : departure
  const target = reverse ? departure : destination
  const ordered = reverse ? [...via].reverse() : via
  const used = limitWaypoints(ordered)
  return {
    google: googleMapsUrl({ origin, destination: target, waypoints: ordered }),
    waze: wazeUrl(target),
    apple: appleMapsUrl(target),
    waypointCount: used.length,
    truncated: ordered.length > used.length,
  }
}
