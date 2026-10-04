import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTrips } from '../../state/store.js'
import { Icon } from '../../design/Icon.jsx'
import { Button, PageHeader, SectionHeader, EmptyState, Card, Progress, Pill } from '../../design/ui.jsx'
import { formatEUR, formatPercent, formatRange } from '../../domain/format.js'
import {
  CATEGORIES,
  spentTotal,
  spentByCategory,
  progressPct,
  budgetStatus,
  STATUS_TONE,
} from '../../domain/budget.js'

export default function BudgetOverview() {
  const trips = useTrips()

  const data = useMemo(() => {
    const active = trips.filter((t) => (Number(t.budget?.max) || 0) > 0)
    const envelope = active.reduce((s, t) => s + (Number(t.budget.max) || 0), 0)
    const spent = active.reduce((s, t) => s + spentTotal(t.budget), 0)
    const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0]))
    for (const t of active) {
      const cat = spentByCategory(t.budget)
      for (const c of CATEGORIES) byCategory[c.id] = Math.round((byCategory[c.id] + cat[c.id]) * 100) / 100
    }
    const rows = active
      .map((t) => ({
        trip: t,
        max: Number(t.budget.max) || 0,
        spent: spentTotal(t.budget),
        pct: progressPct(t.budget),
        tone: STATUS_TONE[budgetStatus(t.budget)] || 'green',
      }))
      .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))
    const over = rows.filter((r) => (r.pct ?? 0) >= 100).length
    return { active, envelope, spent, left: envelope - spent, byCategory, rows, over }
  }, [trips])

  const maxCat = Math.max(1, ...Object.values(data.byCategory))

  if (data.active.length === 0) {
    return (
      <div>
        <PageHeader title="Budget" subtitle="Suivez ce que chaque voyage coûte réellement." />
        <EmptyState
          icon="wallet"
          title="Aucun budget à suivre"
          description="Définissez une enveloppe lors de la préparation d’un voyage : les dépenses s’afficheront ici, réparties par catégorie."
          action={
            <Button to="/preparer-son-voyage" icon="plus">
              Préparer un voyage
            </Button>
          }
        />
      </div>
    )
  }

  const pctTotal = data.envelope > 0 ? Math.round((data.spent / data.envelope) * 100) : 0

  return (
    <div>
      <PageHeader
        eyebrow="Vue d’ensemble"
        title="Budget"
        subtitle={`Agrégé sur ${data.active.length} voyage${data.active.length > 1 ? 's' : ''} avec une enveloppe définie.`}
        actions={
          <Button to="/preparer-son-voyage" icon="plus" variant="secondary">
            Nouveau voyage
          </Button>
        }
      />

      <Card className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-pt-neutral/75">
              Enveloppe totale
            </p>
            <p className="font-display font-bold text-3xl tabular-nums mt-1">{formatEUR(data.envelope)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-pt-neutral/75">Reste à dépenser</p>
            <p
              className={`font-display font-semibold text-2xl tabular-nums ${
                data.left < 0 ? 'text-pt-danger' : 'text-pt-green-ink'
              }`}
            >
              {formatEUR(data.left)}
            </p>
          </div>
        </div>
        <Progress
          value={data.spent}
          max={data.envelope || 1}
          tone={data.left < 0 ? 'danger' : 'green'}
          label="Budget global consommé"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-xs text-pt-neutral/80">
          <span>
            Dépensé {formatEUR(data.spent)} · {pctTotal} %
          </span>
          {data.over > 0 && (
            <Pill tone="danger" icon="alert">
              {data.over} voyage{data.over > 1 ? 's' : ''} au-dessus du budget
            </Pill>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <section>
          <SectionHeader title="Par catégorie" />
          <Card padded={false} className="divide-y divide-pt-line">
            {CATEGORIES.map((c) => {
              const value = data.byCategory[c.id]
              const share = data.spent > 0 ? Math.round((value / data.spent) * 100) : 0
              return (
                <div key={c.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="inline-flex items-center gap-2.5 text-sm font-medium">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pt-cream text-pt-neutral/80">
                        <Icon name={c.icon} size={15} />
                      </span>
                      {c.label}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatEUR(value)}
                      <span className="text-pt-neutral/70 font-normal"> · {share}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-pt-light overflow-hidden">
                    <div
                      className="h-full rounded-full bg-pt-green/70"
                      style={{ width: `${Math.round((value / maxCat) * 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </Card>
        </section>

        <section>
          <SectionHeader title="Par voyage" subtitle="Classés du plus tendu au plus souple" />
          <Card padded={false} className="divide-y divide-pt-line">
            {data.rows.map(({ trip, max, spent, pct, tone }) => (
              <Link
                key={trip.id}
                to={`/voyages/${trip.id}/budget`}
                className="block px-5 py-4 hover:bg-pt-cream/60 transition-colors"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-sm font-semibold truncate">{trip.name}</span>
                  <span className="text-sm tabular-nums shrink-0">
                    {formatEUR(spent)}
                    <span className="text-pt-neutral/70"> / {formatEUR(max)}</span>
                  </span>
                </div>
                <Progress
                  value={spent}
                  max={max || 1}
                  tone={tone}
                  label={`Budget consommé — ${trip.name || 'voyage'}`}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-pt-neutral/75">
                    {formatRange(trip.dates?.start, trip.dates?.end)}
                  </span>
                  <Pill tone={tone}>{pct !== null ? formatPercent(pct) : '—'}</Pill>
                </div>
              </Link>
            ))}
          </Card>
        </section>
      </div>
    </div>
  )
}
