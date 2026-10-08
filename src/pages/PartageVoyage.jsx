import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, isApiError, isUnreachable } from '../lib/api.js'
import { Button, Card, EmptyState, Pill, SectionHeader, Skeleton, StatTile } from '../design/ui.jsx'
import { formatDistance, formatDuration, formatRange, plural } from '../domain/format.js'
import { vehicleFor } from '../lib/tripInfo.js'

const MapView = lazy(() => import('../components/MapView.jsx'))

function markersFor(trip) {
  const stops = [...(trip.places || [])].sort((a, b) => (a.order || 0) - (b.order || 0))
  return [
    { lat: trip.departure.lat, lon: trip.departure.lon, label: `Départ · ${trip.departure.name}`, kind: 'start' },
    ...stops.map((p) => ({ lat: p.lat, lon: p.lon, label: p.name, kind: 'stop' })),
    { lat: trip.destination.lat, lon: trip.destination.lon, label: `Arrivée · ${trip.destination.name}`, kind: 'end' },
  ].filter((m) => m.lat != null && m.lon != null)
}

/** Page publique d'un voyage partagé : lecture seule, aucune donnée personnelle, non indexée. */
export default function PartageVoyage() {
  const { token } = useParams()
  const [state, setState] = useState({ status: 'loading', trip: null })

  useEffect(() => {
    let alive = true
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex, nofollow'
    document.head.appendChild(robots)
    api(`/shared/${encodeURIComponent(token)}`)
      .then((data) => alive && setState({ status: 'ok', trip: data.trip }))
      .catch((err) => {
        if (!alive) return
        if (isApiError(err) && err.status === 404) setState({ status: 'gone', trip: null })
        else if (isUnreachable(err)) setState({ status: 'offline', trip: null })
        else setState({ status: 'error', trip: null })
      })
    return () => {
      alive = false
      robots.remove()
    }
  }, [token])

  useEffect(() => {
    if (state.trip) document.title = `${state.trip.name} · PlanTrip`
    return () => {
      document.title = 'PlanTrip — Préparez votre voyage sur mesure'
    }
  }, [state.trip])

  if (state.status === 'loading') {
    return (
      <div className="max-w-5xl mx-auto px-5 py-10 lg:px-8" aria-busy="true">
        <Skeleton className="h-8 w-64" lines={1} />
        <Skeleton className="h-72 w-full mt-6" lines={1} />
      </div>
    )
  }

  if (state.status !== 'ok') {
    const message = {
      gone: ['Ce lien de partage n’existe plus', 'Son auteur l’a peut-être désactivé, ou le voyage a été supprimé.'],
      offline: ['Serveur injoignable', 'Vérifiez votre connexion puis rechargez la page.'],
      error: ['Impossible d’afficher ce voyage', 'Réessayez dans un instant.'],
    }[state.status]
    return (
      <div className="max-w-3xl mx-auto px-5 py-16 lg:px-8">
        <EmptyState
          icon="map"
          title={message[0]}
          description={message[1]}
          action={
            <Button to="/preparer-son-voyage" icon="route">
              Préparer mon propre voyage
            </Button>
          }
        />
      </div>
    )
  }

  const trip = state.trip
  const vehicle = vehicleFor(trip)
  const stops = [...(trip.places || [])].sort((a, b) => (a.order || 0) - (b.order || 0))
  const km = trip.itinerary?.distanceKm || 0
  const days = trip.dates?.days || 0

  return (
    <div className="max-w-5xl mx-auto px-5 py-8 lg:px-8" data-testid="shared-trip">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Pill tone="blue" icon="eye">
          Lecture seule
        </Pill>
        <Pill tone="neutral" icon="lock">
          Lien de partage
        </Pill>
      </div>
      <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight">{trip.name}</h1>
      <p className="mt-1 text-pt-neutral/80">
        {trip.departure.name} → {trip.destination.name}
        {trip.returnTrip ? ' (aller-retour)' : ''}
      </p>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 my-6">
        <StatTile icon="route" label="Distance" value={km > 0 ? formatDistance(km * 1000) : '—'} tone="green" />
        <StatTile
          icon="clock"
          label="Temps de trajet"
          value={trip.itinerary?.durationSec > 0 ? formatDuration(trip.itinerary.durationSec) : '—'}
          tone="blue"
        />
        <StatTile
          icon="calendar"
          label="Dates"
          value={trip.dates?.start ? formatRange(trip.dates.start, trip.dates.end) : '—'}
          hint={days ? plural(days, 'jour', 'jours') : ''}
          tone="orange"
        />
        <StatTile
          icon="users"
          label="Voyageurs"
          value={trip.travelers || '—'}
          hint={vehicle?.name || ''}
          tone="neutral"
        />
      </section>

      <Suspense fallback={<Skeleton className="h-80 w-full" lines={1} />}>
        <MapView coordinates={trip.itinerary?.polyline || []} markers={markersFor(trip)} height={360} />
      </Suspense>
      {trip.departureHidden && (
        <p className="mt-2 text-xs text-pt-neutral/75" data-testid="departure-hidden-note">
          Le point de départ exact et le début du tracé sont masqués par l’auteur du voyage.
        </p>
      )}

      {stops.length > 0 && (
        <Card className="mt-6">
          <SectionHeader title="Étapes" />
          <ol className="grid gap-2 text-sm">
            {stops.map((p, i) => (
              <li key={`${p.name}-${i}`} className="flex gap-2.5">
                <span className="font-semibold tabular-nums text-pt-green-ink">{i + 1}.</span>
                <span>{p.name}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Card className="mt-6 text-center">
        <p className="font-display font-semibold">Un voyage à préparer ?</p>
        <p className="mt-1 text-sm text-pt-neutral/80">
          PlanTrip calcule l’itinéraire, le budget et les étapes adaptés à votre véhicule.
        </p>
        <div className="mt-4 flex justify-center">
          <Button to="/preparer-son-voyage" icon="route">
            Préparer mon voyage
          </Button>
        </div>
        <p className="mt-3 text-xs text-pt-neutral/75">
          <Link to="/confidentialite" className="underline">
            Confidentialité
          </Link>
        </p>
      </Card>
    </div>
  )
}
