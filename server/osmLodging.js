/**
 * Hébergements OpenStreetMap le long d'un trajet (aires de camping-car, campings, hôtels...).
 *
 * Le navigateur n'interroge plus les serveurs Overpass publics lui-même : ils sont partagés, souvent
 * saturés, et leur règle d'usage demande un client identifié et peu de requêtes. Ce service :
 *  - découpe le couloir du trajet en tuiles de 0,5° et interroge Overpass tuile par tuile ;
 *  - garde chaque tuile en cache plusieurs jours (deux trajets proches partagent leurs tuiles) ;
 *  - s'identifie (User-Agent), limite sa concurrence et ne garde que des étiquettes utiles.
 * Données © contributeurs OpenStreetMap, licence ODbL.
 */
import { pickTags } from '../src/domain/osmTags.js'

export const TILE_DEG = 0.5
export const MAX_TILES = 40
const MAX_POLYLINE_POINTS = 400
const CACHE_TTL_MS = 3 * 24 * 3600_000
const CACHE_MAX = 300
const UPSTREAM_TIMEOUT_MS = 12_000
/** Un serveur Overpass en échec est écarté ce temps-là (sauf s'il n'en reste aucun). */
const COOLDOWN_MS = 45_000
/** Au-delà, on répond avec ce qui est déjà chargé ; les tuiles restantes continuent de remplir le cache. */
export const DEADLINE_MS = 20_000
const CONCURRENCY = 2
const ELEMENT_CAP = 3000
const USER_AGENT = 'PlanTrip/1.0 (+https://plantrip.fr)'
export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
/**
 * Types servis : ceux des véhicules qui en ont besoin (camping-car, van). Les hôtels et gîtes se comptent par
 * milliers dans une tuile de 0,5° : leurs requêtes seraient trop lentes, ils restent cherchés le long du trajet.
 */
export const OSM_TYPES = { aire: 'caravan_site', camping: 'camp_site' }
const DEFAULT_TYPES = ['aire', 'camping']

const tileIndex = (v) => Math.floor(v / TILE_DEG)
export const tileKey = (latIdx, lonIdx) => `${latIdx}:${lonIdx}`

/** Vérifie et normalise la requête : { polyline: [[lon, lat], ...], radiusMeters }. */
export function validateRequest(body) {
  const raw = body?.polyline
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > MAX_POLYLINE_POINTS) {
    return { error: 'Tracé invalide.' }
  }
  const polyline = []
  for (const p of raw) {
    const lon = Number(p?.[0])
    const lat = Number(p?.[1])
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return { error: 'Tracé invalide.' }
    }
    polyline.push([lon, lat])
  }
  const wanted = body?.types === undefined ? DEFAULT_TYPES : body.types
  if (!Array.isArray(wanted) || !wanted.length || wanted.some((x) => !Object.hasOwn(OSM_TYPES, x))) {
    return { error: "Types d'hébergement non pris en charge." }
  }
  const types = [...new Set(wanted)].sort()
  const radius = Number(body?.radiusMeters)
  const radiusMeters = Number.isFinite(radius) ? Math.min(8000, Math.max(1000, Math.round(radius))) : 5000
  return { polyline, radiusMeters, types }
}

/** Tuiles (clé -> bornes) traversées par le couloir du trajet. */
export function tilesFor(polyline, radiusMeters, types = DEFAULT_TYPES) {
  const padLat = radiusMeters / 111_000
  const tiles = new Map()
  const add = (lat, lon) => {
    const padLon = padLat / Math.max(0.2, Math.cos((lat * Math.PI) / 180))
    for (let a = tileIndex(lat - padLat); a <= tileIndex(lat + padLat); a += 1) {
      for (let b = tileIndex(lon - padLon); b <= tileIndex(lon + padLon); b += 1) {
        const key = `${tileKey(a, b)}|${types.join('+')}`
        if (!tiles.has(key)) {
          tiles.set(key, { key, types, south: a * TILE_DEG, west: b * TILE_DEG, north: (a + 1) * TILE_DEG, east: (b + 1) * TILE_DEG })
        }
      }
    }
  }
  for (let i = 0; i < polyline.length; i += 1) {
    const [lon, lat] = polyline[i]
    add(lat, lon)
    const next = polyline[i + 1]
    if (!next) continue
    // Un segment long ne doit pas « sauter » une tuile : on le subdivise.
    const steps = Math.ceil(Math.max(Math.abs(next[1] - lat), Math.abs(next[0] - lon)) / (TILE_DEG / 2))
    for (let s = 1; s < steps; s += 1) add(lat + ((next[1] - lat) * s) / steps, lon + ((next[0] - lon) * s) / steps)
  }
  return [...tiles.values()]
}

