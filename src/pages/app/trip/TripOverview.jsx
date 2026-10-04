import { lazy, Suspense } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Button, Card, EmptyState, Progress, SectionHeader, Skeleton, StatTile } from '../../../design/ui.jsx'
import { Icon } from '../../../design/Icon.jsx'
import {
  formatDistance,
  formatDuration,
  formatEUR,
  formatDate,
  plural,
} from '../../../domain/format.js'
import {
  budgetStatus,
  remaining,
  spentTotal,
  topCategory,
  CATEGORY_LABEL,
} from '../../../domain/budget.js'
import { estimateItinerary, itineraryPoints, itineraryState, sortPlaces } from '../../../domain/itinerary.js'
import { vehicleFor } from '../../../lib/tripInfo.js'

const MapView = lazy(() => import('../../../components/MapView.jsx'))

function markersFor(trip) {
  const stops = sortPlaces(trip.places)
  return [
    { lat: trip.departure.lat, lon: trip.departure.lon, label: `Départ · ${trip.departure.name}`, kind: 'start' },
    ...stops.map((p) => ({ lat: p.lat, lon: p.lon, label: p.name, kind: 'stop' })),
    { lat: trip.destination.lat, lon: trip.destination.lon, label: `Arrivée · ${trip.destination.name}`, kind: 'end' },
  ].filter((m) => m && m.lat != null && m.lon != null)
}

