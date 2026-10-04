import { useEffect } from 'react'
import { Link, NavLink, Navigate, Outlet, useParams } from 'react-router-dom'
import { useTrip } from '../../state/store.js'
import { Icon } from '../../design/Icon.jsx'
import { Pill } from '../../design/ui.jsx'
import { formatRange, formatEUR, plural } from '../../domain/format.js'
import { spentTotal, progressPct, budgetStatus, STATUS_TONE } from '../../domain/budget.js'
import { STATUS_LABEL } from '../../domain/trip.js'
import { vehicleFor, vehicleIcon } from '../../lib/tripInfo.js'

const TABS = [
  { key: '', label: 'Vue d’ensemble', icon: 'grid', end: true },
  { key: 'itineraire', label: 'Itinéraire', icon: 'route' },
  { key: 'calendrier', label: 'Calendrier', icon: 'calendar' },
  { key: 'budget', label: 'Budget', icon: 'wallet' },
  { key: 'lieux', label: 'Lieux', icon: 'pin' },
  { key: 'documents', label: 'Documents', icon: 'id-card' },
  { key: 'organisation', label: 'Organisation', icon: 'checklist' },
]

const STATUS_TONE_MAP = {
  draft: 'neutral',
  ready: 'green',
  ongoing: 'blue',
  done: 'neutral',
}

export default function TripLayout() {
  const { tripId } = useParams()
  const trip = useTrip(tripId)

  useEffect(() => {
    if (trip) document.title = `${trip.name} · PlanTrip`
    return () => {
      document.title = 'PlanTrip — Préparez votre voyage sur mesure'
    }
  }, [trip])

  if (!trip) return <Navigate to="/mes-voyages" replace />

  const vehicle = vehicleFor(trip)
  const spent = spentTotal(trip.budget)
  const pct = progressPct(trip.budget)
  const statusTone = STATUS_TONE[budgetStatus(trip.budget)] || 'green'

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3 text-sm text-pt-neutral/55">
        <Link to="/mes-voyages" className="inline-flex items-center gap-1.5 hover:text-pt-green">
          <Icon name="arrow-left" size={15} />
          Mes voyages
        </Link>
        <Icon name="chevron-right" size={13} className="opacity-50" />
        <span className="text-pt-neutral truncate">{trip.name}</span>
      </div>

      <header className="card p-5 sm:p-6 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pt-cream overflow-hidden">
              {vehicle?.image ? (
                <img src={vehicle.image} alt="" className="h-9 w-9 object-contain" />
              ) : (
                <Icon name={vehicleIcon(vehicle)} size={22} className="text-pt-neutral/50" />
              )}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display font-bold text-xl sm:text-2xl tracking-tight truncate">
                  {trip.name}
                </h1>
                <Pill tone={STATUS_TONE_MAP[trip.status] || 'neutral'}>
                  {STATUS_LABEL[trip.status] || 'Brouillon'}
                </Pill>
              </div>
              <p className="text-sm text-pt-neutral/60 mt-1">
                {formatRange(trip.dates?.start, trip.dates?.end)} ·{' '}
                {plural(trip.dates?.days || 1, 'jour', 'jours')} ·{' '}
                {plural(trip.travelers || 1, 'voyageur', 'voyageurs')}
                {vehicle ? ` · ${vehicle.name}` : ''}
                {trip.vehicle?.model ? ` (${trip.vehicle.model})` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-pt-neutral/50">
                {pct !== null ? `${pct} % dépensé` : 'Budget'}
              </p>
              <p className="font-display font-semibold text-lg tabular-nums">
                {formatEUR(spent)}
                <span className="text-pt-neutral/40 font-normal text-sm">
                  {' '}
                  / {formatEUR(trip.budget?.max)}
                </span>
              </p>
            </div>
            <Link
              to="/preparer-son-voyage"
              onClick={() => {
                sessionStorage.setItem('plantrip_edit_mode', '1')
                sessionStorage.setItem('plantrip_edit_trip', trip.id)
              }}
              className="btn-secondary"
              style={{ display: 'inline-flex' }}
            >
              Modifier
            </Link>
          </div>
        </div>

        <div className="mt-4 h-1.5 rounded-full bg-pt-light overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              statusTone === 'danger' ? 'bg-pt-danger' : statusTone === 'orange' ? 'bg-pt-orange' : 'bg-pt-green'
            }`}
            style={{ width: `${Math.min(100, pct ?? 0)}%` }}
          />
        </div>
      </header>

      <nav
        aria-label="Sections du voyage"
        className="flex gap-1 overflow-x-auto no-scrollbar border-b border-pt-line mb-6 -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {TABS.map((tab) => {
          const to = `/voyages/${trip.id}${tab.key ? `/${tab.key}` : ''}`
          return (
            <NavLink
              key={tab.key || 'overview'}
              to={to}
              end={tab.end}
              className={({ isActive }) =>
                `relative flex items-center gap-2 px-3.5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive ? 'text-pt-green' : 'text-pt-neutral/55 hover:text-pt-neutral'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={tab.icon} size={16} />
                  {tab.label}
                  {isActive && (
                    <span className="absolute left-3 right-3 -bottom-px h-0.5 rounded-full bg-pt-green" />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <Outlet key={trip.id} context={{ trip }} />
    </div>
  )
}
