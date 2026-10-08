/**
 * Tarifs d'hébergement relevés — API DATAtourisme (Licence Ouverte Etalab 2.0).
 * La clé (DATATOURISME_API_KEY) reste ici ; le navigateur ne l'a jamais.
 *
 * Les tarifs de DATAtourisme sont déclarés par les offices de tourisme et les hébergeurs : ils sont
 * hétérogènes (par chambre, par semaine, suppléments, anciennes périodes…). On n'en garde que des
 * prix « à partir de » par nuit, plausibles et en cours de validité, et on ne publie une fourchette
 * que si l'échantillon est assez large. Sinon : `available: false` et le client garde son estimation.
 */

const BASE_URL = 'https://api.datatourisme.fr/v1/catalog'
const CACHE_TTL_MS = 24 * 3600_000
const CACHE_MAX = 500
const UPSTREAM_TIMEOUT_MS = 20_000
export const MIN_SAMPLE = 5
const RADII_KM = [30, 60]

/** Type PlanTrip → type DATAtourisme et plage de prix plausible (€ par nuit). */
export const PRICE_TYPES = {
  hotel: { source: 'HotelTrade', range: [25, 600] },
  apartment: { source: 'RentalAccommodation', range: [25, 500] },
  camping: { source: 'CampingAndCaravanning', range: [6, 120] },
}

const EXCLUDED_TEXT =
  /caution|menage|supplement|petit.?dej|animal|chien|taxe|semaine|week|repas|buffet|diner|dejeuner|enfant|bebe|\d+\s*ans|maxi|linge|parking|garage|navette|spa\b|sauna|massage|arrhes|acompte|option/
const EXCLUDED_MODE = /week|month|animal|meal|breakfast|dinner|lunch|clean|deposit|hour|perperson/i

const normalize = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const first = (v) => (Array.isArray(v) ? v[0] : v)
const num = (v) => {
  const n = Number(first(v))
  return Number.isFinite(n) ? n : null
}
const fr = (v) => (v && typeof v === 'object' ? v['@fr'] || Object.values(v)[0] || '' : v || '')

function periodStillRelevant(spec, today) {
  const periods = Array.isArray(spec.appliesOnPeriod) ? spec.appliesOnPeriod : []
  if (!periods.length) return true
  return periods.some((p) => typeof p?.endDate === 'string' && p.endDate >= today)
}

/**
 * Prix « à partir de » par nuit d'un établissement, ou null si rien d'exploitable.
 * @param {Array} offers  champ `offers` DATAtourisme
 * @param {string} type   'hotel' | 'apartment' | 'camping'
 * @param {string} today  date ISO (AAAA-MM-JJ)
 */
export function extractNightlyPrice(offers, type, today) {
  const cfg = PRICE_TYPES[type]
  if (!cfg || !Array.isArray(offers)) return null
  const [lo, hi] = cfg.range
  const prices = []
  for (const offer of offers) {
    for (const spec of offer?.priceSpecification || []) {
      const min = num(spec.minPrice)
      if (min == null || min < lo || min > hi) continue
      if (spec.priceCurrency && spec.priceCurrency !== 'EUR') continue
      if (!periodStillRelevant(spec, today)) continue
      const text = normalize(`${fr(spec.name)} ${fr(first(spec.additionalInformation))}`)
      if (EXCLUDED_TEXT.test(text)) continue
      const modes = (spec.hasPricingMode || []).map((m) => m?.key || '').join(' ')
      if (EXCLUDED_MODE.test(modes)) continue
      prices.push(min)
    }
  }
  return prices.length ? Math.min(...prices) : null
}

function quantile(sorted, q) {
  if (!sorted.length) return null
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  const next = sorted[base + 1] ?? sorted[base]
  return sorted[base] + (next - sorted[base]) * rest
}

/** Résumé d'un échantillon de prix : fourchette interquartile et médiane, arrondies à l'euro. */
export function summarizePrices(prices, minSample = MIN_SAMPLE) {
  const sorted = prices.filter((p) => Number.isFinite(p)).sort((a, b) => a - b)
  if (sorted.length < minSample) return null
  return {
    n: sorted.length,
    low: Math.round(quantile(sorted, 0.25)),
    median: Math.round(quantile(sorted, 0.5)),
    high: Math.round(quantile(sorted, 0.75)),
  }
}

