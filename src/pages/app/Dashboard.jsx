import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/authContext.js'
import { useTrips, useCurrentTrip, useMemory } from '../../state/store.js'
import { Icon } from '../../design/Icon.jsx'
import { Button, PageHeader, SectionHeader, StatTile, EmptyState, Card, Pill } from '../../design/ui.jsx'
import TripCard from '../../components/TripCard.jsx'
import { vehicleFor } from '../../lib/tripInfo.js'
import { formatEUR, formatDayLabel, plural, daysBetween } from '../../domain/format.js'
import { spentTotal, remaining } from '../../domain/budget.js'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export default function Dashboard() {
  const { user } = useAuth()
  const trips = useTrips()
  const current = useCurrentTrip()
  const memory = useMemory()

  const stats = useMemo(() => {
    const active = trips.filter((t) => t.status !== 'done')
    const today = new Date().toISOString().slice(0, 10)
    const upcoming = active
      .filter((t) => !t.dates?.end || t.dates.end >= today)
      .sort((a, b) => String(a.dates?.start).localeCompare(String(b.dates?.start)))
    const next = upcoming[0] || null
    const budgetMax = active.reduce((s, t) => s + (Number(t.budget?.max) || 0), 0)
    const spent = active.reduce((s, t) => s + spentTotal(t.budget), 0)
    return {
      active,
      upcoming,
      next,
      budgetMax,
      spent,
      left: Math.max(0, budgetMax - spent),
      recent: [...trips]
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
        .slice(0, 6),
    }
  }, [trips])

  const hasDraft = Boolean(current)
  const isEmpty = trips.length === 0
  const daysToNext = stats.next
    ? Math.max(0, daysBetween(new Date().toISOString().slice(0, 10), stats.next.dates?.start))
    : null

  return (
    <div>
      <PageHeader
        eyebrow={new Intl.DateTimeFormat('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }).format(new Date())}
        title={`${greeting()}${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        subtitle={
          isEmpty
            ? 'Commencez par décrire votre voyage : le moteur construit l’itinéraire, le budget et les étapes.'
            : 'Voici l’état de vos voyages, de votre budget et des prochaines étapes.'
        }
        actions={
          <Button to="/preparer-son-voyage" icon="plus">
            Préparer un voyage
          </Button>
        }
      />

      {isEmpty ? (
        <EmptyState
          icon="suitcase"
          title="Aucun voyage pour l’instant"
          description="Définissez le départ, la destination, le véhicule et le budget : PlanTrip calcule le reste en quelques secondes."
          action={
            <Button to="/preparer-son-voyage" iconRight="arrow-right">
              Créer mon premier voyage
            </Button>
          }
          secondaryAction={
            <Button to="/fonctionnalites" variant="secondary" icon="sparkle">
              Voir ce que ça fait
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
            <StatTile
              icon="suitcase"
              tone="green"
              label="Voyages actifs"
              value={stats.active.length}
              hint={plural(trips.length - stats.active.length, 'terminé', 'terminés')}
            />
            <StatTile
              icon="calendar"
              tone="blue"
              label="Prochain départ"
              value={stats.next ? formatDayLabel(stats.next.dates?.start) : '—'}
              hint={
                stats.next
                  ? daysToNext === 0
                    ? 'C’est parti !'
                    : `Dans ${plural(daysToNext, 'jour', 'jours')}`
                  : 'Aucun départ prévu'
              }
            />
            <StatTile
              icon="wallet"
              tone="orange"
              label="Budget restant"
              value={formatEUR(stats.left)}
              hint={`sur ${formatEUR(stats.budgetMax)}`}
            />
            <StatTile
              icon="receipt"
              tone="neutral"
              label="Déjà dépensé"
              value={formatEUR(stats.spent)}
              hint={
                stats.budgetMax > 0
                  ? `${Math.round((stats.spent / stats.budgetMax) * 100)} % de l’enveloppe`
                  : 'enveloppe non définie'
              }
            />
          </div>

          {hasDraft && (
            <Card className="mb-8 flex flex-wrap items-center justify-between gap-4 border-pt-orange/40 bg-pt-orange-soft">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-pt-orange-ink">
                  <Icon name="edit" size={19} />
                </span>
                <div>
                  <p className="font-semibold text-[15px]">Un voyage est en cours de préparation</p>
                  <p className="text-sm text-pt-neutral/65 mt-0.5">
                    {current?.departure?.name?.split(',')[0]} → {current?.destination?.name?.split(',')[0]}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button to="/resultat-voyage" size="sm" variant="secondary">
                  Voir le résultat
                </Button>
                <Button to="/preparer-son-voyage" size="sm" icon="edit">
                  Modifier
                </Button>
              </div>
            </Card>
          )}

          {stats.next && (
            <section className="mb-8">
              <SectionHeader
                title="Votre prochain voyage"
                action={
                  <Link
                    to={`/voyages/${stats.next.id}`}
                    className="text-sm font-semibold text-pt-green hover:underline"
                  >
                    Tout afficher
                  </Link>
                }
              />
              <NextTripBanner trip={stats.next} />
            </section>
          )}

          <section>
            <SectionHeader
              title="Voyages récents"
              subtitle={plural(trips.length, 'voyage enregistré', 'voyages enregistrés')}
              action={
                <Link to="/mes-voyages" className="text-sm font-semibold text-pt-green hover:underline">
                  Gérer
                </Link>
              }
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {stats.recent.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          </section>

          {memory?.trips_count > 0 && (
            <p className="mt-8 text-xs text-pt-neutral/45">
              {plural(memory.trips_count, 'voyage construit', 'voyages construits')} depuis votre première visite ·
              données stockées sur cet appareil
            </p>
          )}
        </>
      )}
    </div>
  )
}

function NextTripBanner({ trip }) {
  const vehicle = vehicleFor(trip)
  const left = remaining(trip.budget)
  return (
    <Link
      to={`/voyages/${trip.id}`}
      className="card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5 hover:shadow-pop transition-shadow"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-pt-cream overflow-hidden">
        {vehicle?.image ? (
          <img src={vehicle.image} alt="" className="h-11 w-11 object-contain" />
        ) : (
          <Icon name="map" size={24} className="text-pt-green" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h3 className="font-display font-semibold text-lg truncate">{trip.name}</h3>
          <Pill tone={trip.status === 'ongoing' ? 'blue' : 'green'}>
            {trip.status === 'ongoing' ? 'En cours' : 'Prêt à partir'}
          </Pill>
        </div>
        <p className="text-sm text-pt-neutral/60">
          {formatDayLabel(trip.dates?.start)} → {formatDayLabel(trip.dates?.end)} ·{' '}
          {plural(trip.dates?.days || 1, 'jour', 'jours')} · {plural(trip.travelers || 1, 'voyageur', 'voyageurs')}
        </p>
      </div>
      <div className="sm:text-right">
        <p className="text-xs text-pt-neutral/50">Reste à dépenser</p>
        <p className="font-display font-semibold text-xl tabular-nums text-pt-green">{formatEUR(left)}</p>
      </div>
      <Icon name="chevron-right" size={22} className="text-pt-neutral/30 hidden sm:block" />
    </Link>
  )
}
