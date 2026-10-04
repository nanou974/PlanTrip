import { useMemo, useState } from 'react'
import { useTrips, upsertTrip, deleteTrip } from '../../state/store.js'
import { newTripId } from '../../domain/trip.js'
import { sortTrips } from '../../domain/trip.js'
import { Icon } from '../../design/Icon.jsx'
import {
  Button,
  PageHeader,
  EmptyState,
  Modal,
  Pill,
  TextInput,
  SelectInput,
} from '../../design/ui.jsx'
import TripCard from '../../components/TripCard.jsx'

const STATUS_FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'active', label: 'À venir' },
  { id: 'ongoing', label: 'En cours' },
  { id: 'done', label: 'Terminés' },
]

const SORTS = [
  { id: 'start', label: 'Par date de départ' },
  { id: 'updated', label: 'Dernière modification' },
  { id: 'name', label: 'Ordre alphabétique' },
]

export default function Trips() {
  const trips = useTrips()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('start')
  const [toDelete, setToDelete] = useState(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = trips
    if (q) {
      list = list.filter((t) =>
        [t.name, t.departure?.name, t.destination?.name, t.vehicle?.model]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      )
    }
    if (status === 'active') list = list.filter((t) => t.status === 'draft' || t.status === 'ready')
    if (status === 'ongoing') list = list.filter((t) => t.status === 'ongoing')
    if (status === 'done') list = list.filter((t) => t.status === 'done')
    return sortTrips(list, sort)
  }, [trips, query, status, sort])

  function duplicate(trip) {
    const now = new Date().toISOString()
    upsertTrip({
      ...trip,
      id: newTripId(),
      name: `${trip.name} (copie)`,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    })
  }

  function confirmDelete() {
    if (toDelete) deleteTrip(toDelete.id)
    setToDelete(null)
  }

  return (
    <div>
      <PageHeader
        eyebrow={trips.length > 0 ? `${trips.length} au total` : undefined}
        title="Mes voyages"
        subtitle="Tous vos voyages sont enregistrés sur cet appareil, hors connexion."
        actions={
          <Button to="/preparer-son-voyage" icon="plus">
            Nouveau voyage
          </Button>
        }
      />

      {trips.length === 0 ? (
        <EmptyState
          icon="suitcase"
          title="Votre liste est vide"
          description="Créez votre premier voyage pour suivre l’itinéraire, le budget, les lieux et les documents au même endroit."
          action={
            <Button to="/preparer-son-voyage" iconRight="arrow-right">
              Préparer un voyage
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 mb-5">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pt-neutral/70 pointer-events-none">
                <Icon name="search" size={17} />
              </span>
              <TextInput
                id="trip-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un voyage, une ville…"
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 p-1 bg-white rounded-xl border border-pt-line overflow-x-auto no-scrollbar">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatus(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      status === f.id ? 'bg-pt-green text-white' : 'text-pt-neutral/80 hover:bg-pt-neutral/5'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <label className="ml-auto flex items-center gap-2 text-xs text-pt-neutral/80">
                Trier
                <span className="w-40">
                  <SelectInput id="trip-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
                    {SORTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </SelectInput>
                </span>
              </label>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon="search"
              title="Aucun résultat"
              description="Aucun voyage ne correspond à cette recherche ou à ce filtre."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setQuery('')
                    setStatus('all')
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  actions={
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => duplicate(trip)}
                        aria-label={`Dupliquer ${trip.name}`}
                        title="Dupliquer"
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-pt-neutral/75 hover:text-pt-green-ink hover:bg-pt-green-soft transition-colors"
                      >
                        <Icon name="copy" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setToDelete(trip)}
                        aria-label={`Supprimer ${trip.name}`}
                        title="Supprimer"
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-pt-neutral/75 hover:text-pt-danger hover:bg-pt-danger-soft transition-colors"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </span>
                  }
                />
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => {
              const n =
                f.id === 'all'
                  ? trips.length
                  : f.id === 'active'
                    ? trips.filter((t) => t.status === 'draft' || t.status === 'ready').length
                    : trips.filter((t) => t.status === f.id).length
              return (
                <Pill key={f.id} tone="neutral">
                  {f.label} · {n}
                </Pill>
              )
            })}
          </div>
        </>
      )}

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Supprimer ce voyage ?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>
              Annuler
            </Button>
            <Button variant="danger" icon="trash" onClick={confirmDelete}>
              Supprimer définitivement
            </Button>
          </>
        }
      >
        <p className="text-sm text-pt-neutral/70">
          <strong>{toDelete?.name}</strong> et toutes ses données (itinéraire, budget, lieux, documents)
          seront supprimés de cet appareil. Cette action est irréversible.
        </p>
      </Modal>
    </div>
  )
}
