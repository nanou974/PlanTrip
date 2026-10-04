import vehicles from '../data/vehicles.json'
import { TRIP_STATUSES, STATUS_LABEL } from '../domain/trip.js'

const STATUS_TONE = {
  draft: 'neutral',
  ready: 'green',
  ongoing: 'blue',
  done: 'neutral',
}

export function vehicleFor(trip) {
  return vehicles.find((v) => v.slug === trip?.vehicle?.slug) || null
}

export function tripStatus(trip) {
  const id = TRIP_STATUSES.some((s) => s.id === trip?.status) ? trip.status : 'draft'
  return { id, label: STATUS_LABEL[id], tone: STATUS_TONE[id] }
}

export function vehicleIcon(vehicle) {
  if (!vehicle) return 'suitcase'
  return vehicle.category === 'bike' ? 'bike' : vehicle.category === 'moto' ? 'moto' : 'car'
}
