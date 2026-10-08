/**
 * Tarifs d'hébergement relevés (DATAtourisme), via le serveur PlanTrip : la clé reste côté serveur.
 * Tout échec (serveur absent, clé non configurée, échantillon trop petit) renvoie `null` :
 * l'appelant garde alors son estimation, sans message d'erreur.
 */

/** Types d'hébergement pour lesquels des tarifs peuvent être relevés. */
export const PRICED_TYPES = ['hotel', 'apartment', 'camping']

const memo = new Map()

export function priceKey(lat, lon, type) {
  return `${type}|${(Math.round(Number(lat) * 10) / 10).toFixed(1)}|${(Math.round(Number(lon) * 10) / 10).toFixed(1)}`
}

/**
 * @returns {Promise<null | {n:number, low:number, median:number, high:number, radiusKm:number, updatedAt:string|null, source:string}>}
 */
export function fetchLodgingPrices({ lat, lon, type }) {
  if (!PRICED_TYPES.includes(type) || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) {
    return Promise.resolve(null)
  }
  const key = priceKey(lat, lon, type)
  if (memo.has(key)) return memo.get(key)
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon), type })
  const promise = fetch(`/api/lodging-prices?${params}`, { headers: { Accept: 'application/json' } })
    .then((res) => (res.ok ? res.json() : null))
    .then((json) => (json && json.available ? json : null))
    .catch(() => null)
  memo.set(key, promise)
  return promise
}

/** Réservé aux tests. */
export function resetLodgingPriceCache() {
  memo.clear()
}

/** Prix par nuit déduit d'une fourchette relevée selon le curseur de confort (0 = bas, 1 = haut). */
export function priceFromObserved(observed, confort = 0.5) {
  if (!observed) return null
  const c = Number.isFinite(Number(confort)) ? Math.min(1, Math.max(0, Number(confort))) : 0.5
  return Math.round(observed.low + (observed.high - observed.low) * c)
}

export function formatObservedRange(observed) {
  if (!observed) return ''
  return observed.low === observed.high ? `${observed.low} €` : `${observed.low}–${observed.high} €`
}
