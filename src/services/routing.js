/**
 * Calcul d'itinéraire — OSRM (public, sans clé) + repli géométrique.
 * Le repli garantit un résultat affichable hors ligne ou si le service tombe.
 */

import { isCoord } from '../domain/itinerary.js'

const OSRM = 'https://router.project-osrm.org/route/v1/'
const ROAD_FACTOR = 1.25

export const OSRM_PROFILES = {
  driving: 'driving',
  cycling: 'cycling',
  foot: 'foot',
}

export class RoutingError extends Error {
  constructor(message, cause) {
    super(message)
    this.name = 'RoutingError'
    this.cause = cause
  }
}

export function profileForVehicle(vehicleSlug, category) {
  if (category === 'bike') return 'cycling'
  if (vehicleSlug === 'velo') return 'cycling'
  return 'driving'
}

/** Distance à vol d'oiseau en mètres. */
export function haversineMeters(a, b) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Estimation quand OSRM est indisponible : ligne droite × coefficient routier. */
export function estimateRoute(from, to, avgSpeedKph = 90) {
  const straight = haversineMeters(from, to)
  const distance = straight * ROAD_FACTOR
  const speed = Math.max(5, Number(avgSpeedKph) || 90)
  return {
    distance,
    duration: (distance / 1000 / speed) * 3600,
    coordinates: [
      [from.lon, from.lat],
      [to.lon, to.lat],
    ],
    steps: [],
    estimated: true,
  }
}

/** Itinéraire enregistré dans un voyage à partir du résultat de `fetchRoute`. */
export function routeToItinerary(route) {
  return {
    distanceKm: Math.round(route.distance / 100) / 10,
    durationSec: Math.round(route.duration),
    polyline: route.coordinates,
    estimated: false,
    steps: route.steps,
  }
}

/** Message à afficher quand le calcul de repli n'a pas pu tenir compte du véhicule ou des options. */
export const DEGRADED_NOTICE =
  'Calcul de secours : les options « sans péage / sans autoroute » et les contraintes du véhicule n’ont pas pu être appliquées au tracé.'

/** Vrai si le trajet demande davantage qu'un itinéraire de voiture standard. */
export function needsSpecialRouting({ vehicle, avoidTolls = false, avoidHighways = false } = {}) {
  return Boolean(avoidTolls || avoidHighways || (vehicle && vehicle !== 'voiture' && vehicle !== 'moto'))
}

/** Vitesse moyenne maximale réaliste (km/h) des véhicules plus lents que la voiture. */
const MAX_AVG_KPH = { 'voiture-sans-permis': 42 }

/** OSRM calcule des durées de voiture : un véhicule plus lent ne peut pas arriver plus tôt. */
export function applyMinAverageSpeed(distanceMeters, durationSec, vehicle) {
  const kph = MAX_AVG_KPH[vehicle]
  if (!kph || !Number.isFinite(distanceMeters)) return durationSec
  return Math.max(durationSec, Math.round(distanceMeters / (kph / 3.6)))
}

/**
 * Calcul via le serveur PlanTrip (OpenRouteService : profil, évitements et gabarit du véhicule).
 * Renvoie null si le serveur ne peut pas répondre (absent, non configuré, quota, panne) :
 * l'appelant bascule alors sur le repli OSRM. Lève une RoutingError si aucun itinéraire n'existe.
 */
async function fetchViaServer(points, { vehicle, avoidTolls, avoidHighways, heightM, weightT, signal }) {
  let res
  try {
    res = await fetch('/api/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        vehicle,
        avoidTolls: Boolean(avoidTolls),
        avoidHighways: Boolean(avoidHighways),
        ...(Number(heightM) > 0 ? { heightM: Number(heightM) } : {}),
        ...(Number(weightT) > 0 ? { weightT: Number(weightT) } : {}),
        points: points.map((p) => ({ lat: Number(p.lat), lon: Number(p.lon) })),
      }),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    return null
  }
  if (res.status === 422 || res.status === 400) {
    throw new RoutingError('Aucun itinéraire trouvé pour ces points avec ce véhicule')
  }
  if (!res.ok) return null
  let json
  try {
    json = await res.json()
  } catch {
    return null
  }
  if (!Array.isArray(json?.coordinates) || json.coordinates.length < 2 || !Number.isFinite(json.distance)) return null
  return {
    distance: json.distance,
    duration: json.duration,
    coordinates: json.coordinates,
    steps: Array.isArray(json.steps) ? json.steps : [],
    estimated: false,
    provider: 'openrouteservice',
    degraded: false,
  }
}

/**
 * @param {Array<{lat:number,lon:number}>} points au moins 2 points
 * @returns {Promise<{distance:number,duration:number,coordinates:number[][],steps:Array,estimated:boolean,provider:string,degraded:boolean}>}
 */
