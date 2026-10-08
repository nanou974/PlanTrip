/**
 * Recherche d'offres d'hébergement chez des partenaires : liens vers des recherches déjà remplies
 * (destination, dates, voyageurs) et adresse de la carte Stay22 si un identifiant partenaire est configuré.
 * PlanTrip ne lit aucun prix chez ces sites : le voyageur retient une offre et saisit son prix.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const enc = encodeURIComponent

/** Dates valides et cohérentes, sinon null (le lien est alors envoyé sans dates). */
function validDates(start, end) {
  if (!ISO_DATE.test(String(start || '')) || !ISO_DATE.test(String(end || ''))) return null
  return end > start ? { start, end } : null
}

/** Premier élément d'un nom de lieu OSM : « Briançon, Hautes-Alpes, France » → « Briançon ». */
export function shortPlaceName(name) {
  return String(name || '').split(',')[0].trim()
}

/**
 * @param {{destinationName:string, start?:string, end?:string, travelers?:number, vehicleSlug?:string}} p
 * @returns {Array<{id:string,label:string,url:string,hint:string}>}
 */
export function offerLinks({ destinationName, start, end, travelers = 1, vehicleSlug = 'voiture' }) {
  const place = shortPlaceName(destinationName)
  if (!place) return []
  const dates = validDates(start, end)
  const adults = Math.max(1, Math.min(30, Math.round(Number(travelers) || 1)))
  const motorhome = vehicleSlug === 'camping-car' || vehicleSlug === 'van'
  const links = []

  if (!motorhome) {
    const b = new URLSearchParams({ ss: place, group_adults: String(adults), no_rooms: '1' })
    if (dates) {
      b.set('checkin', dates.start)
      b.set('checkout', dates.end)
    }
    links.push({ id: 'booking', label: 'Booking.com', url: `https://www.booking.com/searchresults.fr.html?${b}`, hint: 'Hôtels et appartements' })

    const h = new URLSearchParams({ destination: place, adults: String(adults) })
    if (dates) {
      h.set('startDate', dates.start)
      h.set('endDate', dates.end)
    }
    links.push({ id: 'hotels', label: 'Hotels.com', url: `https://fr.hotels.com/Hotel-Search?${h}`, hint: 'Hôtels' })

    if (vehicleSlug !== 'velo') {
      const a = new URLSearchParams({ adults: String(adults) })
      if (dates) {
        a.set('checkin', dates.start)
        a.set('checkout', dates.end)
      }
      links.push({ id: 'airbnb', label: 'Airbnb', url: `https://www.airbnb.fr/s/${enc(place)}/homes?${a}`, hint: 'Appartements et locations' })
    }
  }

  // Le site Campings.com est ouvert sans paramètres : son format de recherche n'est pas documenté.
  links.push({ id: 'campings', label: 'Campings.com', url: 'https://www.campings.com/fr', hint: 'Campings en France et en Europe' })

  if (motorhome) {
    links.push({ id: 'park4night', label: 'Park4night', url: 'https://park4night.com/fr', hint: 'Aires et spots de nuit' })
    links.push({ id: 'campercontact', label: 'Campercontact', url: 'https://www.campercontact.com/fr', hint: 'Aires de camping-car' })
  }
  return links
}

/** Adresse de la carte Stay22 (iframe), ou null sans identifiant partenaire ni destination. */
export function stay22Url({ aid, destinationName, start, end, travelers = 1 } = {}) {
  const place = shortPlaceName(destinationName)
  const id = String(aid || '').trim()
  if (!id || !place || !/^[A-Za-z0-9_-]{2,64}$/.test(id)) return null
  const p = new URLSearchParams({
    aid: id,
    address: place,
    adults: String(Math.max(1, Math.min(30, Math.round(Number(travelers) || 1)))),
    ljs: 'fr',
    currency: 'EUR',
    maincolor: '2e7d5b',
  })
  const dates = validDates(start, end)
  if (dates) {
    p.set('checkin', dates.start)
    p.set('checkout', dates.end)
  }
  return `https://www.stay22.com/embed/gm?${p}`
}
