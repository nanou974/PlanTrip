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
import { searchAccommodations } from '../services/places.js'
import { vehicleFor, vehicleIcon } from '../lib/tripInfo.js'
import { labelMarker } from '../lib/leaflet-a11y.js'
import { useOnlineStatus } from '../lib/online.js'
import {
  buildGpx,
  downloadFile,
  fetchRoute,
  profileForVehicle,
  DEGRADED_NOTICE,
  routePoints,
} from '../services/routing.js'
import { getTrip } from '../state/store.js'
import OffersPanel from '../components/OffersPanel.jsx'
import SafetyChecks from '../components/SafetyChecks.jsx'
import DrivingPlan from '../components/DrivingPlan.jsx'
import NavigationLinks from '../components/NavigationLinks.jsx'
import {
  PRICED_TYPES,
  fetchLodgingPrices,
  formatObservedRange,
} from '../services/lodgingPrices.js'
import { planDriving } from '../domain/driving.js'
import { allocateNights, interpolate, priceNights } from '../domain/nights.js'
import { lodgingAlternatives } from '../domain/lodgingAlternatives.js'
import { LODGING_TYPES, lodgingTypesFor, parseNightlyPrice } from '../domain/lodging.js'

/**
 * Options d'hébergement par véhicule. `type` renvoie à LODGING_TYPES ; `priceRange` est une
 * fourchette indicative PlanTrip (€/nuit), remplacée par le prix réel saisi par le voyageur.
 */
const ACCOMMODATIONS = {
  voiture: [
    { id: 'hotel', type: 'hotel', label: 'Hôtel', icon: 'bed', priceRange: [60, 120], desc: 'Confort, parking, petit-déjeuner' },
    { id: 'apartment', type: 'apartment', label: 'Appartement / location', icon: 'home', priceRange: [45, 90], desc: 'Cuisine, espace, autonomie' },
    { id: 'camping', type: 'camping', label: 'Camping', icon: 'tent', priceRange: [10, 25], desc: 'Nature, économique, plein air' },
  ],
  'camping-car': [
    { id: 'ccpark', type: 'aire', label: 'Aire de camping-car', icon: 'parking', priceRange: [10, 20], desc: 'Place spécifique, eau, vidange' },
    { id: 'camping', type: 'camping', label: 'Camping', icon: 'tent', priceRange: [10, 25], desc: 'Nature, emplacement aménagé' },
  ],
  'voiture-sans-permis': [
    { id: 'hotel', type: 'hotel', label: 'Hôtel', icon: 'bed', priceRange: [50, 90], desc: 'Confort accessible' },
    { id: 'apartment', type: 'apartment', label: 'Appartement / location', icon: 'home', priceRange: [35, 70], desc: 'Autonomie, petit budget' },
    { id: 'camping', type: 'camping', label: 'Camping', icon: 'tent', priceRange: [8, 20], desc: 'Économique, plein air' },
  ],
  moto: [
    { id: 'hotel', type: 'hotel', label: 'Hôtel', icon: 'bed', priceRange: [55, 100], desc: 'Sécurité moto, garage' },
    { id: 'apartment', type: 'apartment', label: 'Appartement / location', icon: 'home', priceRange: [40, 80], desc: 'Flexibilité' },
    { id: 'camping', type: 'camping', label: 'Camping', icon: 'tent', priceRange: [8, 20], desc: 'Économique, plein air' },
  ],
  velo: [
    { id: 'camping', type: 'camping', label: 'Camping', icon: 'tent', priceRange: [8, 18], desc: 'Proche de la piste' },
    { id: 'hotel', type: 'hotel', label: 'Hôtel', icon: 'bed', priceRange: [50, 90], desc: 'Douche et repos' },
  ],
  van: [
    { id: 'ccpark', type: 'aire', label: 'Aire de camping-car / van', icon: 'parking', priceRange: [0, 15], desc: 'Stationnement de nuit, services' },
    { id: 'camping', type: 'camping', label: 'Camping', icon: 'tent', priceRange: [10, 25], desc: 'Emplacement van aménagé' },
  ],
}

const DEFAULT_ACCOMMODATIONS = 'voiture'

const CHOICE_LINE_IDS = ['accommodation']

