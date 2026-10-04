/**
 * Géocodage — Photon (OpenStreetMap), sans clé.
 * Toutes les fonctions sont asynchrones et échouent proprement.
 */

const ENDPOINT = 'https://photon.komoot.io/api/'
const HOME = { lon: 2.3522, lat: 48.8566 }

export class GeocodingError extends Error {
  constructor(message, cause) {
    super(message)
    this.name = 'GeocodingError'
    this.cause = cause
  }
}

function normalize(feature) {
  const p = feature?.properties || {}
  const coords = feature?.geometry?.coordinates || []
  const name = [p.name, p.street].filter(Boolean).join(', ') || p.city || p.name || ''
  if (!name) return null
  const locality = [p.city, p.state].filter(Boolean).join(', ')
  return {
    id: p.osm_id ? `${p.osm_type || 'node'}/${p.osm_id}` : `${coords[1]},${coords[0]}`,
    name: [name, locality].filter((v, i, a) => v && a.indexOf(v) === i).join(', '),
    short: name,
    city: p.city || p.name || '',
    country: p.country || '',
    context: [p.city, p.country].filter(Boolean).join(', '),
    lat: Number(coords[1]),
    lon: Number(coords[0]),
  }
}

/**
 * @param {string} query
 * @param {{limit?:number, signal?:AbortSignal, bias?:{lat:number,lon:number}}} [options]
 * @returns {Promise<Array<{id:string,name:string,lat:number,lon:number}>>}
 */
export async function searchPlaces(query, { limit = 8, signal, bias = HOME } = {}) {
  const q = String(query || '').trim()
  if (q.length < 2) return []

  const params = new URLSearchParams({
    q,
    lang: 'fr',
    limit: String(limit),
    lon: String(bias?.lon ?? HOME.lon),
    lat: String(bias?.lat ?? HOME.lat),
  })
  for (const tag of ['place:city', 'place:town', 'place:village', 'place:suburb', 'place:hamlet']) {
    params.append('osm_tag', tag)
  }

  let res
  try {
    res = await fetch(`${ENDPOINT}?${params}`, { signal })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new GeocodingError('Réseau indisponible pour la recherche de ville', err)
  }
  if (!res.ok) throw new GeocodingError(`Photon a répondu ${res.status}`)

  const json = await res.json()
  const seen = new Set()
  return (json.features || [])
    .map(normalize)
    .filter(Boolean)
    .filter((p) => {
      const key = `${p.city}|${p.lat.toFixed(3)}|${p.lon.toFixed(3)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

/** Récupère l'intitulé d'un point (usage : renseigner un départ sans le chercher). */
export async function reversePlace(lat, lon, { signal } = {}) {
  const params = new URLSearchParams({ lang: 'fr', reverse: 'true', lat: String(lat), lon: String(lon) })
  const res = await fetch(`${ENDPOINT}?${params}`, { signal })
  if (!res.ok) throw new GeocodingError(`Photon a répondu ${res.status}`)
  const json = await res.json()
  return normalize(json.features?.[0]) || null
}

export function formatPlace(place) {
  return place?.name || ''
}
