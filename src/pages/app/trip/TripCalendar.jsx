import { useOutletContext } from 'react-router-dom'
import { Card, EmptyState, Pill, SectionHeader, SelectInput } from '../../../design/ui.jsx'
import { Icon } from '../../../design/Icon.jsx'
import { addDays, formatDayLabel, formatDate, plural } from '../../../domain/format.js'
import { sortPlaces } from '../../../domain/itinerary.js'
import { upsertTrip } from '../../../state/store.js'

export default function TripCalendar() {
  const { trip } = useOutletContext()

  if (!trip.dates?.start || !trip.dates?.end) {
    return (
      <EmptyState
        icon="calendar"
        title="Dates à définir"
        description="Renseignez une date de départ et de retour pour répartir vos étapes sur un calendrier."
      />
    )
  }

  const total = Math.max(1, Number(trip.dates.days) || 1)
  const stops = sortPlaces(trip.places)
  const unassigned = stops.filter((p) => (p.day || 1) > total)

  function setDay(placeId, day) {
    const next = stops.map((p) => (p.id === placeId ? { ...p, day: Number(day) } : p))
    upsertTrip({ ...trip, places: next })
  }

  const days = Array.from({ length: total }, (_, index) => {
    const number = index + 1
    const date = addDays(trip.dates.start, index)
    return {
      number,
      date,
      isFirst: index === 0,
      isLast: index === total - 1,
      stops: stops.filter((p) => Number(p.day || 1) === number),
    }
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="p-5 sm:p-6">
        <SectionHeader
          title="Calendrier du voyage"
          subtitle={`${plural(total, 'jour', 'jours')} · ${formatDayLabel(trip.dates.start)} → ${formatDayLabel(
            trip.dates.end,
          )}`}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Pill tone="green" icon="pin">
            {plural(stops.length, 'étape', 'étapes')} réparties
          </Pill>
          <Pill tone={unassigned.length ? 'orange' : 'neutral'} icon={unassigned.length ? 'alert' : 'check'}>
            {unassigned.length ? `${unassigned.length} sans jour` : 'Tout est attribué'}
          </Pill>
        </div>
      </Card>

      <ol className="space-y-4">
        {days.map((day) => (
          <li key={day.number}>
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-pt-green-soft text-pt-green-ink">
                    <span className="font-display text-sm font-bold leading-none">{day.number}</span>
                    <span className="text-[9px] uppercase tracking-wide">jour</span>
                  </span>
                  <div>
                    <p className="font-display font-semibold">
                      Jour {day.number}
                      {day.isFirst && <span className="ml-2 text-xs font-normal text-pt-green-ink">Départ</span>}
                      {day.isLast && <span className="ml-2 text-xs font-normal text-pt-neutral/80">Retour</span>}
                    </p>
                    <p className="text-sm text-pt-neutral/80">{formatDate(day.date, { weekday: true })}</p>
                  </div>
                </div>
                <span className="text-sm text-pt-neutral/75">
                  {plural(day.stops.length, 'étape', 'étapes')}
                </span>
              </div>

              <ul className="mt-4 space-y-2">
                {day.isFirst && (
                  <li className="flex items-center gap-3 rounded-xl border border-pt-line bg-white p-3">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-pt-green" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {trip.departure.name || 'Départ'}
                    </span>
                    <span className="shrink-0 text-xs text-pt-neutral/75">{trip.departureTime}</span>
                  </li>
                )}

                {day.stops.map((place) => (
                  <li
                    key={place.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-pt-line bg-pt-cream/60 p-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pt-orange text-[11px] font-bold">
                      {stops.indexOf(place) + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{place.name}</span>
                    <label className="flex items-center gap-2 text-xs text-pt-neutral/80">
                      Jour
                      <SelectInput
                        value={String(place.day || 1)}
                        onChange={(e) => setDay(place.id, e.target.value)}
                        className="w-20 py-1 text-xs"
                        aria-label={`Jour de ${place.name}`}
                      >
                        {days.map((d) => (
                          <option key={d.number} value={String(d.number)}>
                            {d.number}
                          </option>
                        ))}
                      </SelectInput>
                    </label>
                  </li>
                ))}

                {day.isLast && (
                  <li className="flex items-center gap-3 rounded-xl border border-pt-line bg-white p-3">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-pt-neutral" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {trip.destination.name || 'Arrivée'}
                    </span>
                    <span className="shrink-0 text-xs text-pt-neutral/75">{trip.arrivalTime}</span>
                  </li>
                )}

                {!day.stops.length && !day.isFirst && !day.isLast && (
                  <li className="flex items-center gap-2.5 rounded-xl border border-dashed border-pt-line p-3 text-sm text-pt-neutral/75">
                    <Icon name="calendar-day" size={16} />
                    Journée libre
                  </li>
                )}
              </ul>
            </Card>
          </li>
        ))}
      </ol>

      {unassigned.length > 0 && (
        <Card className="p-5">
          <SectionHeader title="Étapes hors calendrier" />
          <ul className="mt-3 space-y-2">
            {unassigned.map((place) => (
              <li key={place.id} className="flex items-center gap-3 rounded-xl border border-pt-line p-3">
                <span className="min-w-0 flex-1 truncate text-sm">{place.name}</span>
                <SelectInput
                  value={String(place.day || 1)}
                  onChange={(e) => setDay(place.id, e.target.value)}
                  className="w-24 py-1 text-xs"
                  aria-label={`Attribuer ${place.name} à un jour`}
                >
                  {days.map((d) => (
                    <option key={d.number} value={String(d.number)}>
                      Jour {d.number}
                    </option>
                  ))}
                </SelectInput>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
