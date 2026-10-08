/**
 * Conduite — découpage d'un trajet en journées, étapes de nuit et pauses.
 *
 * Règles de PlanTrip :
 * - une journée de conduite dure au moins 3 h et au plus 6 h (sauf un trajet court, fait en une fois) ;
 * - la préférence « durée de conduite » choisit la cible dans cette plage ;
 * - pause recommandée : 15 à 20 minutes au moins toutes les 2 h (Prévention Routière).
 *
 * Fonctions pures : aucune dépendance au réseau ni à React.
 */
import { haversine } from './itinerary.js'

export const MIN_DAY_SEC = 3 * 3600
export const MAX_DAY_SEC = 6 * 3600
export const BREAK_EVERY_SEC = 2 * 3600
export const BREAK_MIN_MINUTES = 15
export const BREAK_MAX_MINUTES = 20

/** Cible de conduite par jour selon la préférence du voyageur. */
export const DAY_TARGET_SEC = {
  short: MIN_DAY_SEC,
  balanced: 4.5 * 3600,
  long: MAX_DAY_SEC,
}

export function dayTargetSec(driveTime) {
  return DAY_TARGET_SEC[driveTime] ?? DAY_TARGET_SEC.balanced
}

/**
 * Nombre de journées de conduite pour une durée donnée.
 * Chaque journée reste dans [3 h ; 6 h] quand c'est possible ; en dessous de 3 h, une seule journée.
 */
export function drivingDaysFor(durationSec, driveTime = 'balanced') {
  const total = Number(durationSec)
  if (!Number.isFinite(total) || total <= 0) return 0
  const fewest = Math.max(1, Math.ceil(total / MAX_DAY_SEC))
  const most = Math.max(fewest, Math.floor(total / MIN_DAY_SEC))
  const wanted = Math.round(total / dayTargetSec(driveTime))
  return Math.min(most, Math.max(fewest, wanted))
}

/** Pauses conseillées pour une durée de conduite continue. */
export function breaksFor(driveSec) {
  const sec = Number(driveSec)
  if (!Number.isFinite(sec) || sec <= 0) return { count: 0, minMinutes: 0, maxMinutes: 0 }
  const count = Math.max(0, Math.ceil(sec / BREAK_EVERY_SEC) - 1)
  return { count, minMinutes: count * BREAK_MIN_MINUTES, maxMinutes: count * BREAK_MAX_MINUTES }
}

/** Point situé à `fraction` (0–1) du tracé, mesurée en distance. `coordinates` : [lon, lat]. */
export function pointAtFraction(coordinates, fraction) {
  const pts = (coordinates || []).filter((c) => Array.isArray(c) && Number.isFinite(c[0]) && Number.isFinite(c[1]))
  if (pts.length < 2) return null
  const f = Math.min(1, Math.max(0, fraction))
  const lengths = [0]
  for (let i = 1; i < pts.length; i += 1) {
    lengths.push(lengths[i - 1] + haversine({ lat: pts[i - 1][1], lon: pts[i - 1][0] }, { lat: pts[i][1], lon: pts[i][0] }))
  }
  const total = lengths[lengths.length - 1]
  if (total <= 0) return { lat: pts[0][1], lon: pts[0][0] }
  const target = total * f
  let i = 1
  while (i < lengths.length - 1 && lengths[i] < target) i += 1
  const span = lengths[i] - lengths[i - 1] || 1
  const t = Math.min(1, Math.max(0, (target - lengths[i - 1]) / span))
  return {
    lat: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t,
    lon: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
  }
}

/**
 * @param {object} p
 * @param {number} p.durationSec     durée totale de conduite du tracé (aller-retour compris le cas échéant)
 * @param {string} [p.driveTime]     'short' | 'balanced' | 'long'
 * @param {boolean} [p.roundTrip]    le tracé contient l'aller et le retour
 * @param {number} [p.nights]        nuits prévues par les dates du voyage
 * @param {number[][]} [p.coordinates] tracé [lon, lat] (sert à situer les étapes)
 * @returns {null | {
 *   legSec:number, days:number, perDaySec:number, breaks:object, stops:Array,
 *   roadNights:number, nightsAtDestination:number, tooShort:boolean, neededNights:number
 * }}
 */
export function planDriving({ durationSec, driveTime = 'balanced', roundTrip = false, nights = 0, coordinates = [] }) {
  const total = Number(durationSec)
  if (!Number.isFinite(total) || total <= 0) return null
  const legSec = roundTrip ? total / 2 : total
  const days = drivingDaysFor(legSec, driveTime)
  const perDaySec = legSec / days
  const roadNightsPerLeg = Math.max(0, days - 1)
  const roadNights = roadNightsPerLeg * (roundTrip ? 2 : 1)
  const availableNights = Math.max(0, Number(nights) || 0)

  // Sur un aller-retour, seul l'aller est situé (le retour suit la même logique).
  const outbound = roundTrip ? 0.5 : 1
  const stops = []
  for (let i = 1; i <= roadNightsPerLeg; i += 1) {
    const point = pointAtFraction(coordinates, (i / days) * outbound)
    stops.push({ night: i, afterSec: Math.round(perDaySec * i), ...(point || {}) })
  }

  return {
    legSec: Math.round(legSec),
    days,
    perDaySec: Math.round(perDaySec),
    breaks: breaksFor(perDaySec),
    stops,
    roadNights,
    nightsAtDestination: Math.max(0, availableNights - roadNights),
    neededNights: roadNights,
    tooShort: availableNights < roadNights,
  }
}

/** Rayon de recherche des hébergements autour d'une étape de nuit. */
export const STOP_RADIUS_KM = 25

/** Hébergements (déjà filtrés selon le véhicule) proches d'un point, du plus proche au plus éloigné. */
export function lodgingNear(stop, accommodations = [], radiusKm = STOP_RADIUS_KM) {
  if (!Number.isFinite(stop?.lat) || !Number.isFinite(stop?.lon)) return []
  return accommodations
    .map((a) => ({ ...a, fromStopKm: haversine(stop, a) / 1000 }))
    .filter((a) => a.fromStopKm <= radiusKm)
    .sort((a, b) => a.fromStopKm - b.fromStopKm)
}
