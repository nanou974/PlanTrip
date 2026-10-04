import { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import PlaceSearch from '../../../components/PlaceSearch.jsx'
import {
  Button,
  Card,
  EmptyState,
  Pill,
  SectionHeader,
  SelectInput,
  Spinner,
  TextArea,
} from '../../../design/ui.jsx'
import { Icon } from '../../../design/Icon.jsx'
import { formatDistance, plural } from '../../../domain/format.js'
import {
  KIND_ICON,
  KIND_LABEL,
  PLACE_KINDS,
  addPlace,
  removePlace,
  sortPlaces,
} from '../../../domain/itinerary.js'
import { POI_CATEGORIES, categoryFor, routePolyline, searchAlongRoute } from '../../../services/places.js'
import { addToLibrary, isInLibrary, upsertTrip } from '../../../state/store.js'

const KIND_TONE = {
  stop: 'green',
  lodging: 'blue',
  restaurant: 'orange',
  poi: 'orange',
  'rest-area': 'neutral',
  fuel: 'neutral',
  address: 'neutral',
}

export default function TripPlaces() {
  const { trip } = useOutletContext()
  const [notice, setNotice] = useState('')
  const [searchCat, setSearchCat] = useState(POI_CATEGORIES[0].id)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  const [searchError, setSearchError] = useState('')
  const abortRef = useRef(null)
  const places = sortPlaces(trip.places)
  const totalDays = Math.max(1, Number(trip.dates?.days) || 1)
  const hasRoute = routePolyline(trip).length >= 2

  useEffect(() => () => abortRef.current?.abort(), [])

  function commit(next, message = '') {
    upsertTrip({ ...trip, places: next })
    if (message) setNotice(message)
    setTimeout(() => setNotice(''), 2500)
  }

  function patch(placeId, patch) {
    commit(places.map((p) => (p.id === placeId ? { ...p, ...patch } : p)))
  }

  async function runSearch() {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setSearchError('')
    setSearching(true)
    setResults([])
    try {
      const found = await searchAlongRoute(trip, {
        category: searchCat,
        limit: 12,
        signal: controller.signal,
      })
      setResults(found)
      if (!found.length) setSearchError('Aucun résultat dans un rayon de 6 km autour du trajet.')
    } catch (e) {
      if (e?.name !== 'AbortError') setSearchError(e?.message || 'Recherche impossible pour le moment.')
    } finally {
      if (abortRef.current === controller) setSearching(false)
    }
  }

  function addResult(result) {
    commit(
      addPlace(trip, {
        name: result.name,
        lat: result.lat,
        lon: result.lon,
        kind: result.kind,
        context: result.context,
      }),
      `${result.name} ajouté`,
    )
    setResults((prev) => prev.filter((r) => r.id !== result.id))
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="p-5 sm:p-6">
        <SectionHeader
          title="Lieux du voyage"
          subtitle={`${plural(places.length, 'lieu enregistré', 'lieux enregistrés')} · étapes, visites et hébergements`}
          action={
            <Pill tone="blue" icon="pin">
              {plural(places.length, 'lieu', 'lieux')}
            </Pill>
          }
        />
        <div className="mt-4">
          <PlaceSearch
            label="Ajouter un lieu"
            placeholder="Ville, monument, camping…"
            onSelect={(place) => commit(addPlace(trip, place), `${place.name} ajouté`)}
          />
        </div>
        {notice && <p className="mt-3 text-sm text-pt-green-ink">{notice}</p>}
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionHeader
          title="Explorer le long du trajet"
          subtitle="Restaurants, stations-service, aires et points d’intérêt repérés autour de votre itinéraire."
          action={
            <Pill tone="green" icon="search">
              OpenStreetMap
            </Pill>
          }
        />
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-[14rem] grow text-sm">
            <span className="field-label">Que cherchez-vous ?</span>
            <SelectInput
              value={searchCat}
              onChange={(e) => setSearchCat(e.target.value)}
              aria-label="Type de lieu à rechercher"
            >
              {POI_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </SelectInput>
          </label>
          <Button
            variant="primary"
            icon="search"
            onClick={runSearch}
            disabled={searching || !hasRoute}
          >
            {searching ? 'Recherche…' : 'Rechercher'}
          </Button>
        </div>

        {!hasRoute && (
          <p className="mt-3 text-sm text-pt-neutral/80">
            Définissez un départ et une destination pour explorer le long de la route.
          </p>
        )}
        {searching && (
          <p className="mt-4 flex items-center gap-2 text-sm text-pt-neutral/80">
            <Spinner size={16} />
            Interrogation d’OpenStreetMap…
          </p>
        )}
        {searchError && <p className="mt-3 text-sm text-pt-danger">{searchError}</p>}

        {results.length > 0 && (
          <ul className="mt-4 space-y-2">
            {results.map((result) => (
              <li
                key={result.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-pt-line bg-white p-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pt-cream text-pt-green-ink">
                  <Icon name={categoryFor(result.category).icon} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{result.name}</p>
                  <p className="truncate text-xs text-pt-neutral/75">
                    {result.context} · à {formatDistance(result.distanceMeters)} du trajet
                  </p>
                </div>
                <Button variant="secondary" size="sm" icon="plus" onClick={() => addResult(result)}>
                  Ajouter
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {places.length === 0 ? (
        <EmptyState
          icon="pin"
          title="Aucun lieu enregistré"
          description="Chaque étape ajoutée à l’itinéraire apparaît ici pour être classée, datée et annotée."
        />
      ) : (
        <ul className="space-y-3">
          {places.map((place, index) => (
            <li key={place.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pt-orange text-sm font-bold">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-semibold">{place.name}</p>
                    <p className="text-sm text-pt-neutral/80">{place.context || 'Coordonnées enregistrées'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Pill tone={KIND_TONE[place.kind] || 'green'} icon={KIND_ICON[place.kind]}>
                      {KIND_LABEL[place.kind] || 'Étape'}
                    </Pill>
                    <Pill tone="neutral">Jour {place.day || 1}</Pill>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    <span className="field-label">Type</span>
                    <SelectInput
                      value={place.kind}
                      onChange={(e) => patch(place.id, { kind: e.target.value })}
                      aria-label={`Type de ${place.name}`}
                    >
                      {PLACE_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {KIND_LABEL[kind]}
                        </option>
                      ))}
                    </SelectInput>
                  </label>
                  <label className="text-sm">
                    <span className="field-label">Jour</span>
                    <SelectInput
                      value={String(place.day || 1)}
                      onChange={(e) => patch(place.id, { day: Number(e.target.value) })}
                      aria-label={`Jour de ${place.name}`}
                    >
                      {Array.from({ length: totalDays }, (_, i) => (
                        <option key={i + 1} value={String(i + 1)}>
                          Jour {i + 1}
                        </option>
                      ))}
                    </SelectInput>
                  </label>
                </div>

                <div className="mt-3">
                  <TextArea
                    rows={2}
                    value={place.notes}
                    placeholder="Parking, horaires, réservation à faire…"
                    aria-label={`Notes pour ${place.name}`}
                    onChange={(e) => patch(place.id, { notes: e.target.value })}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={isInLibrary(place.id) ? 'check' : 'heart'}
                    onClick={() => {
                      if (isInLibrary(place.id)) return setNotice('Déjà dans vos favoris')
                      addToLibrary({
                        id: place.id,
                        name: place.name,
                        lat: place.lat,
                        lon: place.lon,
                        context: place.context,
                        tripId: trip.id,
                      })
                      setNotice('Ajouté à vos lieux favoris')
                      setTimeout(() => setNotice(''), 2500)
                    }}
                  >
                    Favori
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon="trash"
                    onClick={() => commit(removePlace(places, place.id), `${place.name} retiré`)}
                  >
                    Retirer
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Card className="p-5 flex items-start gap-3 bg-pt-cream">
        <Icon name="info" size={18} className="mt-0.5 shrink-0 text-pt-green-ink" />
        <p className="text-sm text-pt-neutral/70">
          Les lieux favoris sont enregistrés sur cet appareil et réutilisables dans vos prochains voyages.
        </p>
      </Card>
    </div>
  )
}
