import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { Button, Card, PageHeader, Pill, SectionHeader } from '../design/ui.jsx'
import { Icon } from '../design/Icon.jsx'
import { formatDuration, formatEUR, formatNumber, plural, tripDurationLabel } from '../domain/format.js'
import { round2 } from '../domain/budget.js'
import { estimateTripCosts } from '../domain/estimate.js'
import { estimateItinerary, isGeoPoint, itineraryPoints, routePlaces } from '../domain/itinerary.js'
import { vehicleFor, vehicleIcon } from '../lib/tripInfo.js'
import { useOnlineStatus } from '../lib/online.js'
import {
  buildGpx,
  downloadFile,
  fetchRoute,
  profileForVehicle,
  routePoints,
} from '../services/routing.js'
import { getTrip } from '../state/store.js'

const MEAL_TYPES = {
  'petit-dejeuner': {
    label: 'Petit-déjeuner',
    icon: 'coffee',
    options: [
      { id: 'none', label: 'Pas de petit-déjeuner', perPerson: 0 },
      { id: 'cafe-croissant', label: 'Café + croissant', perPerson: 4 },
      { id: 'boulangerie-pdj', label: 'Boulangerie complet', perPerson: 6 },
      { id: 'hotel-pdj', label: 'Petit-déj hôtel', perPerson: 10 },
    ],
  },
  dejeuner: {
    label: 'Déjeuner',
    icon: 'utensils',
    options: [
      { id: 'none', label: 'Pas de déjeuner', perPerson: 0 },
      { id: 'boulangerie', label: 'Boulangerie sandwich', perPerson: 5 },
      { id: 'pique-nique', label: 'Pique-nique', perPerson: 7 },
      { id: 'kebab', label: 'Kebab / Wrap', perPerson: 10 },
      { id: 'fast-food', label: 'Fast-food', perPerson: 12 },
      { id: 'restaurant', label: 'Restaurant', perPerson: 18 },
    ],
  },
  diner: {
    label: 'Dîner',
    icon: 'utensils',
    options: [
      { id: 'none', label: 'Pas de dîner', perPerson: 0 },
      { id: 'pique-nique', label: 'Pique-nique / Froid', perPerson: 7 },
      { id: 'cuisine-bord', label: 'Cuisine à bord', perPerson: 8 },
      { id: 'kebab', label: 'Kebab / Pizza', perPerson: 10 },
      { id: 'restaurant', label: 'Restaurant', perPerson: 18 },
    ],
  },
}

const ACCOMMODATIONS = {
  voiture: [
    { id: 'hotel', label: 'Hôtel', icon: 'bed', priceRange: [60, 120], desc: 'Confort, parking, petit-déjeuner' },
    { id: 'airbnb', label: 'Airbnb / Appartement', icon: 'home', priceRange: [45, 90], desc: 'Cuisine, espace, autonomie' },
    { id: 'camping', label: 'Camping', icon: 'tent', priceRange: [10, 25], desc: 'Nature, économique, plein air' },
  ],
  'camping-car': [
    { id: 'ccpark', label: 'Camping-car park', icon: 'parking', priceRange: [10, 20], desc: 'Place spécifique, eau, vidange' },
    { id: 'camping', label: 'Camping', icon: 'tent', priceRange: [10, 25], desc: 'Nature, emplacement aménagé' },
    { id: 'airbnb', label: 'Airbnb', icon: 'home', priceRange: [45, 80], desc: 'Pour une nuit en dur' },
  ],
  'voiture-sans-permis': [
    { id: 'hotel', label: 'Hôtel', icon: 'bed', priceRange: [50, 90], desc: 'Confort accessible' },
    { id: 'airbnb', label: 'Airbnb', icon: 'home', priceRange: [35, 70], desc: 'Autonomie, petit budget' },
    { id: 'camping', label: 'Camping', icon: 'tent', priceRange: [8, 20], desc: 'Économique, plein air' },
  ],
  moto: [
    { id: 'hotel', label: 'Hôtel', icon: 'bed', priceRange: [55, 100], desc: 'Sécurité moto, garage' },
    { id: 'airbnb', label: 'Airbnb', icon: 'home', priceRange: [40, 80], desc: 'Flexibilité' },
  ],
  velo: [
    { id: 'camping', label: 'Camping', icon: 'tent', priceRange: [8, 18], desc: 'Proche de la piste' },
    { id: 'hotel', label: 'Hôtel', icon: 'bed', priceRange: [50, 90], desc: 'Douche et repos' },
  ],
  van: [
    { id: 'camping', label: 'Camping / Aire', icon: 'tent', priceRange: [10, 25], desc: 'Emplacement van aménagé' },
    { id: 'parking', label: 'Aire de parking', icon: 'parking', priceRange: [0, 10], desc: 'Stationnement nuit' },
    { id: 'airbnb', label: 'Airbnb', icon: 'home', priceRange: [40, 75], desc: 'Pour une nuit en dur' },
  ],
}