export async function fetchRoute(
  points,
  { profile = 'driving', vehicle, avoidTolls = false, avoidHighways = false, heightM, weightT, signal } = {},
) {
  const clean = (points || []).filter((p) => isCoord(p?.lon) && isCoord(p?.lat))
  if (clean.length < 2) throw new RoutingError('Moins de deux points valides')

  const viaServer = await fetchViaServer(clean, { vehicle, avoidTolls, avoidHighways, heightM, weightT, signal })
  if (viaServer) return viaServer

  const fallback = await fetchViaOsrm(clean, { profile, signal })
  return {
    ...fallback,
    duration: applyMinAverageSpeed(fallback.distance, fallback.duration, vehicle),
    provider: 'osrm',
    degraded: needsSpecialRouting({ vehicle, avoidTolls, avoidHighways }),
  }
}

async function fetchViaOsrm(clean, { profile, signal }) {
  const path = clean.map((p) => `${Number(p.lon).toFixed(6)},${Number(p.lat).toFixed(6)}`).join(';')
  const url = `${OSRM}${profile}/${path}?overview=full&geometries=geojson&steps=true&annotations=false`

  let res
  try {
    res = await fetch(url, { signal })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new RoutingError('Service de calcul d’itinéraire injoignable', err)
  }
  if (!res.ok) throw new RoutingError(`OSRM a répondu ${res.status}`)

  const json = await res.json()
  const route = json.routes?.[0]
  if (!route) throw new RoutingError('Aucun itinéraire trouvé pour ces points')

  return {
    distance: route.distance,
    duration: route.duration,
    coordinates: route.geometry?.coordinates || [],
    steps: flattenSteps(route.legs || []),
    estimated: false,
  }
}

function flattenSteps(legs) {
  const out = []
  for (const leg of legs) {
    for (const step of leg.steps || []) {
      out.push({
        name: step.name || '',
        distance: step.distance,
        duration: step.duration,
        instruction: instructionFor(step),
      })
    }
  }
  return out.filter((s) => s.instruction)
}

const MODIFIER = {
  left: 'à gauche',
  right: 'à droite',
  'slight left': 'légèrement à gauche',
  'slight right': 'légèrement à droite',
  'sharp left': 'fortement à gauche',
  'sharp right': 'fortement à droite',
  straight: 'tout droit',
  uturn: 'fait demi-tour',
}

export function instructionFor(step) {
  const m = step?.maneuver || {}
  const modifier = m.modifier ? MODIFIER[m.modifier] : null
  switch (m.type) {
    case 'depart':
      return modifier ? `Départ ${modifier}` : 'Départ'
    case 'arrive':
      return modifier ? `Arrivée ${modifier}` : 'Arrivée'
    case 'roundabout':
    case 'rotatory':
    case 'roundabout turn':
      return m.exit ? `Rond-point, prenez la ${m.exit}ᵉ sortie` : 'Rond-point'
    case 'on ramp':
      return modifier ? `Prenez la voie ${modifier}` : 'Prenez la voie d’accès'
    case 'off ramp':
      return modifier ? `Sortez ${modifier}` : 'Sortez de la voie rapide'
    case 'fork':
      return modifier ? `Gardez ${modifier}` : 'Continuez'
    case 'merge':
      return modifier ? `Rejoignez ${modifier}` : 'Rejoignez la voie'
    case 'new name':
      return step.name ? `Continuez sur ${step.name}` : 'Continuez'
    case 'continue':
    case 'end of road':
      return modifier ? `Continuez ${modifier}` : 'Continuez'
    case 'turn':
      return modifier ? `Tournez ${modifier}${step.name ? ` sur ${step.name}` : ''}` : 'Tournez'
    default:
      return step.name ? `Suivez ${step.name}` : 'Continuez'
  }
}

/** Ordre des points d'un trajet aller simple ou aller-retour. */
export function routePoints({ departure, destination, waypoints = [], returnTrip = false }) {
  const points = [departure, ...waypoints, destination]
  if (returnTrip) points.push(...[...waypoints].reverse(), departure)
  return points.filter((p) => p && isCoord(p.lat) && isCoord(p.lon))
}

/* ————————————————————————————————————————————————
   Export GPX — utilisable hors connexion dans n'importe quel traceur
   ———————————————————————————————————————————————— */

export function buildGpx({ name = 'Itinéraire PlanTrip', points = [], route = null }) {
  const coords = route?.coordinates?.length
    ? route.coordinates.map(([lon, lat]) => ({ lat, lon }))
    : points

  const trkpts = coords
    .map((p) => `      <trkpt lat="${p.lat}" lon="${p.lon}"></trkpt>`)
    .join('\n')

  const wpts = points
    .map((p, i) =>
      `    <wpt lat="${p.lat}" lon="${p.lon}">\n      <name>${escapeXml(p.name || `Point ${i + 1}`)}</name>\n    </wpt>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="PlanTrip" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(name)}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
${wpts}
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>
`
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function downloadFile(filename, content, type = 'application/gpx+xml') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
