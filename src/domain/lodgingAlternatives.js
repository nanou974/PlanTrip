/**
 * Alternatives d'hébergement moins chères que le choix actuel, utilisées quand le total
 * dépasse le budget fixé par l'utilisateur. Le budget n'est jamais modifié : on propose seulement
 * des options et on dit honnêtement si elles suffisent.
 */

const round2 = (n) => Math.round(n * 100) / 100

/** Prix par nuit d'une option selon le curseur de confort (0 → bas de fourchette, 1 → haut). */
export function pricePerNight(option, confort = 0.5) {
  const c = Number.isFinite(Number(confort)) ? Number(confort) : 0.5
  const [min, max] = option.priceRange
  return Math.round(min + (max - min) * c)
}

/**
 * @param {object} p
 * @param {Array<{id:string,label:string,priceRange:[number,number]}>} p.options options du véhicule
 * @param {{id:string,label:string}|null} p.current option actuellement retenue (exclue des propositions)
 * @param {number} p.currentLodging coût actuel de l'hébergement pour tout le séjour (estimé ou saisi)
 * @param {number} p.confort curseur de confort du profil (0..1)
 * @param {number} p.nights nombre de nuits
 * @param {number} p.otherCosts total hors hébergement (carburant, péages, stationnement, activités)
 * @param {number} p.max budget de l'utilisateur
 * @returns {Array<{option:object, perNight:number, lodging:number, total:number, remaining:number, fits:boolean}>}
 *   triées de la moins chère à la plus chère ; vide s'il n'y a pas de dépassement ou pas d'option moins chère.
 */
export function lodgingAlternatives({ options = [], current = null, currentLodging = null, confort = 0.5, nights = 0, otherCosts = 0, max = 0 }) {
  if (!(max > 0) || !(nights > 0) || !Number.isFinite(currentLodging)) return []
  if (round2(otherCosts + currentLodging) <= max) return []
  return options
    .filter((o) => !(current && o.id === current.id && o.label === current.label))
    .map((option) => {
      const perNight = pricePerNight(option, confort)
      const lodging = perNight * nights
      const total = round2(otherCosts + lodging)
      return { option, perNight, lodging, total, remaining: round2(max - total), fits: total <= max }
    })
    .filter((a) => a.lodging < currentLodging)
    .sort((a, b) => a.lodging - b.lodging)
}