const DEFAULT_ACCOMMODATIONS = 'voiture'

const ACCOM_TYPE_LABEL = {
  hotel: 'Hôtel',
  camping: 'Camping',
  airbnb: 'Airbnb',
}

const ACCOM_TYPE_COLOR = {
  hotel: '#1E3A5F',
  camping: '#2E7D5B',
  airbnb: '#B4341F',
}

const CHOICE_LINE_IDS = ['meals', 'accommodation']

function computeMealSlots(departureTime, arrivalTime, days) {
  const slots = []
  const depH = parseInt(String(departureTime || '08:00').split(':')[0], 10) || 0
  const arrH = parseInt(String(arrivalTime || '18:00').split(':')[0], 10) || 0
  for (let d = 0; d < days; d += 1) {
    const isFirst = d === 0
    const isLast = d === days - 1
    const daySlots = []
    if (isFirst) {
      if (depH < 8) daySlots.push('petit-dejeuner')
      if (depH < 12) daySlots.push('dejeuner')
      if (days > 1) daySlots.push('diner')
      else if (arrH >= 19) daySlots.push('diner')
    } else if (isLast) {
      daySlots.push('petit-dejeuner')
      if (arrH >= 13) daySlots.push('dejeuner')
      if (arrH >= 20) daySlots.push('diner')
    } else {
      daySlots.push('petit-dejeuner', 'dejeuner', 'diner')
    }
    if (daySlots.length) slots.push({ day: d + 1, meals: daySlots })
  }
  return slots
}

/**
 * Hébergements le long du tracé — Overpass (OSM), réseau requis.
 * @returns {Promise<Array|null>} `null` = service injoignable (hors connexion)
 */
async function fetchAccommodations(coords) {
  if (!coords || coords.length < 2) return []
  const lats = coords.map((c) => c[1])
  const lons = coords.map((c) => c[0])
  const south = Math.min(...lats) - 0.1
  const north = Math.max(...lats) + 0.1
  const west = Math.min(...lons) - 0.1
  const east = Math.max(...lons) + 0.1
  const bbox = `${south},${west},${north},${east}`
  const query = `[out:json][timeout:10];(node["tourism"~"hotel|hostel|motel|camp_site|caravan_site|apartment"](${bbox}););out body;`
  try {
    const r = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
    })
    const j = await r.json()
    return j.elements.map((el) => {
      const tags = el.tags || {}
      let type = 'other'
      if (tags.tourism === 'hotel' || tags.tourism === 'hostel' || tags.tourism === 'motel') type = 'hotel'
      else if (tags.tourism === 'camp_site' || tags.tourism === 'caravan_site') type = 'camping'
      else if (tags.tourism === 'apartment') type = 'airbnb'
      return {
        id: el.id,
        name: tags.name || tags['name:fr'] || 'Sans nom',
        lat: el.lat,
        lon: el.lon,
        type,
        stars: tags.stars || null,
        website: tags.website || null,
      }
    })
  } catch {
    return null
  }
}

function accomColor(type) {
  return ACCOM_TYPE_COLOR[type] || '#2B2F33'
}

function placeLabel(place) {
  const name = String(place?.name || '')
  return name.split(',')[0].trim() || '—'
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c),
  )
}

