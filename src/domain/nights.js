/**
 * Répartition des nuits d'un voyage entre les étapes en route et la destination, puis chiffrage :
 * une nuit en route se paie au tarif du lieu de l'étape, une nuit sur place au tarif de la destination.
 * Un prix saisi par le voyageur remplace tous les tarifs. Fonctions pures.
 */

/** Interpolation entre bas et haut d'une fourchette selon le confort (0 = bas, 1 = haut). Non arrondie. */
export function interpolate(low, high, confort = 0.5) {
  const c = Number.isFinite(Number(confort)) ? Math.min(1, Math.max(0, Number(confort))) : 0.5
  return Number(low) + (Number(high) - Number(low)) * c
}

/**
 * @param {{nights:number, stopCount:number, roundTrip?:boolean}} p
 * @returns {{road:number[], destination:number}} `road` : indice d'étape de chaque nuit en route, dans l'ordre
 */
export function allocateNights({ nights, stopCount, roundTrip = false }) {
  const n = Math.max(0, Math.floor(Number(nights) || 0))
  const k = Math.max(0, Math.floor(Number(stopCount) || 0))
  const outbound = Array.from({ length: k }, (_, i) => i)
  const road = (roundTrip ? [...outbound, ...[...outbound].reverse()] : outbound).slice(0, n)
  return { road, destination: n - road.length }
}

/**
 * @param {object} p
 * @param {{road:number[], destination:number}} p.allocation
 * @param {Array<number|null>} p.stopNightly  prix par nuit relevé pour chaque étape (null = inconnu)
 * @param {number} p.destNightly              prix par nuit à la destination (relevé ou estimé)
 * @param {number|null} [p.userNightly]       prix saisi par le voyageur
 * @returns {{total:number, road:number[], destination:{count:number, nightly:number}, perStopKnown:boolean}}
 */
export function priceNights({ allocation, stopNightly = [], destNightly, userNightly = null }) {
  const fixed = userNightly != null ? Number(userNightly) : null
  const dest = fixed ?? (Number.isFinite(Number(destNightly)) ? Number(destNightly) : 0)
  const road = allocation.road.map((idx) => {
    if (fixed != null) return fixed
    const price = stopNightly[idx]
    return Number.isFinite(price) ? price : dest
  })
  const total = road.reduce((sum, p) => sum + p, 0) + dest * allocation.destination
  return {
    total: Math.round(total),
    road,
    destination: { count: allocation.destination, nightly: dest },
    perStopKnown: fixed == null && allocation.road.some((idx) => Number.isFinite(stopNightly[idx])),
  }
}
