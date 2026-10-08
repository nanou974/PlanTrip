/**
 * Modèle de voyage — fabrication, validation, dérivations.
 * Pur : aucune dépendance au stockage ni à l'interface.
 */

import { daysBetween, nightsBetween } from './format.js'
import { createBudget, suggestAllocation, CATEGORY_IDS } from './budget.js'

export const TRIP_VERSION = 1

export const TRIP_STATUSES = [
  { id: 'draft', label: 'Brouillon', tone: 'neutral' },
  { id: 'ready', label: 'Prêt à partir', tone: 'green' },
  { id: 'ongoing', label: 'En cours', tone: 'blue' },
  { id: 'done', label: 'Terminé', tone: 'neutral' },
]

export const STATUS_LABEL = Object.fromEntries(TRIP_STATUSES.map((s) => [s.id, s.label]))

export const MOTIVATIONS = [
  'Détente',
  'Aventure',
  'Culture',
  'Nature',
  'Gastronomie',
  'Famille',
  'Budget serré',
  'Avec enfants',
]

export const DRIVE_TIMES = [
  { id: 'short', label: 'Trajets courts (≈ 3 h/j)' },
  { id: 'balanced', label: 'Équilibré (≈ 4 h 30/j)' },
  { id: 'long', label: 'Conduite longue (jusqu’à 6 h/j)' },
]

export function newTripId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `t_${crypto.randomUUID()}`
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export const emptySections = () => ({
  legs: [],
  places: [],
  documents: [],
  checklist: [],
})

export function createTrip(input = {}) {
  const now = new Date().toISOString()
  const dates = input.dates || {}
  const days = dates.days || (dates.start && dates.end ? daysBetween(dates.start, dates.end) + 1 : 1)
  const nights = Math.max(0, days - 1)
  const profile = {
    confort: 0.5,
    nature: 0.5,
    decouverte: 0.5,
    transport: 0.5,
    sejour: 0.5,
    ...(input.profile || {}),
  }

  const budgetObj = input.budget && typeof input.budget === 'object' ? input.budget : null
  const budgetInput = budgetObj || {}
  const max = Number(budgetObj?.max) || Number(input.budgetMax) || Number(input.budget) || 0
  return {
    id: input.id || newTripId(),
    version: TRIP_VERSION,
    createdAt: input.createdAt || now,
    updatedAt: now,
    name: input.name || deriveName(input),
    status: input.status || 'draft',
    departure: normalizePlace(input.departure),
    destination: normalizePlace(input.destination),
    returnTrip: Boolean(input.returnTrip),
    dates: {
      start: dates.start || '',
      end: dates.end || '',
      days,
      nights,
    },
    departureTime: input.departureTime || '08:00',
    arrivalTime: input.arrivalTime || '18:00',
    travelers: Math.max(1, Number(input.travelers) || 1),
    vehicle: {
      slug: input.vehicleSlug || input.vehicle?.slug || 'voiture',
      model: input.vehicleModel || '',
      heightM: Number(input.vehicleHeightM) > 0 ? Number(input.vehicleHeightM) : null,
      weightT: Number(input.vehicleWeightT) > 0 ? Number(input.vehicleWeightT) : null,
      customConsumption:
        input.customConsumption != null && input.customConsumption !== ''
          ? Number(input.customConsumption)
          : null,
    },
    profile,
    motivations: Array.isArray(input.motivations) ? [...input.motivations] : [],
    preferences: {
      avoidTolls: Boolean(input.avoidTolls),
      avoidHighways: Boolean(input.avoidHighways),
      driveTime: DRIVE_TIMES.some((d) => d.id === input.driveTime) ? input.driveTime : 'balanced',
    },
    budget: {
      ...createBudget(0),
      ...budgetInput,
      max,
      plan: budgetInput.plan ?? (max > 0 ? suggestAllocation(max, profile) : null),
    },
    itinerary: {
      distanceKm: 0,
      durationSec: 0,
      polyline: [],
      ...(input.itinerary || {}),
    },
    places: input.places || [],
    documents: input.documents || [],
    checklist: input.checklist || [],
    notes: input.notes || '',
  }
}