/** Tolère l'ancien format (budget = nombre) et l'objet du modèle. */
function budgetOf(raw) {
  if (typeof raw === 'number') return { max: Number(raw) || 0, entries: [], plan: null }
  if (raw && typeof raw === 'object') {
    return {
      max: Number(raw.max) || 0,
      entries: Array.isArray(raw.entries) ? raw.entries : [],
      plan: raw.plan ?? null,
    }
  }
  return { max: 0, entries: [], plan: null }
}

export default function ResultatVoyage() {
  const nav = useNavigate()
  const [trip] = useState(() => getTrip())
  const [route, setRoute] = useState(null)
  const [routeError, setRouteError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedAccom, setSelectedAccom] = useState(null)
  const [mealChoices, setMealChoices] = useState({})
  const [accomResult, setAccomResult] = useState({ route: null, items: [], error: false })
  const [mapFilter, setMapFilter] = useState('all')
  const [notice, setNotice] = useState(null)
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const online = useOnlineStatus()

  const budget = budgetOf(trip?.budget)
  const vehicle = vehicleFor(trip)
  const slug = trip?.vehicle?.slug || ''
  const days = Math.max(1, Number(trip?.dates?.days) || 1)
  const rawNights = Number(trip?.dates?.nights)
  const nights =
    trip?.dates?.nights != null && Number.isFinite(rawNights) && rawNights >= 0
      ? rawNights
      : Math.max(0, days - 1)
  const travelers = Math.max(1, Number(trip?.travelers) || 1)
  const avgSpeedKph = Number(vehicle?.avgSpeedKph) || 90
  const hasCoords = Boolean(trip) && isGeoPoint(trip.departure) && isGeoPoint(trip.destination)

  useEffect(() => {
    if (!trip) nav('/preparer-son-voyage')
  }, [trip, nav])

  const tripPoints = useMemo(
    () =>
      trip
        ? routePoints({
            departure: trip.departure,
            destination: trip.destination,
            waypoints: routePlaces(trip.places),
            returnTrip: Boolean(trip.returnTrip),
          })
        : [],
    [trip],
  )

  const canFetch = tripPoints.length >= 2

  useEffect(() => {
    if (!trip || !canFetch) return undefined
    let alive = true
    fetchRoute(tripPoints, { profile: profileForVehicle(slug, vehicle?.category) })
      .then((res) => {
        if (alive) setRoute(res)
      })
      .catch(() => {
        if (alive) setRouteError('Calcul en ligne indisponible : itinéraire estimé à vol d’oiseau.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [trip, tripPoints, canFetch, slug, vehicle])

  useEffect(() => {
    if (!route) return undefined
    let alive = true
    fetchAccommodations(route.coordinates).then((items) => {
      if (alive) setAccomResult({ route, items: items || [], error: items === null })
    })
    return () => {
      alive = false
    }
  }, [route])

  const mapAccoms = useMemo(
    () => (accomResult.route === route ? accomResult.items : []),
    [accomResult, route],
  )
  const accomLoading = Boolean(route) && accomResult.route !== route
  const accomError = Boolean(accomResult.error)

  useEffect(() => {
    if (!trip || !mapRef.current || !hasCoords) return undefined
    if (mapInstance.current) {
      mapInstance.current.remove()
      mapInstance.current = null
    }
    const a = trip.departure
    const b = trip.destination
    const coords = route?.coordinates || []
    const map = L.map(mapRef.current, { scrollWheelZoom: false })
    mapInstance.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)
    const startIcon = L.divIcon({
      className: '',
      html: '<div style="width:14px;height:14px;background:#2E7D5B;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    })
    const endIcon = L.divIcon({
      className: '',
      html: '<div style="width:14px;height:14px;background:#2B2F33;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    })
    L.marker([a.lat, a.lon], { icon: startIcon })
      .addTo(map)
      .bindPopup(`<b>Départ</b><br>${escapeHtml(placeLabel(a))}`)
    L.marker([b.lat, b.lon], { icon: endIcon })
      .addTo(map)
      .bindPopup(`<b>Arrivée</b><br>${escapeHtml(placeLabel(b))}`)
    if (coords.length >= 2) {
      const latlngs = coords.map((c) => [c[1], c[0]])
      L.polyline(latlngs, {
        color: '#A85400',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map)
      map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] })
    } else {
      map.fitBounds(
        [
          [a.lat, a.lon],
          [b.lat, b.lon],
        ],
        { padding: [40, 40] },
      )
    }
    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [trip, route, hasCoords])

  useEffect(() => {
    if (!mapInstance.current || !mapAccoms.length) return
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    const filtered = mapFilter === 'all' ? mapAccoms : mapAccoms.filter((a) => a.type === mapFilter)
    filtered.forEach((accom) => {
      const color = accomColor(accom.type)
      const markerIcon = L.divIcon({
        className: '',
        html: `<div style="width:20px;height:20px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.35);cursor:pointer"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })
      const m = L.marker([accom.lat, accom.lon], { icon: markerIcon }).addTo(mapInstance.current)
      const typeLabel = ACCOM_TYPE_LABEL[accom.type] || 'Autre'
      m.bindPopup(`<b>${escapeHtml(accom.name)}</b><br>${escapeHtml(typeLabel)}${
        accom.stars ? ` • ${escapeHtml(accom.stars)}★` : ''
      }`)
      m.on('click', () => {
        const priceGuess = accom.type === 'hotel' ? 70 : accom.type === 'camping' ? 15 : 50
        setSelectedAccom({
          id: `map-${accom.id}`,
          label: accom.name,
          icon: 'bed',
          priceRange: [priceGuess - 10, priceGuess + 10],
          desc: `${typeLabel} trouvé sur la carte`,
          mapAccom: accom,
        })
      })
      markersRef.current.push(m)
    })
  }, [mapAccoms, mapFilter])

  const mealSlots = useMemo(
    () => (trip ? computeMealSlots(trip.departureTime, trip.arrivalTime, days) : []),
    [trip, days],
  )

  const mealDefaults = useMemo(() => {
    const init = {}
    mealSlots.forEach((slot) => {
      slot.meals.forEach((mType) => {
        const key = `${slot.day}:${mType}`
        const opts = MEAL_TYPES[mType]?.options || []
        init[key] = opts.length > 1 ? opts[1].id : opts[0]?.id || 'none'
      })
    })
    return init
  }, [mealSlots])

  const choices = useMemo(() => ({ ...mealDefaults, ...mealChoices }), [mealDefaults, mealChoices])

  const totalMeals = useMemo(() => {
    let total = 0
    Object.entries(choices).forEach(([key, choiceId]) => {
      const mType = key.slice(key.indexOf(':') + 1)
      const mealType = MEAL_TYPES[mType]
      if (!mealType) return
      const opt = mealType.options.find((o) => o.id === choiceId)
      if (opt) total += opt.perPerson * travelers
    })
    return total
  }, [choices, travelers])

  const totalMealCount = useMemo(
    () => Object.values(choices).filter((id) => id !== 'none').length,
    [choices],
  )

  const defaultAccom = useMemo(() => {
    if (!trip) return null
    const opts = ACCOMMODATIONS[slug] || ACCOMMODATIONS[DEFAULT_ACCOMMODATIONS]
    return opts[0] || null
  }, [trip, slug])

  const effectiveAccom = selectedAccom || defaultAccom

  const accomPrice = useMemo(() => {
    if (!effectiveAccom || !trip || nights <= 0) return 0
    const rawConfort = Number(trip.profile?.confort)
    const confort = Number.isFinite(rawConfort) ? rawConfort : 0.5
    const [min, max] = effectiveAccom.priceRange
    return Math.round((min + (max - min) * confort) * nights)
  }, [effectiveAccom, trip, nights])

  const geo = useMemo(() => estimateItinerary(itineraryPoints(trip), avgSpeedKph), [trip, avgSpeedKph])

  const storedKm = Number(trip?.itinerary?.distanceKm) || 0
  const storedSec = Number(trip?.itinerary?.durationSec) || 0
  const distanceKm = route?.distance
    ? Math.round((route.distance / 1000) * 10) / 10
    : storedKm > 0
      ? storedKm
      : geo.distanceKm
  const durationSec = route?.duration ? Math.round(route.duration) : storedSec > 0 ? storedSec : geo.durationSec
  const estimated = !route && storedKm <= 0

  const estimation = useMemo(() => {
    if (!trip || !vehicle) return null
    return estimateTripCosts({
      vehicle,
      distanceKm,
      returnTrip: Boolean(trip.returnTrip),
      days,
      nights,
      travelers,
      profile: trip.profile || {},
      avoidTolls: Boolean(trip.preferences?.avoidTolls),
      customConsumption: trip.vehicle?.customConsumption,
    })
  }, [trip, vehicle, distanceKm, days, nights, travelers])

  const routePending = canFetch && loading
  const effectiveRouteError =
    routeError ||
    (trip && !canFetch ? 'Points de départ ou d’arrivée manquants : itinéraire non calculable.' : '')

  if (!trip) return <div className="pt-28 text-center text-sm text-pt-neutral/50">Chargement…</div>

  const baseLines = estimation
    ? estimation.lines.filter((line) => !CHOICE_LINE_IDS.includes(line.id))
    : []
  const baseTotal = round2(baseLines.reduce((sum, line) => sum + line.amount, 0))
  const estimatedMeals = estimation?.totals?.food || 0
  const estimatedAccom = estimation?.totals?.accommodation || 0
  const adjustedTotal = round2(baseTotal + totalMeals + accomPrice)
  const remainingAmount = round2(budget.max - adjustedTotal)

  const accomOptions = ACCOMMODATIONS[slug] || ACCOMMODATIONS[DEFAULT_ACCOMMODATIONS]
  const googleMapsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&origin=${trip.departure.lat},${trip.departure.lon}&destination=${trip.destination.lat},${trip.destination.lon}&travelmode=driving`
    : ''
  const wazeUrl = hasCoords
    ? `https://www.waze.com/ul?ll=${trip.destination.lat},${trip.destination.lon}&navigate=yes`
    : ''

  const mapFilters = [
    { id: 'all', label: 'Tous', icon: 'map', count: mapAccoms.length },
    { id: 'hotel', label: 'Hôtels', icon: 'bed', count: mapAccoms.filter((a) => a.type === 'hotel').length },
    {
      id: 'camping',
      label: 'Campings',
      icon: 'tent',
      count: mapAccoms.filter((a) => a.type === 'camping').length,
    },
    { id: 'airbnb', label: 'Airbnb', icon: 'home', count: mapAccoms.filter((a) => a.type === 'airbnb').length },
  ]

  function exportGpx() {
    if (tripPoints.length < 2) {
      setNotice({ tone: 'danger', msg: 'Export impossible : points de départ ou d’arrivée manquants.' })
      return
    }
    const gpx = buildGpx({ name: trip.name || 'Itinéraire PlanTrip', points: tripPoints, route })
    downloadFile('plantrip.gpx', gpx, 'application/gpx+xml')
    setNotice(
      route
        ? { tone: 'ok', msg: 'GPX téléchargé.' }
        : { tone: 'ok', msg: 'Trajet non calculé : GPX exporté en points d’étape.' },
    )
  }

  function setMealChoice(key, optionId) {
    setMealChoices((prev) => ({ ...prev, [key]: optionId }))
  }

  function handleModify() {
    sessionStorage.setItem('plantrip_edit_mode', 'true')
    nav('/preparer-son-voyage')
  }

  return (
    <div>
      <section className="py-10 bg-pt-cream">
        <div className="max-w-5xl mx-auto px-5 lg:px-8">
          <PageHeader
            eyebrow="Résultat du calcul"
            title={`Votre voyage ${placeLabel(trip.departure)} → ${placeLabel(trip.destination)}`}
            subtitle={`${tripDurationLabel(trip)} · ${plural(travelers, 'voyageur', 'voyageurs')}${
              trip.vehicle?.model ? ` · ${trip.vehicle.model}` : ''
            }`}
            actions={
              <Pill tone={vehicle ? 'blue' : 'danger'} icon={vehicleIcon(vehicle)}>
                {vehicle?.name || `Véhicule inconnu (${slug || '—'})`}
              </Pill>
            }
          />
        </div>
      </section>

      <section className="py-8 bg-white">
        <div className="max-w-5xl mx-auto px-5 lg:px-8 grid lg:grid-cols-[1.6fr_1fr] gap-8">
          <div className="space-y-6">
            <Card>
              <SectionHeader
                title="Itinéraire"
                action={
                  routePending ? (
                    <Pill tone="neutral" icon="refresh">
                      Calcul du trajet…
                    </Pill>
                  ) : estimated ? (
                    <Pill tone="orange" icon="info">
                      Estimation directe
                    </Pill>
                  ) : (
                    <Pill tone="green" icon="check-circle">
                      Route calculée
                    </Pill>
                  )
                }
              />
              <div className="flex flex-wrap gap-2 mb-3">
                <Pill tone="blue" icon="route">
                  {formatNumber(distanceKm)} km
                </Pill>
                <Pill tone="blue" icon="clock">
                  {formatDuration(durationSec)}
                </Pill>
                {vehicle?.routing?.realisticSpeed && (
                  <Pill tone="orange" icon="navigation">
                    {vehicle.routing.realisticSpeed}
                  </Pill>
                )}
              </div>
              <p className="text-sm text-pt-neutral/60">
                Départ {trip.departureTime || '—'} • Arrivée {trip.arrivalTime || '—'}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {trip.preferences?.avoidTolls && <Pill icon="wallet">Sans péage</Pill>}
                {trip.preferences?.avoidHighways && <Pill icon="route">Sans autoroute</Pill>}
                {trip.returnTrip && <Pill icon="swap">Aller-retour</Pill>}
              </div>
              {effectiveRouteError && (
                <p className="text-xs text-pt-orange-ink mt-3 flex items-start gap-1.5">
                  <Icon name="info" size={14} className="shrink-0 mt-0.5" />
                  {effectiveRouteError}
                </p>
              )}
            </Card>

            <Card>
              <SectionHeader
                title="Carte & Hébergements"
                action={
                  accomLoading ? (
                    <span className="text-xs text-pt-neutral/45">Recherche d’hébergements…</span>
                  ) : accomError ? (
                    <Pill tone="orange" icon="info">
                      {online
                        ? 'Hébergements indisponibles'
                        : 'Hébergements indisponibles hors connexion'}
                    </Pill>
                  ) : mapAccoms.length > 0 ? (
                    <Pill tone="green" icon="pin">
                      {mapAccoms.length} trouvés
                    </Pill>
                  ) : null
                }
              />
              {hasCoords ? (
                <div ref={mapRef} className="relative aspect-[16/10] rounded-xl overflow-hidden z-0">
                  {!online && (
                    <div className="absolute left-2 top-2 z-[500]">
                      <Pill tone="orange" icon="info">
                        Fond de carte hors connexion
                      </Pill>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-[16/10] rounded-xl z-0 bg-pt-cream border border-pt-line flex flex-col items-center justify-center text-center px-6">
                  <Icon name="pin" size={22} className="text-pt-neutral/40 mb-2" />
                  <p className="text-sm text-pt-neutral/55">
                    Coordonnées manquantes : la carte est indisponible.
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {mapFilters.map((f) => (
                  <Button
                    key={f.id}
                    size="sm"
                    icon={f.icon}
                    variant={mapFilter === f.id ? 'primary' : 'secondary'}
                    aria-pressed={mapFilter === f.id}
                    onClick={() => setMapFilter(f.id)}
                  >
                    {f.label} ({f.count})
                  </Button>
                ))}
              </div>
            </Card>

            <Card>
              <SectionHeader
                title="Repas du voyage"
                subtitle={`Choisissez le type de chaque repas · ${plural(travelers, 'voyageur', 'voyageurs')}`}
              />
              <div className="space-y-4">
                {mealSlots.map((slot) => (
                  <div key={slot.day} className="p-4 bg-pt-cream rounded-xl">
                    <p className="text-sm font-bold text-pt-orange-ink mb-3">Jour {slot.day}</p>
                    <div className="space-y-3">
                      {slot.meals.map((mType) => {
                        const mt = MEAL_TYPES[mType]
                        if (!mt) return null
                        const key = `${slot.day}:${mType}`
                        const chosen = choices[key] || 'none'
                        return (
                          <div key={mType}>
                            <p className="text-xs font-semibold uppercase text-pt-neutral/50 mb-1.5 flex items-center gap-1.5">
                              <Icon name={mt.icon} size={13} />
                              {mt.label}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {mt.options.map((opt) => {
                                const isSelected = chosen === opt.id
                                const cost = opt.perPerson * travelers
                                return (
                                  <Button
                                    key={opt.id}
                                    size="sm"
                                    variant={isSelected ? 'primary' : 'secondary'}
                                    aria-pressed={isSelected}
                                    onClick={() => setMealChoice(key, opt.id)}
                                  >
                                    {opt.label}{' '}
                                    <span className={isSelected ? 'text-white/70' : 'text-pt-neutral/45'}>
                                      {opt.perPerson > 0 ? formatEUR(opt.perPerson) : 'gratuit'}
                                    </span>
                                    {opt.perPerson > 0 && (
                                      <span className={isSelected ? 'text-white/60' : 'text-pt-neutral/35'}>
                                        ({formatEUR(cost)})
                                      </span>
                                    )}
                                  </Button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t flex justify-between gap-3 text-sm font-semibold">
                <span>
                  Total repas ({totalMealCount} repas · {plural(travelers, 'personne', 'personnes')})
                </span>
                <span className="text-pt-orange-ink">{formatEUR(totalMeals)}</span>
              </div>
            </Card>

            <Card>
              <SectionHeader
                title="Hébergement"
                subtitle={`${plural(nights, 'nuit', 'nuits')} · choisissez sur la carte ou ci-dessous`}
              />
              <div className="grid gap-2">
                {accomOptions.map((opt) => {
                  const isActive =
                    effectiveAccom?.id === opt.id && effectiveAccom?.label === opt.label
                  const rawConfort = Number(trip.profile?.confort)
                  const confort = Number.isFinite(rawConfort) ? rawConfort : 0.5
                  const perNight = Math.round(opt.priceRange[0] + (opt.priceRange[1] - opt.priceRange[0]) * confort)
                  return (
                    <Card
                      as="button"
                      key={`${opt.id}-${opt.label}`}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setSelectedAccom(opt)}
                      className={`w-full !p-4 text-left flex items-center gap-3 border-2 transition-all ${
                        isActive
                          ? 'border-pt-green bg-pt-green-soft'
                          : 'border-pt-line bg-pt-cream hover:border-pt-green/30'
                      }`}
                    >
                      <Icon name={opt.icon} size={22} className="shrink-0 text-pt-green" />
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-sm">{opt.label}</span>
                        <span className="block text-xs text-pt-neutral/50">{opt.desc}</span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className="block font-bold text-sm text-pt-orange-ink">{formatEUR(perNight)}</span>
                        <span className="block text-[10px] text-pt-neutral/40">/nuit</span>
                      </span>
                    </Card>
                  )
                })}
              </div>
              {nights > 0 && (
                <div className="mt-3 pt-3 border-t flex justify-between gap-3 text-sm font-semibold">
                  <span>Total hébergement ({plural(nights, 'nuit', 'nuits')} · {effectiveAccom?.label || '—'})</span>
                  <span className="text-pt-orange-ink">{formatEUR(accomPrice)}</span>
                </div>
              )}
            </Card>

            <Card>
              <SectionHeader
                title="Préparation véhicule"
                subtitle={vehicle ? vehicle.name : undefined}
              />
              <div className="space-y-2 text-sm">
                {vehicle?.advice?.length ? (
                  vehicle.advice.map((a, i) => (
                    <p key={i} className="flex gap-2">
                      <Icon name="check-circle" size={16} className="shrink-0 mt-0.5 text-pt-green" />
                      <span>{a}</span>
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-pt-neutral/50">Aucun conseil pour ce véhicule.</p>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-pt-green-soft border-pt-green/15">
              <SectionHeader
                title={budget.max > 0 ? `Budget ${formatEUR(budget.max)} max` : 'Budget'}
                subtitle={
                  estimation
                    ? `Estimation de référence ${formatEUR(estimation.total)}`
                    : 'Aucune enveloppe ou véhicule inconnu'
                }
              />
              {estimation ? (
                <div className="space-y-1.5 text-sm">
                  {baseLines.map((line) => (
                    <div key={line.id} className="flex items-start justify-between gap-3">
                      <span>
                        {line.label}
                        <span className="block text-xs text-pt-neutral/50">{line.detail}</span>
                      </span>
                      <span className="font-semibold shrink-0">{formatEUR(line.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-pt-orange-ink flex items-start gap-1.5 mb-2">
                  <Icon name="alert-circle" size={14} className="shrink-0 mt-0.5" />
                  Véhicule non reconnu : estimation PlanTrip indisponible.
                </p>
              )}

              <div className="mt-4 pt-4 border-t border-pt-green/20 space-y-1.5 text-sm">
                <p className="text-xs font-semibold uppercase text-pt-neutral/50 mb-2">Votre sélection</p>
                <div className="flex items-start justify-between gap-3">
                  <span>
                    Repas ({totalMealCount} repas)
                    <span className="block text-xs text-pt-neutral/50">
                      estimation {formatEUR(estimatedMeals)}
                    </span>
                  </span>
                  <span className="font-semibold shrink-0">{formatEUR(totalMeals)}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span>
                    Hébergement ({plural(nights, 'nuit', 'nuits')} · {effectiveAccom?.label || '—'})
                    <span className="block text-xs text-pt-neutral/50">
                      estimation {formatEUR(estimatedAccom)}
                    </span>
                  </span>
                  <span className="font-semibold shrink-0">{formatEUR(accomPrice)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-pt-green/20 flex justify-between gap-3 font-bold text-base">
                <span>Total ajusté</span>
                <span>{formatEUR(adjustedTotal)}</span>
              </div>
              {budget.max > 0 ? (
                <p
                  className={`mt-2 text-xs font-semibold ${
                    remainingAmount < 0 ? 'text-pt-danger' : 'text-pt-green'
                  }`}
                >
                  {remainingAmount < 0
                    ? `Dépassement de ${formatEUR(-remainingAmount)}`
                    : `Reste ${formatEUR(remainingAmount)} pour activités`}
                </p>
              ) : (
                <p className="mt-2 text-xs text-pt-neutral/55">
                  Aucune enveloppe définie : fixez un budget dans l’onglet Budget.
                </p>
              )}
            </Card>

            <Card>
              <SectionHeader title="Navigation GPS" />
              {hasCoords ? (
                <div className="grid gap-2">
                  <Button href={googleMapsUrl} target="_blank" rel="noreferrer" variant="primary" icon="navigation" block>
                    Google Maps
                  </Button>
                  <Button href={wazeUrl} target="_blank" rel="noreferrer" variant="secondary" icon="navigation" block>
                    Waze
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-pt-neutral/50">
                  Coordonnées manquantes : navigation GPS indisponible.
                </p>
              )}
            </Card>

            <Card>
              <SectionHeader title="Actions" />
              <div className="grid gap-2">
                <Button variant="secondary" icon="download" block onClick={exportGpx}>
                  Télécharger GPX
                </Button>
                <Button variant="secondary" icon="print" block onClick={() => window.print()}>
                  Imprimer / PDF
                </Button>
                <Button variant="primary" icon="edit" block onClick={handleModify}>
                  Modifier le voyage
                </Button>
              </div>
              {notice && (
                <p
                  role="status"
                  className={`text-xs mt-3 ${
                    notice.tone === 'danger' ? 'text-pt-danger' : 'text-pt-green'
                  }`}
                >
                  {notice.msg}
                </p>
              )}
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