export function validateQuery(query) {
  const lat = Number(query?.lat)
  const lon = Number(query?.lon)
  const type = String(query?.type || '')
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    return { error: 'Coordonnées invalides.' }
  }
  if (!PRICE_TYPES[type]) return { error: 'Type d’hébergement inconnu.' }
  // Maille de ~11 km : même réponse pour des points voisins, donc un cache efficace.
  return { lat: Math.round(lat * 10) / 10, lon: Math.round(lon * 10) / 10, type }
}

export function createLodgingPriceService({ config, fetchImpl = fetch, now = () => new Date() }) {
  const cache = new Map()
  const log = config.logger || console

  function remember(key, value) {
    cache.set(key, { value, at: Date.now() })
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value)
  }

  async function fetchPage(q, radiusKm, withPriceFilter) {
    const params = new URLSearchParams({
      filters: withPriceFilter
        ? `type=${PRICE_TYPES[q.type].source} AND offers.priceSpecification.minPrice[gte]=1`
        : `type=${PRICE_TYPES[q.type].source}`,
      geo_distance: `${q.lat},${q.lon},${radiusKm}km`,
      page_size: '100',
      lang: 'fr',
      fields: 'uuid,label,offers,lastUpdate',
    })
    const res = await fetchImpl(`${BASE_URL}?${params}`, {
      headers: { 'X-API-Key': config.datatourismeApiKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
    return res
  }

  /** Une requête : avec le filtre « a un tarif » ; si l'API le refuse (400), sans filtre. */
  async function fetchObjects(q, radiusKm) {
    for (const withFilter of [true, false]) {
      const res = await fetchPage(q, radiusKm, withFilter)
      if (res.ok) {
        const json = await res.json()
        return { status: 200, objects: Array.isArray(json?.objects) ? json.objects : [] }
      }
      let detail = ''
      try {
        detail = (await res.text()).slice(0, 300)
      } catch {
        detail = '(corps illisible)'
      }
      log.warn(`[plantrip-prices] DATAtourisme ${res.status} type=${q.type} filtre=${withFilter} : ${detail}`)
      if (res.status !== 400 && res.status !== 422) return { status: res.status, objects: [] }
    }
    return { status: 400, objects: [] }
  }

  /**
   * @returns {Promise<{status:number, payload:object}>}
   */
  async function compute(query, { allowUpstream } = {}) {
    if (!config.datatourismeApiKey) {
      return { status: 503, payload: { error: 'prices_unavailable', message: 'Service de tarifs non configuré.' } }
    }
    const q = validateQuery(query)
    if (q.error) return { status: 400, payload: { error: 'bad_request', message: q.error } }

    const key = `${q.type}|${q.lat}|${q.lon}`
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { status: 200, payload: hit.value }

    if (allowUpstream && !allowUpstream()) {
      return { status: 429, payload: { error: 'too_many_requests', message: 'Trop de demandes de tarifs, réessayez dans quelques minutes.' } }
    }

    const today = now().toISOString().slice(0, 10)
    let summary = null
    let radiusKm = null
    let newest = ''
    try {
      for (const km of RADII_KM) {
        const { status, objects } = await fetchObjects(q, km)
        if (status === 429) return { status: 429, payload: { error: 'upstream_quota', message: 'Quota du service de tarifs atteint.' } }
        if (status === 401 || status === 403) {
          return { status: 503, payload: { error: 'upstream_forbidden', message: 'Accès au service de tarifs refusé.' } }
        }
        if (status !== 200) return { status: 502, payload: { error: 'upstream_error', message: 'Le service de tarifs a échoué.' } }
        const prices = []
        for (const o of objects) {
          const price = extractNightlyPrice(o.offers, q.type, today)
          if (price == null) continue
          prices.push(price)
          const updated = typeof first(o.lastUpdate) === 'string' ? first(o.lastUpdate).slice(0, 10) : ''
          if (updated > newest) newest = updated
        }
        summary = summarizePrices(prices)
        if (summary) {
          radiusKm = km
          break
        }
      }
    } catch (err) {
      log.warn(`[plantrip-prices] DATAtourisme injoignable (${err?.name || 'erreur'} : ${err?.message || ''})`)
      return { status: 502, payload: { error: 'upstream_unreachable', message: 'Service de tarifs injoignable.' } }
    }

    const payload = summary
      ? { available: true, type: q.type, ...summary, radiusKm, updatedAt: newest || null, source: 'DATAtourisme' }
      : { available: false, type: q.type }
    remember(key, payload)
    return { status: 200, payload }
  }

  return { compute }
}