function normalizePlace(place) {
  const coord = (value) =>
    value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null
  if (!place) return { name: '', lat: null, lon: null, country: '', context: '' }
  return {
    name: place.name || '',
    lat: coord(place.lat),
    lon: coord(place.lon),
    country: place.country || '',
    context: place.context || '',
  }
}

function deriveName(input) {
  const from = input.departure?.name?.split(',')[0]
  const to = input.destination?.name?.split(',')[0]
  if (from && to) return `${from} → ${to}`
  return to || from || 'Nouveau voyage'
}

/**
 * @returns {{ok:boolean, errors:Record<string,string>}}
 */
export function validateTrip(input) {
  const errors = {}
  const dep = input?.departure?.name?.trim()
  const dest = input?.destination?.name?.trim()

  if (!dep) errors.departure = 'Indiquez un point de départ.'
  if (!dest) errors.destination = 'Indiquez une destination.'
  if (dep && dest && dep.toLowerCase() === dest.toLowerCase()) {
    errors.destination = 'Le départ et la destination doivent différer.'
  }

  const start = input?.dates?.start
  const end = input?.dates?.end
  if (!start) errors.start = 'Date de départ manquante.'
  if (!end) errors.end = 'Date de retour manquante.'
  if (start && end && end < start) errors.end = 'Le retour précède le départ.'

  const travelers = Number(input?.travelers)
  if (!Number.isFinite(travelers) || travelers < 1) errors.travelers = 'Au moins 1 voyageur.'
  if (travelers > 30) errors.travelers = 'Maximum 30 voyageurs.'

  const max = Number(input?.budgetMax ?? input?.budget?.max)
  if (!Number.isFinite(max) || max <= 0) errors.budgetMax = 'Définissez un budget maximal.'
  if (Number.isFinite(max) && max > 500000) errors.budgetMax = 'Budget plafonné à 500 000 €.'

  if (!input?.vehicleSlug && !input?.vehicle?.slug) errors.vehicleSlug = 'Choisissez un véhicule.'

  return { ok: Object.keys(errors).length === 0, errors }
}

/** Date locale AAAA-MM-JJ (et non UTC, qui décale de 1-2 h en France). */
export function localISODate(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Statut déduit des dates, sauf statut explicite 'done'. */
export function deriveStatus(trip, now = new Date()) {
  if (trip?.status === 'done') return 'done'
  const start = trip?.dates?.start
  const end = trip?.dates?.end
  if (!start) return 'draft'
  const today = localISODate(now)
  if (end && today > end) return 'done'
  if (today >= start) return 'ongoing'
  if (trip?.itinerary?.legs?.length || trip?.budget?.max > 0) return 'ready'
  return 'draft'
}

export function deriveTrip(trip, now) {
  const days =
    trip.dates.days || (trip.dates.start && trip.dates.end ? daysBetween(trip.dates.start, trip.dates.end) + 1 : 1)
  const nights = trip.dates.nights ?? nightsBetween(trip.dates.start, trip.dates.end)
  return {
    ...trip,
    dates: { ...trip.dates, days, nights },
    status: deriveStatus(trip, now),
    updatedAt: trip.updatedAt,
  }
}

export function normalizePlan(plan) {
  if (!plan) return null
  const out = {}
  for (const id of CATEGORY_IDS) {
    const v = Number(plan[id])
    out[id] = Number.isFinite(v) ? Math.max(0, v) : 0
  }
  return out
}

export function sortTrips(trips, by = 'default') {
  const list = [...(trips || [])]
  const rank = (t) => (t.status === 'ongoing' ? 0 : t.status === 'ready' ? 1 : t.status === 'draft' ? 2 : 3)
  if (by === 'updated') return list.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
  if (by === 'name') return list.sort((a, b) => String(a.name).localeCompare(String(b.name), 'fr'))
  if (by === 'start') return list.sort((a, b) => String(a.dates.start).localeCompare(String(b.dates.start)))
  return list.sort((a, b) => rank(a) - rank(b) || String(a.dates.start).localeCompare(String(b.dates.start)))
}

export function upcomingTrips(trips, now = new Date()) {
  const today = localISODate(now)
  return (trips || []).filter((t) => t.status !== 'done' && (!t.dates.end || t.dates.end >= today))
}
