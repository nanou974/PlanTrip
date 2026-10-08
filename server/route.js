/**
 * Calcul d'itinéraire côté serveur — OpenRouteService.
 * La clé API reste ici (variable ORS_API_KEY) ; le navigateur ne l'a jamais.
 * Le profil et les contraintes dépendent du véhicule : le client n'envoie que
 * son identifiant, pas de paramètres libres.
 */

const MAX_POINTS = 50
const CACHE_TTL_MS = 24 * 3600_000
const CACHE_MAX = 300
const UPSTREAM_TIMEOUT_MS = 25_000
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Profil ORS et contraintes par véhicule. Gabarits repris de src/data/vehicles.json
 * (hauteur max / poids max des fiches) ; tout véhicule inconnu est traité comme une voiture.
 */
export const VEHICLE_ROUTING = {
  voiture: { profile: 'driving-car' },
  moto: { profile: 'driving-car' },
  // `minAvgKph` : ORS calcule des durées de voiture ; ce véhicule ne peut pas aller plus vite que sa vitesse moyenne réelle.
  'voiture-sans-permis': { profile: 'driving-car', forceAvoid: ['highways'], minAvgKph: 42 },
  velo: { profile: 'cycling-regular' },
  'camping-car': { profile: 'driving-hgv', restrictions: { height: 3.2, weight: 3.5 } },
  van: { profile: 'driving-hgv', restrictions: { height: 2.5, weight: 3.5 } },
}

export function routingFor(vehicle) {
  return VEHICLE_ROUTING[vehicle] || VEHICLE_ROUTING.voiture
}

const inRange = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max

/** Valide le corps `{ vehicle, points, avoidTolls, avoidHighways, heightM?, weightT? }` ; renvoie la requête ORS ou une erreur. */
export function buildOrsRequest(body) {
  const points = body?.points
  if (!Array.isArray(points) || points.length < 2 || points.length > MAX_POINTS) {
    return { error: `Entre 2 et ${MAX_POINTS} points sont attendus.` }
  }
  const coordinates = []
  for (const p of points) {
    if (!p || !inRange(p.lat, -90, 90) || !inRange(p.lon, -180, 180)) return { error: 'Coordonnées invalides.' }
    coordinates.push([Number(p.lon.toFixed(6)), Number(p.lat.toFixed(6))])
  }

  const cfg = routingFor(typeof body.vehicle === 'string' ? body.vehicle : 'voiture')
  const avoid = new Set(cfg.forceAvoid || [])
  const supportsAvoid = cfg.profile.startsWith('driving-')
  if (supportsAvoid) {
    if (body.avoidTolls === true) avoid.add('tollways')
    if (body.avoidHighways === true) avoid.add('highways')
  } else {
    avoid.clear()
  }

  const options = {}
  if (avoid.size) options.avoid_features = [...avoid]
  if (cfg.restrictions) {
    // Gabarit saisi par l'utilisateur (hauteur en m, poids en t), borné ; sinon valeurs par défaut du véhicule.
    const height = inRange(body.heightM, 1, 4.5) ? body.heightM : cfg.restrictions.height
    const weight = inRange(body.weightT, 0.5, 44) ? body.weightT : cfg.restrictions.weight
    options.profile_params = { restrictions: { ...cfg.restrictions, height, weight } }
  }

  const request = { coordinates, instructions: true, language: 'fr', ...(Object.keys(options).length ? { options } : {}) }
  return { profile: cfg.profile, request }
}

/** Convertit la réponse GeoJSON d'ORS vers la forme utilisée par le client. */
export function parseOrsResponse(json) {
  const feature = json?.features?.[0]
  const summary = feature?.properties?.summary
  const coordinates = feature?.geometry?.coordinates
  if (!summary || !Array.isArray(coordinates) || coordinates.length < 2) return null
  const steps = []
  for (const segment of feature.properties.segments || []) {
    for (const s of segment.steps || []) {
      if (!s.instruction) continue
      steps.push({ name: s.name && s.name !== '-' ? s.name : '', distance: s.distance, duration: s.duration, instruction: s.instruction })
    }
  }
  return {
    distance: summary.distance,
    duration: summary.duration,
    coordinates: coordinates.map((c) => [c[0], c[1]]),
    steps,
  }
}

