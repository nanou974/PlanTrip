import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import PlaceSearch from '../../../components/PlaceSearch.jsx'
import { Button, Card, IconButton, Pill, SectionHeader, Skeleton, Spinner, Toggle } from '../../../design/ui.jsx'
import { Icon } from '../../../design/Icon.jsx'
import { formatDistance, formatDuration, plural } from '../../../domain/format.js'
import {
  addPlace,
  estimateItinerary,
  isGeoPoint,
  movePlace,
  removePlace,
  routePlaces,
  sortPlaces,
  withRoutePlaces,
} from '../../../domain/itinerary.js'
import { DEGRADED_NOTICE, buildGpx, downloadFile, fetchRoute, profileForVehicle, routePoints } from '../../../services/routing.js'
import { vehicleFor } from '../../../lib/tripInfo.js'
import { upsertTrip } from '../../../state/store.js'

const EMPTY_ROUTE = { distanceKm: 0, durationSec: 0, coordinates: [], steps: [], estimated: false }
const MapView = lazy(() => import('../../../components/MapView.jsx'))

export default function TripItinerary() {
  const { trip } = useOutletContext()
  const tripRef = useRef(trip)
  const abortRef = useRef(null)
  const [route, setRoute] = useState(() => fromStored(trip.itinerary))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    tripRef.current = trip
  }, [trip])

  const stops = routePlaces(trip.places)
  const allPlaces = sortPlaces(trip.places)

  const markers = [
    { lat: trip.departure.lat, lon: trip.departure.lon, label: `Départ · ${trip.departure.name}`, kind: 'start' },
    ...allPlaces.map((p) => ({ lat: p.lat, lon: p.lon, label: p.name, kind: 'stop' })),
    { lat: trip.destination.lat, lon: trip.destination.lon, label: `Arrivée · ${trip.destination.name}`, kind: 'end' },
  ].filter(isGeoPoint)

  const pointsFor = useCallback(
    (places) =>
      routePoints({
        departure: trip.departure,
        destination: trip.destination,
        waypoints: places,
        returnTrip: trip.returnTrip,
      }),
    [trip.departure, trip.destination, trip.returnTrip],
  )

  /**
   * Calcule (ou recalcule) l'itinéraire et le persiste.
   * Sans `force`, un tracé déjà enregistré est réutilisé tel quel.
   */
  const compute = useCallback(
    async ({ force = false, places = null } = {}) => {
      const current = tripRef.current
      const stored = current.itinerary
      if (!force && stored?.distanceKm > 0 && stored.polyline?.length) return

      const points = pointsFor(places ?? routePlaces(current.places))
      if (points.length < 2) {
        setRoute(EMPTY_ROUTE)
        setError('')
        setNotice('')
        return
      }

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setBusy(true)
      setError('')
      setNotice('')

      const vehicle = vehicleFor(current)
      try {
        const result = await fetchRoute(points, {
          profile: profileForVehicle(current.vehicle?.slug),
          vehicle: current.vehicle?.slug,
          avoidTolls: Boolean(current.preferences?.avoidTolls),
          avoidHighways: Boolean(current.preferences?.avoidHighways),
          heightM: current.vehicle?.heightM,
          weightT: current.vehicle?.weightT,
          signal: controller.signal,
        })
        const next = {
          distanceKm: Math.round(result.distance / 100) / 10,
          durationSec: Math.round(result.duration),
          coordinates: result.coordinates,
          steps: result.steps,
          estimated: false,
        }
        setRoute(next)
        upsertTrip({ ...current, itinerary: toItinerary(next) })
        if (result.degraded) setNotice(`Itinéraire enregistré. ${DEGRADED_NOTICE}`)
        else setNotice('Itinéraire calculé et enregistré.')
      } catch (err) {
        if (err?.name === 'AbortError') return
        const estimated = estimateItinerary(points, vehicle?.routing?.avgSpeedKph || 90)
        setRoute({
          distanceKm: estimated.distanceKm,
          durationSec: estimated.durationSec,
          coordinates: estimated.polyline,
          steps: [],
          estimated: true,
        })
        upsertTrip({ ...current, itinerary: estimated })
        setError('Service de calcul d’itinéraire injoignable : tracé estimé à vol d’oiseau × 1,25.')
      } finally {
        setBusy(false)
      }
    },
    [pointsFor],
  )

  useEffect(() => {
    compute()
    return () => abortRef.current?.abort()
  }, [trip.id, compute])

  function persistPlaces(next) {
    const updated = { ...tripRef.current, places: withRoutePlaces(tripRef.current.places, next) }
    tripRef.current = updated
    upsertTrip(updated)
    compute({ force: true, places: next })
  }

  function toggleReturn() {
    const updated = { ...tripRef.current, returnTrip: !tripRef.current.returnTrip }
    tripRef.current = updated
    upsertTrip(updated)
    compute({ force: true, places: routePlaces(updated.places) })
  }

  function exportGpx() {
    const gpx = buildGpx({
      name: trip.name,
      points: pointsFor(stops),
      route: { coordinates: route.coordinates },
    })
    downloadFile(`${slugify(trip.name) || 'itineraire'}.gpx`, gpx)
    setNotice('Fichier GPX généré — importable dans n’importe quel traceur.')
  }

  const hasRoute = route.coordinates.length >= 2
  const vehicle = vehicleFor(trip)

  return (
    <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">
      <Card className="lg:col-span-2 p-5 sm:p-6">
        <SectionHeader
          title="Points du trajet"
          subtitle={`${plural(stops.length, 'étape intermédiaire', 'étapes intermédiaires')}`}
        />

        <ol className="mt-4 space-y-2">
          <EndpointRow
            kind="start"
            label="Départ"
            title={trip.departure.name}
            subtitle={trip.departure.context}
          />

          {stops.map((place, index) => (
            <li key={place.id}>
              <div className="flex items-start gap-3 rounded-xl border border-pt-line bg-pt-cream/70 p-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pt-orange text-xs font-bold">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{place.name}</p>
                  {place.context && <p className="truncate text-xs text-pt-neutral/75">{place.context}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <IconButton
                    label="Monter"
                    icon="chevron-up"
                    size={30}
                    disabled={index === 0}
                    onClick={() => persistPlaces(movePlace(stops, index, -1))}
                  />
                  <IconButton
                    label="Descendre"
                    icon="chevron-down"
                    size={30}
                    disabled={index === stops.length - 1}
                    onClick={() => persistPlaces(movePlace(stops, index, 1))}
                  />
                  <IconButton
                    label={`Retirer ${place.name}`}
                    icon="trash"
                    size={30}
                    className="hover:text-pt-danger"
                    onClick={() => persistPlaces(removePlace(stops, place.id))}
                  />
                </div>
              </div>
            </li>
          ))}

          <EndpointRow kind="end" label="Arrivée" title={trip.destination.name} subtitle={trip.destination.context} />
        </ol>

        <div className="mt-5">
          <PlaceSearch
            label="Ajouter une étape"
            placeholder="Ville, village, adresse…"
            onSelect={(place) => persistPlaces(routePlaces(addPlace(tripRef.current, place)))}
          />
        </div>

        <div className="mt-5 rounded-xl bg-pt-green-soft/70 p-4">
          <Toggle
            checked={Boolean(trip.returnTrip)}
            onChange={toggleReturn}
            label="Aller-retour"
            hint="Reprend le trajet à l’envers via les mêmes étapes."
          />
        </div>
      </Card>

      <div className="lg:col-span-3 space-y-4 sm:space-y-6">
        <Card className="p-5 sm:p-6">
          <SectionHeader
            title="Carte"
            subtitle={
              route.distanceKm > 0
                ? `${trip.departure.name || 'Départ'} → ${trip.destination.name || 'Arrivée'}`
                : 'Ajoutez un départ et une destination géolocalisés.'
            }
            action={
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" icon="download" onClick={exportGpx} disabled={!hasRoute}>
                  GPX
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon="refresh"
                  onClick={() => compute({ force: true })}
                  disabled={busy}
                >
                  {busy ? 'Calcul…' : 'Recalculer'}
                </Button>
              </div>
            }
          />
          <Suspense fallback={<Skeleton className="h-[360px]" lines={1} />}>
            <MapView coordinates={route.coordinates} markers={markers} height={360} />
          </Suspense>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <Figure label="Distance" value={route.distanceKm > 0 ? formatDistance(route.distanceKm * 1000) : '—'} icon="route" />
            <Figure label="Durée" value={route.durationSec > 0 ? formatDuration(route.durationSec) : '—'} icon="clock" />
            <Figure label="Étapes" value={String(stops.length)} icon="pin" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Pill tone={route.estimated ? 'orange' : 'green'} icon={route.estimated ? 'info' : 'check'}>
              {route.estimated ? 'Tracé estimé' : 'Route calculée'}
            </Pill>
            {vehicle && <Pill tone="neutral" icon="car">{vehicle.name}</Pill>}
            {busy && <Spinner size={16} />}
          </div>

          {error && <p className="mt-2 text-sm text-pt-danger">{error}</p>}
          {!error && notice && <p className="mt-2 text-sm text-pt-green-ink">{notice}</p>}
        </Card>

        <Card className="p-5 sm:p-6">
          <SectionHeader
            title="Feuille de route"
            subtitle={route.steps?.length ? `${route.steps.length} indications de conduite` : 'Détaillée après calcul.'}
          />
          {route.steps?.length ? (
            <ol className="mt-3 max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {route.steps.map((step, index) => (
                <li key={`${index}-${step.instruction}`} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 w-6 shrink-0 text-right font-mono text-xs text-pt-neutral/70">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{step.instruction}</span>
                    {step.name && <span className="text-pt-neutral/80"> · {step.name}</span>}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-pt-neutral/75">
                    {step.distance > 0 ? formatDistance(step.distance) : ''}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-pt-neutral/80">
              {busy
                ? 'Calcul de l’itinéraire…'
                : 'Aucune indication détaillée : le tracé est une estimation directe entre les points.'}
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}

function EndpointRow({ kind, label, title, subtitle }) {
  const isStart = kind === 'start'
  return (
    <li>
      <div className="flex items-start gap-3 rounded-xl border border-pt-line bg-white p-3">
        <span
          className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white shadow-sm"
          style={{ background: isStart ? '#2E7D5B' : '#2B2F33', boxShadow: '0 0 0 1px rgba(43,47,51,.15)' }}
        />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-pt-neutral/75">{label}</p>
          <p className="truncate text-sm font-medium">{title || 'Non renseigné'}</p>
          {subtitle && <p className="truncate text-xs text-pt-neutral/75">{subtitle}</p>}
        </div>
        {isStart && (
          <Icon name="navigation" size={16} className="ml-auto shrink-0 text-pt-green-ink/60" aria-hidden="true" />
        )}
      </div>
    </li>
  )
}

function Figure({ label, value, icon }) {
  return (
    <div className="rounded-xl bg-pt-cream p-3 text-center">
      <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-white text-pt-neutral/80">
        <Icon name={icon} size={15} />
      </span>
      <p className="mt-1.5 font-display font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-pt-neutral/75">{label}</p>
    </div>
  )
}

function fromStored(stored) {
  if (!(stored?.distanceKm > 0) || !stored.polyline?.length) return EMPTY_ROUTE
  return {
    distanceKm: stored.distanceKm,
    durationSec: stored.durationSec,
    coordinates: stored.polyline,
    steps: [],
    estimated: Boolean(stored.estimated),
  }
}

function toItinerary(route) {
  return {
    distanceKm: route.distanceKm,
    durationSec: route.durationSec,
    polyline: route.coordinates,
    estimated: route.estimated,
    steps: route.steps,
  }
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
