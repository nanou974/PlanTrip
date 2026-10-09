/**
 * Lecture des étiquettes OpenStreetMap d'un hébergement (aires de camping-car, campings, hôtels).
 * Module pur, partagé par le serveur (réduction des réponses) et le navigateur (repli direct).
 *
 * Les prix OpenStreetMap sont du texte libre (`charge=14.38 EUR`, `EUR 10`, `8 EUR/24 hours`,
 * `25 EUR purchase at farm store`...) : on n'en garde un montant que s'il est sans ambiguïté.
 */

/** Étiquettes conservées : tout le reste est écarté avant d'être envoyé au navigateur. */
export const KEPT_TAGS = [
  'name',
  'name:fr',
  'tourism',
  'stars',
  'website',
  'fee',
  'charge',
  'capacity',
  'sanitary_dump_station',
  'drinking_water',
  'water_point',
  'power_supply',
  'toilets',
  'shower',
]

const MIN_PRICE = 0.5
const MAX_PRICE = 80
/** Tarifs par personne, à la semaine, au kWh, à l'heure... : pas un prix de nuitée d'emplacement. */
const NOT_A_NIGHTLY_PRICE = /person|pers\b|adult|enfant|child|week|semaine|month|mois|kwh|elec|électri|\/\s*h\b|hour(?!s)|heure(?!s)|per hour/i
const AMOUNT = /(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:€|eur\b|euros?)|(?:€|eur\b)\s*(\d{1,3}(?:[.,]\d{1,2})?)/gi

/** Montant en euros d'un texte `charge`, ou null s'il est douteux. */
export function parseCharge(charge) {
  const text = String(charge ?? '').trim()
  if (!text || text.length > 120 || NOT_A_NIGHTLY_PRICE.test(text)) return null
  const amounts = new Set()
  for (const m of text.matchAll(AMOUNT)) {
    const n = Number((m[1] ?? m[2]).replace(',', '.'))
    if (Number.isFinite(n)) amounts.add(n)
  }
  if (amounts.size !== 1) return null
  const [price] = amounts
  return price >= MIN_PRICE && price <= MAX_PRICE ? Math.round(price * 100) / 100 : null
}

/**
 * @returns {{fee: 'free'|'paid'|null, price: number|null}}
 *   `price` = montant d'une nuit en euros, seulement quand le texte est exploitable.
 */
export function parseOsmFee(tags = {}) {
  const fee = String(tags.fee || '').toLowerCase()
  if (fee === 'no') return { fee: 'free', price: null }
  const price = parseCharge(tags.charge)
  if (fee === 'yes' || price != null) return { fee: 'paid', price }
  return { fee: null, price: null }
}

/** Services de l'aire : vrai seulement quand OpenStreetMap l'indique explicitement. */
export function osmServices(tags = {}) {
  const yes = (v) => String(v || '').toLowerCase() === 'yes'
  return {
    dump: yes(tags.sanitary_dump_station),
    water: yes(tags.water_point) || yes(tags.drinking_water),
    power: yes(tags.power_supply),
  }
}

/** Sous-ensemble sûr des étiquettes (texte court, site web en http(s) seulement). */
export function pickTags(tags = {}) {
  const out = {}
  for (const key of KEPT_TAGS) {
    const raw = tags[key]
    if (raw == null) continue
    const value = String(raw).slice(0, key === 'website' ? 300 : 160)
    if (key === 'website' && !/^https?:\/\//i.test(value)) continue
    out[key] = value
  }
  return out
}

const euro = (n) => `${String(n).replace('.', ',')} €`

/**
 * Libellés affichables d'un hébergement OpenStreetMap : tarif et services (chaînes vides si inconnus).
 * @param {{fee?: 'free'|'paid'|null, price?: number|null, services?: {dump?:boolean, water?:boolean, power?:boolean}}} item
 */
export function describeOsmLodging(item = {}) {
  let price = ''
  if (item.fee === 'free') price = 'Gratuit'
  else if (item.price != null) price = `≈ ${euro(item.price)} la nuit`
  else if (item.fee === 'paid') price = 'Payant (tarif non indiqué)'
  const s = item.services || {}
  const services = [s.dump && 'vidange', s.water && 'eau', s.power && 'électricité'].filter(Boolean).join(', ')
  return { price, services: services ? services.charAt(0).toUpperCase() + services.slice(1) : '' }
}

/** Valeur à proposer dans « prix réel trouvé » : 0 pour un lieu gratuit, le prix indiqué, sinon rien. */
export function suggestedNightlyInput(item = {}) {
  if (item.fee === 'free') return '0'
  return item.price != null ? String(item.price).replace('.', ',') : ''
}