function accomColor(type) {
  return LODGING_TYPES[type]?.color || '#2B2F33'
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

/** Valeur vide stable : évite de refaire les calculs de budget à chaque rendu tant que les tarifs ne sont pas arrivés. */
const NO_PRICE_BOOK = {}

export default function ResultatVoyage() {
  const nav = useNavigate()
  const [trip] = useState(() => getTrip())
  const [route, setRoute] = useState(null)
  const [routeError, setRouteError] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedAccom, setSelectedAccom] = useState(null)
  const [accomResult, setAccomResult] = useState({ route: null, items: [], error: false })
  const [mapFilter, setMapFilter] = useState('all')
  const [nightlyInput, setNightlyInput] = useState('')
  const [notice, setNotice] = useState(null)
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const stopMarkersRef = useRef([])
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
    fetchRoute(tripPoints, {
      profile: profileForVehicle(slug, vehicle?.category),
      vehicle: slug,
      avoidTolls: Boolean(trip.preferences?.avoidTolls),
      avoidHighways: Boolean(trip.preferences?.avoidHighways),
      heightM: trip.vehicle?.heightM,
      weightT: trip.vehicle?.weightT,
    })
      .then((res) => {
        if (alive) {
          setRoute(res)
          if (res.degraded) setRouteError(DEGRADED_NOTICE)
        }
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
    searchAccommodations(route.coordinates).then((items) => {
      if (alive) setAccomResult({ route, items: items || [], error: items === null })
    })
    return () => {
      alive = false
    }
  }, [route])

  const allowedLodging = useMemo(() => lodgingTypesFor(slug), [slug])
  const mapAccoms = useMemo(
    () => (accomResult.route === route ? accomResult.items.filter((a) => allowedLodging.includes(a.type)) : []),
    [accomResult, route, allowedLodging],
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
    const startMarker = L.marker([a.lat, a.lon], { icon: startIcon })
    startMarker.bindPopup(`<b>Départ</b><br>${escapeHtml(placeLabel(a))}`)
    labelMarker(startMarker, `Point de départ : ${placeLabel(a)}`)
    startMarker.addTo(map)
    const endMarker = L.marker([b.lat, b.lon], { icon: endIcon })
    endMarker.bindPopup(`<b>Arrivée</b><br>${escapeHtml(placeLabel(b))}`)
    labelMarker(endMarker, `Destination : ${placeLabel(b)}`)
    endMarker.addTo(map)
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
        html: `<div style="width:14px;height:14px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.35);cursor:pointer"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })
      const m = L.marker([accom.lat, accom.lon], { icon: markerIcon })
      const typeLabel = LODGING_TYPES[accom.type]?.label || 'Autre'
      labelMarker(m, `${typeLabel} : ${accom.name}`)
      m.addTo(mapInstance.current)
      m.bindPopup(`<b>${escapeHtml(accom.name)}</b><br>${escapeHtml(typeLabel)}${
        accom.stars ? ` • ${escapeHtml(accom.stars)}★` : ''
      }`)
      m.on('click', () => {
        setSelectedAccom({
          id: `map-${accom.id}`,
          type: accom.type,
          label: accom.name,
          icon: LODGING_TYPES[accom.type]?.icon || 'bed',
          priceRange: LODGING_TYPES[accom.type]?.range || [40, 80],
          desc: `${typeLabel} trouvé sur la carte`,
          mapAccom: accom,
        })
        setNightlyInput('')
      })
      markersRef.current.push(m)
    })
  }, [mapAccoms, mapFilter])

  const defaultAccom = useMemo(() => {
    if (!trip) return null
    const opts = ACCOMMODATIONS[slug] || ACCOMMODATIONS[DEFAULT_ACCOMMODATIONS]
    return opts[0] || null
  }, [trip, slug])

  const effectiveAccom = selectedAccom || defaultAccom

  const nightlyReal = parseNightlyPrice(nightlyInput)

  const geo = useMemo(() => estimateItinerary(itineraryPoints(trip, { withReturn: true }), avgSpeedKph), [trip, avgSpeedKph])

  const storedKm = Number(trip?.itinerary?.distanceKm) || 0
  const storedSec = Number(trip?.itinerary?.durationSec) || 0
  const distanceKm = route?.distance
    ? Math.round((route.distance / 1000) * 10) / 10
    : storedKm > 0
      ? storedKm
      : geo.distanceKm
  const durationSec = route?.duration ? Math.round(route.duration) : storedSec > 0 ? storedSec : geo.durationSec
  const estimated = !route && storedKm <= 0

  const planCoordinates = route?.coordinates?.length ? route.coordinates : trip?.itinerary?.polyline || []
  const drivePlan = useMemo(
    () =>
      planDriving({
        durationSec,
        driveTime: trip?.preferences?.driveTime,
        roundTrip: Boolean(trip?.returnTrip),
        nights,
        coordinates: planCoordinates,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [durationSec, trip, nights, route],
  )

  useEffect(() => {
    const map = mapInstance.current
    stopMarkersRef.current.forEach((m) => m.remove())
    stopMarkersRef.current = []
    if (!map || !drivePlan) return
    drivePlan.stops.forEach((stop) => {
      if (!Number.isFinite(stop.lat) || !Number.isFinite(stop.lon)) return
      const icon = L.divIcon({
        className: '',
        html: `<div style="min-width:22px;height:22px;padding:0 5px;background:#A85400;color:#fff;border:2px solid white;border-radius:11px;box-shadow:0 2px 6px rgba(0,0,0,.4);font:700 11px/18px sans-serif;text-align:center">N${stop.night}</div>`,
        iconSize: [26, 22],
        iconAnchor: [13, 11],
      })
      const m = L.marker([stop.lat, stop.lon], { icon })
      labelMarker(m, `Étape de nuit ${stop.night}`)
      m.bindPopup(`<b>Nuit ${stop.night}</b><br>Étape approximative`)
      m.addTo(map)
      stopMarkersRef.current.push(m)
    })
  }, [drivePlan, route, trip, hasCoords])

  // Tarifs relevés (DATAtourisme) : destination et étapes de nuit. Le type d'hébergement retenu est toujours
  // relevé ; les autres types ne le sont que si un budget est fixé (ils servent aux alternatives).
  const priceType = PRICED_TYPES.includes(effectiveAccom?.type) ? effectiveAccom.type : null
  const destLat = trip?.destination?.lat
  const destLon = trip?.destination?.lon
  const hasBudget = Number(trip?.budget?.max) > 0
  const typesToPrice = useMemo(() => {
    const allowed = lodgingTypesFor(slug).filter((t) => PRICED_TYPES.includes(t))
    return hasBudget ? allowed : allowed.filter((t) => t === priceType)
  }, [slug, hasBudget, priceType])
  const stopsKey = (drivePlan?.stops || []).map((st) => `${st.lat},${st.lon}`).join('|')
  const bookKey = typesToPrice.length && isGeoPoint(trip?.destination) ? `${typesToPrice.join(',')}#${destLat},${destLon}#${stopsKey}` : ''
  const [priceBook, setPriceBook] = useState({ key: '', data: NO_PRICE_BOOK })
  useEffect(() => {
    if (!bookKey) return undefined
    let alive = true
    const stops = drivePlan?.stops || []
    Promise.all(
      typesToPrice.map(async (type) => {
        const [dest, ...stopList] = await Promise.all([
          fetchLodgingPrices({ lat: destLat, lon: destLon, type }),
          ...stops.map((st) => (Number.isFinite(st.lat) ? fetchLodgingPrices({ lat: st.lat, lon: st.lon, type }) : Promise.resolve(null))),
        ])
        return [type, { dest, stops: stopList }]
      }),
    ).then((entries) => {
      if (alive) setPriceBook({ key: bookKey, data: Object.fromEntries(entries) })
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookKey])
  const book = priceBook.key === bookKey ? priceBook.data : NO_PRICE_BOOK
  const observedPrices = (priceType && book[priceType]?.dest) || null

  const rawConfortNight = Number(trip?.profile?.confort)
  const confortNight = Number.isFinite(rawConfortNight) ? rawConfortNight : 0.5
  const nightAllocation = useMemo(
    () => allocateNights({ nights, stopCount: drivePlan?.stops?.length || 0, roundTrip: Boolean(trip?.returnTrip) }),
    [nights, drivePlan, trip],
  )
  /** Coût de l'hébergement pour tout le séjour, nuit par nuit, avec les tarifs relevés du type de `option`. */
  const lodgingCostFor = (option, userNightly = null) => {
    const data = book[option.type]
    const [min, max] = option.priceRange
    const destNightly = data?.dest ? interpolate(data.dest.low, data.dest.high, confortNight) : interpolate(min, max, confortNight)
    return priceNights({
      allocation: nightAllocation,
      stopNightly: (data?.stops || []).map((d) => (d ? interpolate(d.low, d.high, confortNight) : null)),
      destNightly,
      userNightly,
    })
  }
  const nightPricing = nights > 0 && effectiveAccom && trip ? lodgingCostFor(effectiveAccom, nightlyReal) : null
  const accomPrice = nightPricing?.total ?? 0

  const estimation = useMemo(() => {
    if (!trip || !vehicle) return null
    return estimateTripCosts({
      vehicle,
      distanceKm,
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

  if (!trip) return <div className="pt-28 text-center text-sm text-pt-neutral/75">Chargement…</div>

  const baseLines = estimation
    ? estimation.lines.filter((line) => !CHOICE_LINE_IDS.includes(line.id))
    : []
  const baseTotal = round2(baseLines.reduce((sum, line) => sum + line.amount, 0))
  const estimatedAccom = estimation?.totals?.accommodation || 0
  const adjustedTotal = round2(baseTotal + accomPrice)
  const remainingAmount = round2(budget.max - adjustedTotal)

  const accomOptions = ACCOMMODATIONS[slug] || ACCOMMODATIONS[DEFAULT_ACCOMMODATIONS]
  const accomAlternatives = lodgingAlternatives({
    options: accomOptions,
    current: effectiveAccom,
    currentLodging: accomPrice,
    confort: confortNight,
    nights,
    otherCosts: round2(baseTotal),
    max: budget.max,
    costFor: (option) => lodgingCostFor(option),
  })
  const navPlaces = routePlaces(trip.places)

  const mapFilters = [
    { id: 'all', label: 'Tous', icon: 'map', count: mapAccoms.length },
    ...allowedLodging.map((type) => ({
      id: type,
      label: LODGING_TYPES[type].plural,
      icon: LODGING_TYPES[type].icon,
      count: mapAccoms.filter((a) => a.type === type).length,
    })),
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
              <p className="text-sm text-pt-neutral/80">
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

            <DrivingPlan
              plan={drivePlan}
              roundTrip={Boolean(trip.returnTrip)}
              nights={nights}
              accommodations={mapAccoms}
              accomLoading={accomLoading}
              vehicleSlug={slug}
            />

            <Card>
              <SectionHeader
                title="Carte & Hébergements"
                action={
                  accomLoading ? (
                    <span className="text-xs text-pt-neutral/75">Recherche d’hébergements…</span>
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
                <div ref={mapRef} className="relative aspect-16/10 rounded-xl overflow-hidden z-0">
                  {!online && (
                    <div className="absolute left-2 top-2 z-500">
                      <Pill tone="orange" icon="info">
                        Fond de carte hors connexion
                      </Pill>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-16/10 rounded-xl z-0 bg-pt-cream border border-pt-line flex flex-col items-center justify-center text-center px-6">
                  <Icon name="pin" size={22} className="text-pt-neutral/70 mb-2" />
                  <p className="text-sm text-pt-neutral/80">
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
                title="Hébergement"
                subtitle={`${plural(nights, 'nuit', 'nuits')} · choisissez votre type d’hébergement (carte ou liste) : le budget suit`}
              />
              <div className="grid gap-2">
                {accomOptions.map((opt) => {
                  const isActive =
                    effectiveAccom?.id === opt.id && effectiveAccom?.label === opt.label
                  const rawConfort = Number(trip.profile?.confort)
                  const confort = Number.isFinite(rawConfort) ? rawConfort : 0.5
                  const estimatedNight = Math.round(opt.priceRange[0] + (opt.priceRange[1] - opt.priceRange[0]) * confort)
                  // Même calcul que le total : tarifs relevés par lieu quand ils existent, moyenne par nuit.
                  const optCost = nights > 0 ? lodgingCostFor(opt) : null
                  const observed = Boolean(optCost && (book[opt.type]?.dest || optCost.perStopKnown))
                  const perNight = observed ? Math.round(optCost.total / nights) : estimatedNight
                  return (
                    <Card
                      as="button"
                      key={`${opt.id}-${opt.label}`}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => {
                        setSelectedAccom(opt)
                        setNightlyInput('')
                      }}
                      className={`w-full p-4! text-left flex items-center gap-3 border-2 transition-all ${
                        isActive
                          ? 'border-pt-green bg-pt-green-soft'
                          : 'border-pt-line bg-pt-cream hover:border-pt-green/30'
                      }`}
                    >
                      <Icon name={opt.icon} size={22} className="shrink-0 text-pt-green-ink" />
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-sm">{opt.label}</span>
                        <span className="block text-xs text-pt-neutral/75">{opt.desc}</span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className="block font-bold text-sm text-pt-orange-ink">{formatEUR(perNight)}</span>
                        <span className="block text-[10px] text-pt-neutral/70">
                          {observed ? (nights > 1 ? '/nuit en moyenne · relevé' : '/nuit · relevé') : '/nuit · estimé'}
                        </span>
                      </span>
                    </Card>
                  )
                })}
              </div>
              {nights > 0 && (
                <div className="mt-3 pt-3 border-t flex justify-between gap-3 text-sm font-semibold">
                  <span>
                    Total hébergement ({plural(nights, 'nuit', 'nuits')} · {effectiveAccom?.label || '—'})
                    <span className="block text-xs font-normal text-pt-neutral/75">
                      {nightlyReal != null
                        ? 'prix saisi par vous'
                        : observedPrices || nightPricing?.perStopKnown
                          ? 'tarifs relevés par lieu (DATAtourisme)'
                          : 'estimation PlanTrip'}
                    </span>
                  </span>
                  <span className="text-pt-orange-ink">{formatEUR(accomPrice)}</span>
                </div>
              )}
              {nights > 0 && nightPricing && nightPricing.road.length > 0 && (
                <p className="mt-2 text-xs text-pt-neutral/75" data-testid="night-breakdown">
                  Dont {plural(nightPricing.road.length, 'nuit', 'nuits')} en route (
                  {nightPricing.road.map((p) => `≈ ${Math.round(p)} €`).join(', ')})
                  {nightPricing.destination.count > 0
                    ? ` et ${plural(nightPricing.destination.count, 'nuit', 'nuits')} sur place (≈ ${Math.round(nightPricing.destination.nightly)} € la nuit)`
                    : ''}
                  . Chaque nuit est chiffrée au tarif de son lieu quand il est relevé, sinon à celui de la destination.
                </p>
              )}
              {observedPrices && (
                <div className="mt-3 rounded-xl border border-pt-line bg-pt-cream p-3 text-sm" data-testid="observed-prices">
                  <p className="font-semibold">
                    Tarifs relevés près de {trip.destination?.name?.split(',')[0] || 'la destination'} :{' '}
                    {formatObservedRange(observedPrices)} la nuit
                    <span className="font-normal text-pt-neutral/75"> (médiane {observedPrices.median} €)</span>
                  </p>
                  <p className="text-xs text-pt-neutral/75 mt-1">
                    {LODGING_TYPES[priceType]?.plural || 'Hébergements'} : prix « à partir de » déclarés par {observedPrices.n}{' '}
                    établissements à moins de {observedPrices.radiusKm} km. Ils peuvent être périmés : vérifiez-les chez le
                    partenaire. Source :{' '}
                    <a href="https://www.datatourisme.fr" target="_blank" rel="noopener noreferrer" className="underline">
                      DATAtourisme
                    </a>{' '}
                    et ses producteurs (offices de tourisme),{' '}
                    <a
                      href="https://www.etalab.gouv.fr/licence-ouverte-open-licence/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Licence Ouverte Etalab 2.0
                    </a>
                    {observedPrices.updatedAt ? `, données mises à jour jusqu’au ${observedPrices.updatedAt.split('-').reverse().join('/')}` : ''}.{' '}
                    PlanTrip n’est ni affilié à DATAtourisme ni soutenu par lui.
                  </p>
                </div>
              )}
              {nights > 0 && (
                <div className="mt-3">
                  <label htmlFor="accom-real-price" className="text-xs font-semibold uppercase text-pt-neutral/75">
                    Prix réel trouvé (€ par nuit)
                  </label>
                  <input
                    id="accom-real-price"
                    type="text"
                    inputMode="decimal"
                    value={nightlyInput}
                    onChange={(e) => setNightlyInput(e.target.value)}
                    placeholder="Ex : 62"
                    className="w-full mt-1 px-3 py-2 bg-pt-cream border border-pt-line rounded-xl text-sm"
                  />
                  <p className="text-xs text-pt-neutral/75 mt-1">
                    Sans tarifs relevés ci-dessus, les prix affichés sont des estimations PlanTrip. Saisissez le prix de l’offre que vous retenez : il remplace
                    l’estimation dans le budget.
                  </p>
                </div>
              )}
            </Card>

            <OffersPanel trip={trip} travelers={travelers} vehicleSlug={slug} />

            <Card>
              <SectionHeader
                title="Préparation véhicule"
                subtitle={vehicle ? vehicle.name : undefined}
              />
              <div className="space-y-2 text-sm">
                {vehicle?.advice?.length ? (
                  vehicle.advice.map((a, i) => (
                    <p key={i} className="flex gap-2">
                      <Icon name="check-circle" size={16} className="shrink-0 mt-0.5 text-pt-green-ink" />
                      <span>{a}</span>
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-pt-neutral/75">Aucun conseil pour ce véhicule.</p>
                )}
              </div>
              <SafetyChecks vehicleSlug={slug} />
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
                        <span className="block text-xs text-pt-neutral/75">{line.detail}</span>
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
                <p className="text-xs font-semibold uppercase text-pt-neutral/75 mb-2">Votre sélection</p>
                <div className="flex items-start justify-between gap-3">
                  <span>
                    Hébergement ({plural(nights, 'nuit', 'nuits')} · {effectiveAccom?.label || '—'})
                    <span className="block text-xs text-pt-neutral/75">
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
                    remainingAmount < 0 ? 'text-pt-danger' : 'text-pt-green-ink'
                  }`}
                >
                  {remainingAmount < 0
                    ? `Dépassement de ${formatEUR(-remainingAmount)}`
                    : `Reste ${formatEUR(remainingAmount)} pour activités`}
                </p>
              ) : (
                <p className="mt-2 text-xs text-pt-neutral/80">
                  Aucune enveloppe définie : fixez un budget dans l’onglet Budget.
                </p>
              )}
              {budget.max > 0 && remainingAmount < 0 && (
                <div className="mt-4 pt-4 border-t border-pt-green/20 text-sm" data-testid="accom-alternatives">
                  <p className="text-xs font-semibold uppercase text-pt-neutral/75 mb-2">Alternatives d’hébergement</p>
                  {accomAlternatives.length > 0 ? (
                    <div className="grid gap-2">
                      {accomAlternatives.map((alt) => (
                        <button
                          key={`${alt.option.id}-${alt.option.label}`}
                          type="button"
                          onClick={() => {
                            setSelectedAccom(alt.option)
                            setNightlyInput('')
                          }}
                          className="w-full text-left p-3 rounded-xl border-2 border-pt-line bg-white hover:border-pt-green/40"
                        >
                          <span className="flex items-center justify-between gap-3">
                            <span className="font-semibold">{alt.option.label}</span>
                            <span className="text-pt-orange-ink font-semibold">
                              ≈ {formatEUR(alt.perNight)}/nuit · {formatEUR(alt.lodging)}
                            </span>
                          </span>
                          <span className={`block text-xs mt-0.5 ${alt.fits ? 'text-pt-green-ink' : 'text-pt-danger'}`}>
                            {alt.fits
                              ? `Total ${formatEUR(alt.total)} : dans votre budget, reste ${formatEUR(alt.remaining)}`
                              : `Total ${formatEUR(alt.total)} : dépasse encore de ${formatEUR(-alt.remaining)}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-pt-neutral/80">
                      L’hébergement choisi est déjà le moins cher proposé pour ce véhicule : le dépassement vient surtout du trajet
                      ({formatEUR(baseTotal)} de frais de route, activités comprises). Votre budget reste inchangé ; vous pouvez le
                      relever, raccourcir le trajet ou saisir un prix d’hébergement plus bas.
                    </p>
                  )}
                </div>
              )}
            </Card>

            <Card>
              <SectionHeader title="Navigation GPS" />
              {hasCoords ? (
                <NavigationLinks
                  departure={trip.departure}
                  destination={trip.destination}
                  places={navPlaces}
                  nightStops={drivePlan?.stops || []}
                  coordinates={route?.coordinates || []}
                  returnTrip={Boolean(trip.returnTrip)}
                  constrained={Boolean(trip.vehicle?.heightM || trip.vehicle?.weightT)}
                />
              ) : (
                <p className="text-sm text-pt-neutral/75">
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
                    notice.tone === 'danger' ? 'text-pt-danger' : 'text-pt-green-ink'
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
