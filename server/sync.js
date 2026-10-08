/**
 * Synchronisation des voyages et partage en lecture seule : règles pures (aucun accès réseau ni base).
 */

export const MAX_TRIPS = 50
export const MAX_TRIP_BYTES = 256 * 1024
export const MAX_SYNC_BODY = 1024 * 1024
/** Un espace anonyme sans aucune synchronisation depuis ce délai est supprimé. */
export const SPACE_IDLE_MS = 365 * 86_400_000
/** Une suppression est conservée ce temps pour atteindre les autres appareils. */
export const TOMBSTONE_TTL_MS = 90 * 86_400_000

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/
const DAY_MS = 86_400_000

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Valide un lot envoyé par un appareil.
 * @returns {{ok:true, items:Array}|{ok:false, code:string, message:string}}
 */
export function validateIncoming(raw, now = Date.now()) {
  if (raw === undefined) return { ok: true, items: [] }
  if (!Array.isArray(raw)) return { ok: false, code: 'invalid_trips', message: 'Liste de voyages invalide' }
  if (raw.length > MAX_TRIPS) return { ok: false, code: 'too_many_trips', message: `Au plus ${MAX_TRIPS} voyages par envoi` }
  const items = []
  const seen = new Set()
  for (const entry of raw) {
    if (!isPlainObject(entry)) return { ok: false, code: 'invalid_trips', message: 'Voyage invalide' }
    const id = String(entry.id ?? '')
    if (!ID_RE.test(id) || seen.has(id)) return { ok: false, code: 'invalid_trip_id', message: 'Identifiant de voyage invalide' }
    seen.add(id)
    const updatedAt = Number(entry.updatedAt)
    if (!Number.isFinite(updatedAt) || updatedAt <= 0 || updatedAt > now + DAY_MS) {
      return { ok: false, code: 'invalid_date', message: 'Date de modification invalide' }
    }
    if (entry.deleted === true) {
      items.push({ id, updatedAt: Math.round(updatedAt), deleted: true, data: null })
      continue
    }
    if (!isPlainObject(entry.data)) return { ok: false, code: 'invalid_trips', message: 'Contenu de voyage manquant' }
    const data = { ...entry.data, id }
    if (Buffer.byteLength(JSON.stringify(data), 'utf8') > MAX_TRIP_BYTES) {
      return { ok: false, code: 'trip_too_large', message: 'Un voyage dépasse la taille autorisée' }
    }
    items.push({ id, updatedAt: Math.round(updatedAt), deleted: false, data })
  }
  return { ok: true, items }
}

/* ————————————————————————————————————————————————
   Partage : ce qui sort du serveur vers une personne sans compte
   ———————————————————————————————————————————————— */

const MASK_RADIUS_KM = 8

function num(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function round(value, digits) {
  const n = num(value)
  return n === null ? null : Number(n.toFixed(digits))
}

function km(a, b) {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

function publicPlace(p) {
  return {
    name: String(p?.name || '').slice(0, 160),
    lat: round(p?.lat, 5),
    lon: round(p?.lon, 5),
    country: String(p?.country || '').slice(0, 80),
    context: String(p?.context || '').slice(0, 160),
  }
}

/** Remplace une adresse précise par la commune : contexte, sinon les segments du nom sans chiffre. */
export function maskedDeparture(dep) {
  const context = String(dep?.context || '').trim()
  const segments = String(dep?.name || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && !/\d/.test(s))
  const label = (context || segments.slice(-2).join(', ') || 'Point de départ masqué').slice(0, 160)
  return {
    name: label,
    lat: round(dep?.lat, 1),
    lon: round(dep?.lon, 1),
    country: String(dep?.country || '').slice(0, 80),
    context: '',
  }
}

/** Retire les portions du tracé proches du départ (début et fin d'un aller-retour). */
export function trimPolylineAround(polyline, center, radiusKm = MASK_RADIUS_KM) {
  const pts = (Array.isArray(polyline) ? polyline : []).filter(
    (c) => Array.isArray(c) && Number.isFinite(Number(c[0])) && Number.isFinite(Number(c[1])),
  )
  if (!center || num(center.lat) === null || num(center.lon) === null) return []
  const c = { lat: Number(center.lat), lon: Number(center.lon) }
  const near = (p) => km(c, { lat: Number(p[1]), lon: Number(p[0]) }) <= radiusKm
  let start = 0
  while (start < pts.length && near(pts[start])) start += 1
  let end = pts.length
  while (end > start && near(pts[end - 1])) end -= 1
  return pts.slice(start, end).map((p) => [round(p[0], 5), round(p[1], 5)])
}

/** Un trajet très long garde au plus ce nombre de points : le partage n'a pas besoin de plus. */
const MAX_SHARED_POINTS = 4000

function thin(points, max = MAX_SHARED_POINTS) {
  if (points.length <= max) return points
  const step = points.length / max
  const out = []
  for (let i = 0; i < max; i += 1) out.push(points[Math.floor(i * step)])
  out.push(points[points.length - 1])
  return out
}

/**
 * Version publique d'un voyage : liste blanche de champs. Jamais de notes, de documents, de liste de
 * contrôle, de dépenses ni de lieux « adresse personnelle ». Le départ est masqué sauf demande contraire.
 */
export function sanitizeForShare(trip, { showDeparture = false } = {}) {
  const t = isPlainObject(trip) ? trip : {}
  const departure = showDeparture ? publicPlace(t.departure) : maskedDeparture(t.departure)
  const polylineSource = Array.isArray(t.itinerary?.polyline) ? t.itinerary.polyline : []
  const polyline = showDeparture
    ? polylineSource
        .filter((c) => Array.isArray(c) && Number.isFinite(Number(c[0])) && Number.isFinite(Number(c[1])))
        .map((c) => [round(c[0], 5), round(c[1], 5)])
    : trimPolylineAround(polylineSource, t.departure)
  const places = (Array.isArray(t.places) ? t.places : [])
    .filter((p) => isPlainObject(p) && p.kind !== 'address')
    .slice(0, 50)
    .map((p) => ({
      name: String(p.name || '').slice(0, 160),
      kind: String(p.kind || 'stop').slice(0, 20),
      lat: round(p.lat, 5),
      lon: round(p.lon, 5),
      day: num(p.day),
      order: num(p.order),
      context: String(p.context || '').slice(0, 160),
    }))
  return {
    name: String(t.name || 'Voyage').slice(0, 160),
    departure,
    destination: publicPlace(t.destination),
    returnTrip: Boolean(t.returnTrip),
    dates: {
      start: String(t.dates?.start || '').slice(0, 10),
      end: String(t.dates?.end || '').slice(0, 10),
      days: num(t.dates?.days),
      nights: num(t.dates?.nights),
    },
    travelers: num(t.travelers),
    vehicle: {
      slug: String(t.vehicle?.slug || '').slice(0, 40),
      model: String(t.vehicle?.model || '').slice(0, 80),
      heightM: num(t.vehicle?.heightM),
      weightT: num(t.vehicle?.weightT),
    },
    preferences: {
      avoidTolls: Boolean(t.preferences?.avoidTolls),
      avoidHighways: Boolean(t.preferences?.avoidHighways),
      driveTime: String(t.preferences?.driveTime || '').slice(0, 20),
    },
    budgetMax: num(t.budget?.max),
    itinerary: {
      distanceKm: num(t.itinerary?.distanceKm) ?? 0,
      durationSec: num(t.itinerary?.durationSec) ?? 0,
      polyline: thin(polyline),
    },
    places,
    departureHidden: !showDeparture,
  }
}