function slim(elements) {
  const out = []
  for (const el of elements || []) {
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !el.tags) continue
    out.push({ type: el.type, id: el.id, lat, lon, tags: pickTags(el.tags) })
  }
  return out
}

export function createOsmLodgingService({ config = {}, fetchImpl = fetch, endpoints = OVERPASS_ENDPOINTS, deadlineMs = DEADLINE_MS } = {}) {
  const cache = new Map()
  const coolingUntil = new Map()
  const inflight = new Map()
  const log = config.logger || console

  function remember(key, elements) {
    cache.set(key, { elements, at: Date.now() })
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value)
  }

  async function queryTile(tile) {
    const bbox = `(${tile.south},${tile.west},${tile.north},${tile.east})`
    const osmTypes = tile.types.map((x) => OSM_TYPES[x]).join('|')
    const query = `[out:json][timeout:25];nwr["tourism"~"^(${osmTypes})$"]${bbox};out center tags ${ELEMENT_CAP};`
    const usable = endpoints.filter((u) => (coolingUntil.get(u) || 0) <= Date.now())
    for (const url of usable.length ? usable : endpoints) {
      try {
        const res = await fetchImpl(url, {
          method: 'POST',
          headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        })
        if (res.ok) {
          const json = await res.json()
          if (Array.isArray(json?.elements)) return slim(json.elements)
        } else {
          log.warn(`[plantrip-osm] Overpass ${res.status} (${new URL(url).host}) tuile ${tile.key}`)
          coolingUntil.set(url, Date.now() + COOLDOWN_MS)
        }
      } catch (err) {
        log.warn(`[plantrip-osm] Overpass injoignable (${new URL(url).host} : ${err?.name || 'erreur'}) tuile ${tile.key}`)
        coolingUntil.set(url, Date.now() + COOLDOWN_MS)
      }
    }
    return null
  }

  /** Une tuile : cache, sinon requête partagée entre les appels simultanés. */
  function loadTile(tile) {
    const hit = cache.get(tile.key)
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return Promise.resolve(hit.elements)
    if (inflight.has(tile.key)) return inflight.get(tile.key)
    const job = queryTile(tile)
      .then((elements) => {
        if (elements) remember(tile.key, elements)
        return elements
      })
      .finally(() => inflight.delete(tile.key))
    inflight.set(tile.key, job)
    return job
  }

  /**
   * @returns {Promise<{status:number, payload:object}>}
   * `allowUpstream` n'est appelé que si au moins une tuile manque au cache.
   */
  async function compute(body, { allowUpstream } = {}) {
    const q = validateRequest(body)
    if (q.error) return { status: 400, payload: { error: 'bad_request', message: q.error } }
    const tiles = tilesFor(q.polyline, q.radiusMeters, q.types)
    if (tiles.length > MAX_TILES) {
      return { status: 422, payload: { error: 'route_too_long', message: 'Trajet trop long pour cette recherche.' } }
    }

    const missing = tiles.filter((t) => {
      const hit = cache.get(t.key)
      return !(hit && Date.now() - hit.at < CACHE_TTL_MS)
    })
    if (missing.length && allowUpstream && !allowUpstream()) {
      return { status: 429, payload: { error: 'too_many_requests', message: 'Trop de recherches, réessayez dans quelques minutes.' } }
    }

    const results = new Array(tiles.length).fill(undefined)
    let next = 0
    const worker = async () => {
      while (next < tiles.length) {
        const i = next
        next += 1
        results[i] = await loadTile(tiles[i])
      }
    }
    const all = Promise.all(Array.from({ length: Math.min(CONCURRENCY, tiles.length) }, worker))
    let timer
    const deadline = new Promise((resolve) => {
      timer = setTimeout(resolve, deadlineMs)
    })
    await Promise.race([all, deadline])
    clearTimeout(timer)

    // `undefined` = tuile encore en cours à l'échéance ; `null` = échec. Les deux rendent le résultat partiel.
    const failed = results.filter((r) => !r).length
    if (failed === tiles.length) {
      return { status: 502, payload: { error: 'upstream_unreachable', message: 'Service de recherche indisponible.' } }
    }
    const seen = new Set()
    const elements = []
    for (const list of results) {
      for (const el of list || []) {
        const key = `${el.type}-${el.id}`
        if (seen.has(key)) continue
        seen.add(key)
        elements.push(el)
      }
    }
    return { status: 200, payload: { elements, partial: failed > 0, tiles: tiles.length, source: 'OpenStreetMap' } }
  }

  return { compute }
}