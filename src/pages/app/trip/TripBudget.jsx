import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Button,
  Card,
  EmptyState,
  Field,
  Progress,
  SectionHeader,
  SelectInput,
  StatTile,
  TextInput,
} from '../../../design/ui.jsx'
import { Icon } from '../../../design/Icon.jsx'
import { formatEUR, formatDate } from '../../../domain/format.js'
import {
  CATEGORIES,
  CATEGORY_LABEL,
  addEntry,
  budgetStatus,
  createEntry,
  progressPct,
  remaining,
  removeEntry,
  spentByCategory,
  spentTotal,
  suggestAllocation,
  updateEntry,
} from '../../../domain/budget.js'
import { upsertTrip } from '../../../state/store.js'
import { estimateTripCosts } from '../../../domain/estimate.js'
import { vehicleFor } from '../../../lib/tripInfo.js'

const EMPTY_FORM = { label: '', amount: '', category: 'transport', date: '', note: '' }
const EMPTY_BUDGET = { max: 0, entries: [], plan: null }

export default function TripBudget() {
  const { trip } = useOutletContext()
  const budget = trip.budget || EMPTY_BUDGET
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [envelope, setEnvelope] = useState(String(budget.max || ''))

  const spent = spentTotal(budget)
  const rest = remaining(budget)
  const pct = progressPct(budget)
  const status = budgetStatus(budget)
  const byCategory = useMemo(() => spentByCategory(budget), [budget])
  const entries = useMemo(
    () => [...(budget.entries || [])].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))),
    [budget],
  )

  const estimation = useMemo(() => {
    const vehicle = vehicleFor(trip)
    if (!vehicle) return null
    return estimateTripCosts({
      vehicle,
      distanceKm: Number(trip.itinerary?.distanceKm) || 0,
      returnTrip: Boolean(trip.returnTrip),
      days: Number(trip.dates?.days) || 1,
      nights: Number(trip.dates?.nights) || 0,
      travelers: Number(trip.travelers) || 1,
      profile: trip.profile || {},
      avoidTolls: Boolean(trip.preferences?.avoidTolls),
      customConsumption: trip.vehicle?.customConsumption,
    })
  }, [trip])

  function commit(nextBudget) {
    upsertTrip({ ...trip, budget: { ...budget, ...nextBudget } })
  }

  function submit(event) {
    event.preventDefault()
    const label = form.label.trim()
    const amount = Number(form.amount)
    if (!label) return setError('Indiquez un libellé.')
    if (!Number.isFinite(amount) || amount <= 0) return setError('Le montant doit être supérieur à 0.')
    setError('')

    if (editingId) {
      commit(updateEntry(budget, editingId, { ...form, label, amount }))
      setEditingId(null)
    } else {
      commit(addEntry(budget, createEntry({ ...form, label, amount })))
    }
    setForm(EMPTY_FORM)
  }

  function startEdit(entry) {
    setEditingId(entry.id)
    setForm({
      label: entry.label,
      amount: String(entry.amount),
      category: entry.category,
      date: entry.date || '',
      note: entry.note || '',
    })
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  function applyEnvelope(event) {
    event.preventDefault()
    const max = Math.max(0, Math.round(Number(envelope) || 0))
    commit({ max, plan: max > 0 ? suggestAllocation(max, trip.profile) : null })
  }

  function regeneratePlan() {
    const max = Number(budget.max) || 0
    if (max <= 0) return
    commit({ plan: suggestAllocation(max, trip.profile) })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile icon="wallet" label="Enveloppe" value={formatEUR(budget.max)} hint="Budget maximal" tone="blue" />
        <StatTile icon="receipt" label="Dépensé" value={formatEUR(spent)} hint={`${pct ?? 0} % utilisé`} tone="orange" />
        <StatTile
          icon={rest < 0 ? 'alert' : 'target'}
          label={rest < 0 ? 'Dépassement' : 'Reste'}
          value={formatEUR(Math.abs(rest))}
          hint={rest < 0 ? 'Au-dessus de l’enveloppe' : 'Disponible'}
          tone="neutral"
        />
        <StatTile
          icon="chart-bar"
          label="Transactions"
          value={String((budget.entries || []).length)}
          hint="Lignes enregistrées"
          tone="green"
        />
      </section>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionHeader
            title="Enveloppe"
            subtitle="Le budget est la contrainte principale : il pilote la répartition proposée."
          />
          <PillStatus status={status} />
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <form onSubmit={applyEnvelope} className="flex flex-wrap items-end gap-3">
            <Field label="Budget maximal (€)" id="budget-max">
              <TextInput
                id="budget-max"
                type="number"
                min="0"
                inputMode="numeric"
                className="w-44"
                value={envelope}
                onChange={(e) => setEnvelope(e.target.value)}
              />
            </Field>
            <Button type="submit" variant="secondary" icon="check">
              Appliquer
            </Button>
          </form>
          <Button variant="ghost" icon="refresh" onClick={regeneratePlan} disabled={!budget.max}>
            Recalculer la répartition
          </Button>
        </div>
        <Progress
          value={Math.min(100, pct ?? 0)}
          tone={status === 'over' ? 'danger' : status === 'warn' ? 'orange' : 'green'}
          className="mt-4"
          showLabel
          label="Répartition du budget"
        />
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionHeader
          title="Répartition"
          subtitle={budget.plan ? 'Prévisionnel vs réalisé, par poste.' : 'Aucune répartition définie.'}
        />
        {budget.plan ? (
          <ul className="mt-4 space-y-4">
            {CATEGORIES.map((cat) => {
              const planned = Number(budget.plan?.[cat.id]) || 0
              const used = Number(byCategory[cat.id]) || 0
              const share = planned > 0 ? Math.min(100, Math.round((used / planned) * 100)) : used > 0 ? 100 : 0
              return (
                <li key={cat.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <Icon name={cat.icon} size={16} className="text-pt-neutral/75" />
                      {CATEGORY_LABEL[cat.id]}
                    </span>
                    <span className="tabular-nums text-pt-neutral/80">
                      <strong className={used > planned ? 'text-pt-danger' : 'text-pt-neutral'}>
                        {formatEUR(used)}
                      </strong>{' '}
                      / {formatEUR(planned)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full rounded-full bg-pt-light overflow-hidden">
                    <div
                      className={`h-full rounded-full ${used > planned ? 'bg-pt-danger' : 'bg-pt-green'}`}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-pt-neutral/80">
            Définissez une enveloppe pour obtenir une répartition transport / hébergement / restauration /
            activités / divers.
          </p>
        )}
      </Card>

      {estimation && (
        <Card className="p-5 sm:p-6">
          <SectionHeader
            title="Estimation du voyage"
            subtitle="Ordres de grandeur calculés depuis votre véhicule, la distance et la durée."
          />
          <ul className="mt-4 divide-y divide-pt-line">
            {estimation.lines.map((line) => (
              <li key={line.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-pt-cream text-pt-neutral/80">
                  <Icon name={CATEGORIES.find((c) => c.id === line.category)?.icon || 'receipt'} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{line.label}</p>
                  <p className="truncate text-xs text-pt-neutral/75">{line.detail}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{formatEUR(line.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-pt-green-soft/70 p-4">
            <span className="text-sm font-medium text-pt-green-ink">Total estimé</span>
            <span className="font-display font-bold text-xl tabular-nums text-pt-green-ink">
              {formatEUR(estimation.total)}
            </span>
          </div>
          <p className="mt-3 text-sm text-pt-neutral/80">
            {budget.max > 0
              ? estimation.total <= budget.max
                ? `Marge de ${formatEUR(budget.max - estimation.total)} sur votre enveloppe de ${formatEUR(budget.max)}.`
                : `Dépassement estimé de ${formatEUR(estimation.total - budget.max)} par rapport à ${formatEUR(budget.max)}.`
              : 'Renseignez une enveloppe pour comparer cette estimation à votre budget.'}
          </p>
        </Card>
      )}

      <Card className="p-5 sm:p-6">
        <SectionHeader
          title={editingId ? 'Modifier la dépense' : 'Ajouter une dépense'}
          subtitle="Carburant, péages, repas, hébergement, activités…"
        />
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Libellé" id="entry-label" required error={error && !form.label.trim() ? error : undefined}>
            <TextInput
              id="entry-label"
              value={form.label}
              placeholder="Carburant — A7 sens sud"
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
          </Field>
          <Field label="Montant (€)" id="entry-amount" required>
            <TextInput
              id="entry-amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={form.amount}
              placeholder="0,00"
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </Field>
          <Field label="Catégorie" id="entry-category">
            <SelectInput
              id="entry-category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Date" id="entry-date">
            <TextInput
              id="entry-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Note (facultatif)" id="entry-note">
              <TextInput
                id="entry-note"
                value={form.note}
                placeholder="Réservation, remboursement à répartir…"
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </Field>
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <Button type="submit" icon={editingId ? 'check' : 'plus'}>
              {editingId ? 'Enregistrer' : 'Ajouter'}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" onClick={cancelEdit}>
                Annuler
              </Button>
            )}
            {error && <span className="text-sm text-pt-danger">{error}</span>}
          </div>
        </form>
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionHeader
          title="Dépenses"
          subtitle={`${entries.length} ligne${entries.length > 1 ? 's' : ''} · total ${formatEUR(spent)}`}
        />
        {entries.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon="receipt"
            title="Aucune dépense enregistrée"
            description="Ajoutez votre premier poste pour suivre l’avancement du budget en temps réel."
          />
        ) : (
          <ul className="mt-4 divide-y divide-pt-line">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pt-cream text-pt-neutral/80">
                  <Icon name={CATEGORIES.find((c) => c.id === entry.category)?.icon || 'receipt'} size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.label}</p>
                  <p className="truncate text-xs text-pt-neutral/75">
                    {CATEGORY_LABEL[entry.category] || CATEGORY_LABEL.misc}
                    {entry.date ? ` · ${formatDate(entry.date, { short: true })}` : ''}
                    {entry.note ? ` · ${entry.note}` : ''}
                  </p>
                </div>
                <span className="shrink-0 font-display font-semibold tabular-nums">{formatEUR(entry.amount)}</span>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="edit"
                    aria-label={`Modifier ${entry.label}`}
                    onClick={() => startEdit(entry)}
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    icon="trash"
                    aria-label={`Supprimer ${entry.label}`}
                    onClick={() => commit(removeEntry(budget, entry.id))}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function PillStatus({ status }) {
  const map = {
    ok: { tone: 'green', icon: 'check', label: 'Sous contrôle' },
    warn: { tone: 'orange', icon: 'alert', label: 'Attention' },
    over: { tone: 'danger', icon: 'alert', label: 'Dépassé' },
  }
  const conf = map[status]
  if (!conf) return null
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
        {
          green: 'border-pt-green/25 bg-pt-green-soft text-pt-green-ink',
          orange: 'border-pt-orange/35 bg-pt-orange-soft text-pt-orange-ink',
          danger: 'border-pt-danger/25 bg-pt-danger-soft text-pt-danger',
        }[conf.tone]
      }`}
    >
      <Icon name={conf.icon} size={14} />
      {conf.label}
    </span>
  )
}