export function createRouteService({ config, fetchImpl = fetch }) {
  const cache = new Map()
  const log = config.logger || console

  /** Journal serveur d'un refus d'ORS : statut, profil, options et message — jamais la clé ni les coordonnées. */
  async function logUpstreamFailure(res, built) {
    let detail = ''
    try {
      detail = (await res.clone().text()).slice(0, 400)
    } catch {
      detail = '(corps illisible)'
    }
    const options = JSON.stringify(built.request.options || {})
    log.warn(`[plantrip-route] ORS ${res.status} profil=${built.profile} options=${options} : ${detail}`)
  }

  function remember(key, value) {
    cache.set(key, { value, at: Date.now() })
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value)
  }

  /**
   * `allowUpstream` : appelé seulement quand ORS doit être interrogé (cache raté) ;
   * renvoie false pour refuser (limite par adresse). Les réponses en cache ne comptent donc pas.
   * @returns {Promise<{status:number, payload:object}>}
   */
  async function compute(body, { allowUpstream } = {}) {
    if (!config.orsApiKey) {
      return { status: 503, payload: { error: 'routing_unavailable', message: 'Service d’itinéraire non configuré.' } }
    }
    const built = buildOrsRequest(body)
    if (built.error) return { status: 400, payload: { error: 'bad_request', message: built.error } }

    const key = `${built.profile}|${JSON.stringify(built.request)}`
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { status: 200, payload: hit.value }

    if (allowUpstream && !allowUpstream()) {
      log.warn('[plantrip-route] limite de calculs par adresse atteinte')
      return { status: 429, payload: { error: 'too_many_requests', message: 'Trop de calculs d’itinéraire, réessayez dans quelques minutes.' } }
    }

    // Un seul nouvel essai si ORS est injoignable ou répond 5xx (service parfois saturé).
    let res = null
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        res = await fetchImpl(`${config.orsBaseUrl}/v2/directions/${built.profile}/geojson`, {
          method: 'POST',
          headers: { Authorization: config.orsApiKey, 'Content-Type': 'application/json', Accept: 'application/geo+json' },
          body: JSON.stringify(built.request),
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        })
      } catch (err) {
        res = null
        log.warn(`[plantrip-route] ORS injoignable (${err?.name || 'erreur'} : ${err?.message || ''}) profil=${built.profile}, essai ${attempt + 1}/2`)
      }
      if (res && res.status < 500) break
      if (attempt === 0) await sleep(config.orsRetryDelayMs ?? 800)
    }
    if (!res) {
      return { status: 502, payload: { error: 'upstream_unreachable', message: 'Service d’itinéraire injoignable.' } }
    }

    if (!res.ok) await logUpstreamFailure(res, built)

    if (res.status === 403) return { status: 503, payload: { error: 'upstream_forbidden', message: 'Accès au service d’itinéraire refusé (quota journalier atteint ou clé invalide).' } }
    if (res.status === 429) return { status: 429, payload: { error: 'upstream_quota', message: 'Quota du service d’itinéraire atteint.' } }
    if (res.status === 400 || res.status === 404) {
      // Point hors route, trajet trop long, gabarit incompatible… : pas d'itinéraire possible.
      return { status: 422, payload: { error: 'no_route', message: 'Aucun itinéraire trouvé pour ces points et ce véhicule.' } }
    }
    if (!res.ok) return { status: 502, payload: { error: 'upstream_error', message: 'Le service d’itinéraire a échoué.' } }

    let json
    try {
      json = await res.json()
    } catch {
      return { status: 502, payload: { error: 'upstream_error', message: 'Réponse du service d’itinéraire illisible.' } }
    }
    const parsed = parseOrsResponse(json)
    if (!parsed) return { status: 422, payload: { error: 'no_route', message: 'Aucun itinéraire trouvé.' } }

    const cfg = routingFor(typeof body.vehicle === 'string' ? body.vehicle : 'voiture')
    if (cfg.minAvgKph) {
      parsed.duration = Math.max(parsed.duration, Math.round(parsed.distance / (cfg.minAvgKph / 3.6)))
    }
    const payload = { ...parsed, provider: 'openrouteservice', profile: built.profile }
    remember(key, payload)
    return { status: 200, payload }
  }

  return { compute }
}