export default function TripOverview() {
  const { trip } = useOutletContext()
  const vehicle = vehicleFor(trip)
  const avgSpeed = vehicle?.routing?.avgSpeedKph || 90

  const stored = trip.itinerary?.distanceKm > 0 ? trip.itinerary : null
  const route = stored || estimateItinerary(itineraryPoints(trip), avgSpeed)
  const state = itineraryState(trip)

  const spent = spentTotal(trip.budget)
  const rest = remaining(trip.budget)
  const pct = trip.budget?.max > 0 ? Math.round((spent / trip.budget.max) * 100) : null
  const top = topCategory(trip.budget)

  const checklist = trip.checklist || []
  const doneCount = checklist.filter((i) => i.done).length
  const places = sortPlaces(trip.places)

  return (
    <div>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatTile
          icon="route"
          label="Distance"
          value={route.distanceKm > 0 ? formatDistance(route.distanceKm * 1000) : '—'}
          hint={state === 'estimated' ? 'Estimation directe' : state === 'routed' ? 'Route calculée' : 'À calculer'}
          tone="green"
        />
        <StatTile
          icon="clock"
          label="Temps de trajet"
          value={route.durationSec > 0 ? formatDuration(route.durationSec) : '—'}
          hint={trip.dates?.days ? `${plural(trip.dates.days, 'jour', 'jours')} sur place` : ''}
          tone="blue"
        />
        <StatTile
          icon="wallet"
          label="Dépensé"
          value={formatEUR(spent)}
          hint={pct !== null ? `${pct} % du budget` : 'Budget libre'}
          tone="orange"
        />
        <StatTile
          icon="flag"
          label={rest >= 0 ? 'Reste à dépenser' : 'Dépassement'}
          value={formatEUR(Math.abs(rest))}
          hint={trip.budget?.max > 0 ? `Sur ${formatEUR(trip.budget.max)}` : 'Non défini'}
          tone={rest < 0 ? 'neutral' : 'green'}
        />
      </section>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2 p-5 sm:p-6">
          <SectionHeader
            title="Trajet"
            subtitle={
              route.distanceKm > 0
                ? `${trip.departure.name || 'Départ'} → ${trip.destination.name || 'Arrivée'}${
                    places.length ? ` · ${plural(places.length, 'étape', 'étapes')} intermédiaire(s)` : ''
                  }`
                : 'Renseignez un départ et une destination pour afficher la carte.'
            }
            action={
              <Button to={`/voyages/${trip.id}/itineraire`} variant="ghost" size="sm" iconRight="arrow-right">
                Itinéraire
              </Button>
            }
          />
          <Suspense fallback={<Skeleton className="h-[340px]" lines={1} />}>
            <MapView coordinates={route.polyline || []} markers={markersFor(trip)} height={340} />
          </Suspense>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-pt-cream p-3">
              <p className="text-[11px] uppercase tracking-wide text-pt-neutral/75">Distance</p>
              <p className="font-display font-semibold tabular-nums mt-0.5">
                {route.distanceKm > 0 ? formatDistance(route.distanceKm * 1000) : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-pt-cream p-3">
              <p className="text-[11px] uppercase tracking-wide text-pt-neutral/75">Durée</p>
              <p className="font-display font-semibold tabular-nums mt-0.5">
                {route.durationSec > 0 ? formatDuration(route.durationSec) : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-pt-cream p-3">
              <p className="text-[11px] uppercase tracking-wide text-pt-neutral/75">Étapes</p>
              <p className="font-display font-semibold tabular-nums mt-0.5">{places.length}</p>
            </div>
          </div>
        </Card>

        <div className="space-y-4 sm:space-y-6">
          <Card className="p-5">
            <SectionHeader
              title="Budget"
              action={
                <Button to={`/voyages/${trip.id}/budget`} variant="ghost" size="sm" iconRight="arrow-right">
                  Ouvrir
                </Button>
              }
            />
            <p className="font-display font-bold text-2xl tabular-nums mt-1">
              {formatEUR(spent)}
              <span className="text-base font-normal text-pt-neutral/70"> / {formatEUR(trip.budget?.max)}</span>
            </p>
            <Progress
              value={Math.min(100, pct ?? 0)}
              tone={budgetStatus(trip.budget) === 'over' ? 'danger' : budgetStatus(trip.budget) === 'warn' ? 'orange' : 'green'}
              className="mt-3"
              label="Budget consommé"
            />
            {top && (
              <p className="text-sm text-pt-neutral/80 mt-3">
                Poste le plus élevé : <strong className="text-pt-neutral">{CATEGORY_LABEL[top.id]}</strong> (
                {formatEUR(top.amount)})
              </p>
            )}
            <Link
              to={`/voyages/${trip.id}/budget`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-pt-green-ink hover:underline"
            >
              Ajouter une dépense <Icon name="arrow-right" size={15} />
            </Link>
          </Card>

          <Card className="p-5">
            <SectionHeader
              title="Organisation"
              action={
                <Button to={`/voyages/${trip.id}/organisation`} variant="ghost" size="sm" iconRight="arrow-right">
                  Ouvrir
                </Button>
              }
            />
            {checklist.length === 0 ? (
              <p className="text-sm text-pt-neutral/80 mt-1">
                Aucune tâche pour l’instant. Ajoutez vos démarches, réservations et préparatifs.
              </p>
            ) : (
              <>
                <p className="font-display font-bold text-2xl tabular-nums mt-1">
                  {doneCount}
                  <span className="text-base font-normal text-pt-neutral/70"> / {checklist.length}</span>
                </p>
                <Progress
                  value={Math.round((doneCount / checklist.length) * 100)}
                  className="mt-3"
                  label="Checklist du voyage"
                />
                <p className="text-sm text-pt-neutral/80 mt-3">
                  {doneCount === checklist.length ? 'Tout est prêt.' : `${checklist.length - doneCount} tâche(s) restante(s)`}
                </p>
              </>
            )}
          </Card>

          <Card className="p-5">
            <SectionHeader title="Rappels" />
            <ul className="mt-1 space-y-2.5 text-sm text-pt-neutral/70">
              <li className="flex gap-2.5">
                <Icon name="calendar" size={16} className="text-pt-green-ink shrink-0 mt-0.5" />
                {trip.dates?.start ? (
                  <span>Départ le {formatDate(trip.dates.start, { weekday: true })}</span>
                ) : (
                  <span>Date de départ à définir</span>
                )}
              </li>
              <li className="flex gap-2.5">
                <Icon name="pin" size={16} className="text-pt-green-ink shrink-0 mt-0.5" />
                <span>
                  {places.length} {plural(places.length, 'lieu enregistré', 'lieux enregistrés')}
                </span>
              </li>
              <li className="flex gap-2.5">
                <Icon name="id-card" size={16} className="text-pt-green-ink shrink-0 mt-0.5" />
                <span>
                  {(trip.documents || []).length} {(trip.documents || []).length > 1 ? 'documents' : 'document'}
                </span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {state === 'incomplete' && (
        <EmptyState
          className="mt-6"
          icon="map"
          title="Itinéraire incomplet"
          description="Un départ et une destination géolocalisés sont nécessaires pour calculer la route et afficher la carte."
          action={
            <Button to={`/voyages/${trip.id}/itineraire`} icon="route">
              Configurer l’itinéraire
            </Button>
          }
        />
      )}
    </div>
  )
}
