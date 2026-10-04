/**
 * Budget — arithmétique pure du carnet de dépenses.
 * Aucune dépendance UI ni stockage : testable unitairement.
 */

export const CATEGORIES = [
  { id: 'transport', label: 'Transport', icon: 'car', tone: 'blue' },
  { id: 'accommodation', label: 'Hébergement', icon: 'bed', tone: 'green' },
  { id: 'food', label: 'Restauration', icon: 'utensils', tone: 'orange' },
  { id: 'activities', label: 'Activités', icon: 'star', tone: 'neutral' },
  { id: 'misc', label: 'Divers', icon: 'receipt', tone: 'neutral' },
]

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id)

export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]))

export function isCategory(id) {
  return CATEGORY_IDS.includes(id)
}

let seq = 0
export function makeEntryId() {
  seq += 1
  return `e_${Date.now().toString(36)}_${seq.toString(36)}`
}

export function createEntry({
  label,
  amount,
  category = 'misc',
  date = null,
  note = '',
  recurring = false,
}) {
  const parsed = Number(amount)
  const value = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100) / 100) : 0
  return {
    id: makeEntryId(),
    label: String(label || '').trim() || 'Dépense',
    amount: value,
    category: isCategory(category) ? category : 'misc',
    date: date || null,
    note: String(note || ''),
    recurring: Boolean(recurring),
  }
}

export function createBudget(max = 0) {
  return {
    max: Math.max(0, Math.round(Number(max) || 0)),
    entries: [],
    plan: null,
  }
}

export function addEntry(budget, entry) {
  return { ...budget, entries: [...(budget.entries || []), entry] }
}

export function updateEntry(budget, id, patch) {
  return {
    ...budget,
    entries: (budget.entries || []).map((e) => {
      if (e.id !== id) return e
      const next = { ...e, ...patch }
      if ('amount' in patch) {
        const v = Math.round(Number(patch.amount) * 100) / 100
        next.amount = Number.isFinite(v) ? Math.max(0, v) : 0
      }
      if ('category' in patch && !isCategory(patch.category)) next.category = e.category
      return next
    }),
  }
}

export function removeEntry(budget, id) {
  return { ...budget, entries: (budget.entries || []).filter((e) => e.id !== id) }
}

export function spentTotal(budget) {
  return round2((budget?.entries || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0))
}

export function spentByCategory(budget) {
  const out = Object.fromEntries(CATEGORY_IDS.map((c) => [c, 0]))
  for (const e of budget?.entries || []) {
    const key = isCategory(e.category) ? e.category : 'misc'
    out[key] = round2(out[key] + (Number(e.amount) || 0))
  }
  return out
}

export function plannedTotal(budget) {
  const plan = budget?.plan
  if (!plan) return 0
  return round2(CATEGORY_IDS.reduce((sum, c) => sum + (Number(plan[c]) || 0), 0))
}

export function remaining(budget) {
  return round2((Number(budget?.max) || 0) - spentTotal(budget))
}

/** 0–100+, hors limites si `max` absent. */
export function progressPct(budget) {
  const max = Number(budget?.max) || 0
  if (max <= 0) return null
  return Math.round((spentTotal(budget) / max) * 100)
}

/** 'ok' < 80 % · 'warn' ≥ 80 % · 'over' ≥ 100 % · null sans enveloppe. */
export function budgetStatus(budget) {
  const pct = progressPct(budget)
  if (pct === null) return null
  if (pct >= 100) return 'over'
  if (pct >= 80) return 'warn'
  return 'ok'
}

export const STATUS_TONE = { ok: 'green', warn: 'orange', over: 'danger' }

export function topCategory(budget) {
  const by = spentByCategory(budget)
  let best = null
  let bestValue = -1
  for (const c of CATEGORIES) {
    if (by[c.id] > bestValue) {
      bestValue = by[c.id]
      best = c
    }
  }
  return bestValue > 0 ? { ...best, amount: bestValue } : null
}

/**
 * Répartition proposée d'une enveloppe, pondérée par les priorités du voyageur.
 * @param {number} max enveloppe totale
 * @param {{transport?:number,sejour?:number,confort?:number}} weights 0–1
 */
export function suggestAllocation(max, weights = {}) {
  const total = Math.max(0, Number(max) || 0)
  const w = {
    transport: clamp01(weights.transport ?? 0.5),
    sejour: clamp01(weights.sejour ?? 0.5),
    confort: clamp01(weights.confort ?? 0.5),
  }
  const base = { transport: 0.35, accommodation: 0.28, food: 0.18, activities: 0.12, misc: 0.07 }
  const transport = clamp01(base.transport + (w.transport - 0.5) * 0.3)
  const accommodation = clamp01(base.accommodation + (w.sejour - 0.5) * 0.25)
  const activities = clamp01(base.activities + (w.confort - 0.5) * 0.2)
  const food = clamp01(base.food + (w.confort - 0.5) * 0.08)
  const raw = { transport, accommodation, food, activities, misc: base.misc }
  const sum = Object.values(raw).reduce((a, b) => a + b, 0)
  const plan = {}
  let acc = 0
  const ids = Object.keys(raw)
  ids.forEach((id, i) => {
    const share = raw[id] / sum
    const value = i === ids.length - 1 ? Math.max(0, total - acc) : Math.round(total * share)
    plan[id] = Math.max(0, value)
    acc += value
  })
  return plan
}

function clamp01(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0.5
  return Math.min(1, Math.max(0, n))
}

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}
