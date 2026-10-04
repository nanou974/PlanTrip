import { Link } from 'react-router-dom'
import { Icon } from '../design/Icon.jsx'
import { Pill, Progress } from '../design/ui.jsx'
import { formatRange, formatEUR, plural } from '../domain/format.js'
import { spentTotal, progressPct, budgetStatus, STATUS_TONE } from '../domain/budget.js'
import { vehicleFor, tripStatus, vehicleIcon } from '../lib/tripInfo.js'

export default function TripCard({ trip, compact = false, actions }) {
  const vehicle = vehicleFor(trip)
  const status = tripStatus(trip)
  const spent = spentTotal(trip.budget)
  const pct = progressPct(trip.budget)
  const tone = budgetStatus(trip.budget) ? STATUS_TONE[budgetStatus(trip.budget)] : 'green'
  const days = trip?.dates?.days || 1


  return (
    <article className="card p-4 sm:p-5 flex flex-col gap-3.5 group hover:shadow-pop transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pt-cream overflow-hidden">
            {vehicle?.image ? (
              <img src={vehicle.image} alt="" className="h-9 w-9 object-contain" />
            ) : (
              <Icon name="suitcase" size={20} className="text-pt-neutral/75" />
            )}
          </span>
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-[15px] leading-snug truncate">{trip.name}</h3>
            <p className="text-xs text-pt-neutral/80 truncate">
              {formatRange(trip.dates?.start, trip.dates?.end)}
            </p>
          </div>
        </div>
        <Pill tone={status.tone}>{status.label}</Pill>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-pt-neutral/80">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="calendar" size={14} />
          {plural(days, 'jour', 'jours')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Icon name="users" size={14} />
          {plural(trip.travelers || 1, 'voyageur', 'voyageurs')}
        </span>
        {vehicle && (
          <span className="inline-flex items-center gap-1.5">
            <Icon name={vehicleIcon(vehicle)} size={14} />
            {vehicle.name}
          </span>
        )}
      </div>

      {!compact && (
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs text-pt-neutral/80">Dépensé sur {formatEUR(trip.budget?.max)}</span>
            <span className="text-xs font-semibold tabular-nums">
              {formatEUR(spent)}
              {pct !== null && <span className="text-pt-neutral/75 font-normal"> · {pct}%</span>}
            </span>
          </div>
          <Progress
            value={spent}
            max={trip.budget?.max || 1}
            tone={tone}
            label={`Budget consommé — ${trip.name || 'voyage'}`}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1 mt-auto">
        <Link
          to={`/voyages/${trip.id}`}
          className="text-sm font-semibold text-pt-green-ink hover:text-pt-green-dark inline-flex items-center gap-1.5"
        >
          Ouvrir
          <Icon name="chevron-right" size={15} />
        </Link>
        {actions ?? (
          <Link to={`/voyages/${trip.id}/budget`} className="text-xs text-pt-neutral/75 hover:text-pt-neutral">
            Voir le budget
          </Link>
        )}
      </div>
    </article>
  )
}
