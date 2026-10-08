/**
 * Types d'hébergement et compatibilité avec le véhicule.
 * Une aire de camping-car n'a pas de sens pour une voiture, un hôtel pas pour un camping-car :
 * la carte et la liste ne proposent que les types adaptés au véhicule choisi.
 */

/** `range` = fourchette indicative en € par nuit (estimation PlanTrip, jamais un prix réel). */
export const LODGING_TYPES = {
  hotel: { id: 'hotel', label: 'Hôtel', plural: 'Hôtels', icon: 'bed', color: '#1E3A5F', range: [50, 110] },
  apartment: { id: 'apartment', label: 'Appartement', plural: 'Appartements', icon: 'home', color: '#B4341F', range: [40, 90] },
  camping: { id: 'camping', label: 'Camping', plural: 'Campings', icon: 'tent', color: '#2E7D5B', range: [10, 25] },
  aire: { id: 'aire', label: 'Aire de camping-car', plural: 'Aires de camping-car', icon: 'parking', color: '#A85400', range: [0, 20] },
}

const CAR_LIKE = ['hotel', 'apartment', 'camping']

export const LODGING_BY_VEHICLE = {
  voiture: CAR_LIKE,
  'voiture-sans-permis': CAR_LIKE,
  moto: CAR_LIKE,
  velo: ['camping', 'hotel'],
  'camping-car': ['aire', 'camping'],
  van: ['aire', 'camping'],
}

/** Types d'hébergement adaptés à un véhicule (voiture par défaut pour un véhicule inconnu). */
export function lodgingTypesFor(slug) {
  return LODGING_BY_VEHICLE[slug] || LODGING_BY_VEHICLE.voiture
}

export function isLodgingAllowed(slug, type) {
  return lodgingTypesFor(slug).includes(type)
}

/** Prix saisi par le voyageur (€ par nuit) : nombre positif, sinon null. Virgule décimale acceptée. */
export function parseNightlyPrice(raw) {
  if (raw == null || raw === '') return null
  const n = Number(String(raw).replace(',', '.').trim())
  return Number.isFinite(n) && n >= 0 && n <= 5000 ? n : null
}
