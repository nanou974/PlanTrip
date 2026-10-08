// Sonde DATAtourisme : vérifie que la clé fonctionne et si des tarifs d'hébergement sont renvoyés.
// Usage (PowerShell) :  $env:DATATOURISME_API_KEY="..." ; node scripts/datatourisme-probe.mjs
// La clé n'est jamais affichée. Rien n'est écrit sur le disque.
const KEY = process.env.DATATOURISME_API_KEY
if (!KEY) {
  console.error('Variable DATATOURISME_API_KEY absente.')
  process.exit(1)
}

const BASE = 'https://api.datatourisme.fr/v1/catalog'
const ZONES = [
  { name: 'La Roche-sur-Yon (Vendée)', lat: 46.67, lon: -1.43 },
  { name: 'Lyon', lat: 45.76, lon: 4.84 },
  { name: 'Toulouse', lat: 43.6, lon: 1.44 },
]
const TYPES = ['Hotel', 'CampingAndCaravanning', 'Campground', 'RentalAccommodation', 'HotelTrade']

const short = (v, n = 500) => {
  const s = JSON.stringify(v)
  return s && s.length > n ? `${s.slice(0, n)}…` : s
}

async function query(params) {
  const url = `${BASE}?${new URLSearchParams(params)}`
  const res = await fetch(url, { headers: { 'X-API-Key': KEY, Accept: 'application/json' } })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* corps non JSON */
  }
  return { status: res.status, json, text }
}

for (const zone of ZONES) {
  for (const type of TYPES) {
    const { status, json, text } = await query({
      filters: `type=${type}`,
      geo_distance: `${zone.lat},${zone.lon},30km`,
      page_size: '20',
      lang: 'fr',
      // La sélection par défaut n'inclut PAS les tarifs : on les demande explicitement.
      fields: 'uuid,label,type,offers',
    })
    if (status !== 200 || !json) {
      console.log(`\n[${zone.name}] ${type} → HTTP ${status} ${text.slice(0, 200)}`)
      continue
    }
    const objs = json.objects || []
    const withOffers = objs.filter((o) => o.offers && JSON.stringify(o.offers) !== '[]')
    console.log(`\n[${zone.name}] ${type} → total ${json.meta?.total}, page: ${objs.length}, avec "offers": ${withOffers.length}`)
    if (zone.name.startsWith('La Roche') && type === 'Hotel') {
      console.log('Clés d’un objet :', Object.keys(objs[0] || {}).join(', '))
      console.log('Exemple brut :', short(objs[0], 700))
    }
    for (const o of withOffers.slice(0, 2)) {
      console.log(' •', short(o.label ?? o.uuid, 80), '→', short(o.offers))
    }
  }
}

// Le serveur PlanTrip essaie d'abord un filtre « a un tarif » : on vérifie que l'API l'accepte.
const filtered = await query({
  filters: 'type=HotelTrade AND offers.priceSpecification.minPrice[gte]=1',
  geo_distance: '45.76,4.84,30km',
  page_size: '5',
  lang: 'fr',
  fields: 'uuid,label,offers',
})
console.log(`\n[Filtre « a un tarif »] HTTP ${filtered.status}, total ${filtered.json?.meta?.total ?? '?'}`, filtered.status !== 200 ? filtered.text.slice(0, 200) : '')
