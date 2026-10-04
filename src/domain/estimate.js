/**
 * Estimations de coûts — pures, déterministes, documentées.
 * Hypothèses tarifaires France (ordres de grandeur, ajustables) :
 *   essence 1,86 €/L · diesel 1,74 €/L · péage 0,075 €/km
 *   repas 41 €/pers/jour · nuitée 65 € · activité 15 €/pers/jour · parking 8 €/jour
 */

export const RATES = {
  fuelPricePerLiter: { essence: 1.86, diesel: 1.74, electrique: 0.35, aucune: 0 },
  tollPerKm: 0.075,
  mealPerDay: 41,
  activityPerDay: 15,
  parkingPerDay: 8,
  campingPerNight: 22,
}

export function fuelPriceFor(vehicle) {
  const key = vehicle?.fuel || 'essence'
  return RATES.fuelPricePerLiter[key] ?? 1.86
}

/**
 * @returns {{lines: Array<{id:string,label:string,category:string,amount:number,detail:string}>, totals:Record<string,number>, total:number}}
 */
export function estimateTripCosts({
  vehicle,
  distanceKm = 0,
  returnTrip = false,
  days = 1,
  nights = 0,
  travelers = 1,
  profile = {},
  avoidTolls = false,
  customConsumption = null,
  fuelPricePerLiter = null,
} = {}) {
  const lines = []
  const km = Math.max(0, Number(distanceKm) || 0) * (returnTrip ? 2 : 1)
  const nDays = Math.max(1, Number(days) || 1)
  const nNights = Math.max(0, Number(nights) || 0)
  const people = Math.max(1, Number(travelers) || 1)
  const confort = clamp01(profile.confort ?? 0.5)
  const decouverte = clamp01(profile.decouverte ?? 0.5)
  const nature = clamp01(profile.nature ?? 0.5)

  // — Carburant —
  const consumption = toNumber(customConsumption) ?? toNumber(vehicle?.defaultConsumption)
  if (consumption && km > 0) {
    const price =
      fuelPricePerLiter != null ? Number(fuelPricePerLiter) : fuelPriceFor(vehicle)
    const litres = (km * consumption) / 100
    lines.push({
      id: 'fuel',
      label: 'Carburant',
      category: 'transport',
      amount: round2(litres * price),
      detail: `${Math.round(litres)} L · ${consumption} L/100 km · ${round2(price)} €/L`,
    })
  }

  // — Péages —
  const tollable = !avoidTolls && vehicle?.category !== 'bike'
  if (tollable && km > 0) {
    lines.push({
      id: 'tolls',
      label: 'Péages',
      category: 'transport',
      amount: round2(km * RATES.tollPerKm),
      detail: `${Math.round(km)} km · 0,075 €/km`,
    })
  }

  // — Stationnement —
  if (vehicle?.category !== 'bike' && nDays > 0) {
    lines.push({
      id: 'parking',
      label: 'Stationnement',
      category: 'transport',
      amount: round2(nDays * RATES.parkingPerDay),
      detail: `${nDays} j · ${RATES.parkingPerDay} €/j`,
    })
  }

  // — Repas —
  const mealRate = round2(RATES.mealPerDay * (0.75 + confort * 0.5))
  lines.push({
    id: 'meals',
    label: 'Repas',
    category: 'food',
    amount: round2(mealRate * nDays * people),
    detail: `${people} pers · ${nDays} j · ${mealRate} €/pers/j`,
  })

  // — Hébergement —
  if (nNights > 0) {
    const isBike = vehicle?.category === 'bike'
    const nightly = isBike
      ? RATES.campingPerNight
      : round2(RATES.campingPerNight + confort * 85)
    lines.push({
      id: 'accommodation',
      label: isBike ? 'Camping & nuitées' : 'Hébergement',
      category: 'accommodation',
      amount: round2(nightly * nNights),
      detail: `${nNights} nuit(s) · ${nightly} €/nuit`,
    })
  }

  // — Activités —
  const activityRate = round2(RATES.activityPerDay * (0.4 + decouverte * 1.2 + nature * 0.3))
  lines.push({
    id: 'activities',
    label: 'Activités & visites',
    category: 'activities',
    amount: round2(activityRate * nDays * people),
    detail: `${people} pers · ${nDays} j · ${activityRate} €/pers/j`,
  })

  const totals = {}
  for (const line of lines) {
    totals[line.category] = round2((totals[line.category] || 0) + line.amount)
  }
  const total = round2(lines.reduce((s, l) => s + l.amount, 0))

  return { lines, totals, total }
}

/** Durée estimée du trajet en secondes, hors pauses. */
export function estimateDurationSec({ distanceKm = 0, avgSpeedKph = 90 } = {}) {
  const km = Math.max(0, Number(distanceKm) || 0)
  const kph = Math.max(5, Number(avgSpeedKph) || 90)
  return Math.round((km / kph) * 3600)
}

function clamp01(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0.5
  return Math.min(1, Math.max(0, n))
}

/** Accepte « 7,5 », 7.5, null — renvoie null si non interprétable. */
export function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}
