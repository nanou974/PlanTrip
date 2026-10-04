import { describe, it, expect } from 'vitest'
import {
  CATEGORIES,
  CATEGORY_IDS,
  createBudget,
  createEntry,
  addEntry,
  updateEntry,
  removeEntry,
  spentTotal,
  spentByCategory,
  plannedTotal,
  remaining,
  progressPct,
  budgetStatus,
  topCategory,
  suggestAllocation,
} from './budget.js'

const entry = (over = {}) => createEntry({ label: 'Essence', amount: 50, category: 'transport', ...over })

describe('createEntry', () => {
  it('arrondit et borne le montant', () => {
    expect(createEntry({ label: 'x', amount: 12.345 }).amount).toBe(12.35)
    expect(createEntry({ label: 'x', amount: -5 }).amount).toBe(0)
    expect(createEntry({ label: 'x', amount: 'oops' }).amount).toBe(0)
  })

  it('catégorie inconnue → divers', () => {
    expect(createEntry({ label: 'x', amount: 1, category: 'inconnu' }).category).toBe('misc')
  })

  it('label par défaut', () => {
    expect(createEntry({ amount: 1 }).label).toBe('Dépense')
  })
})

describe('arhtmétique du budget', () => {
  const budget = addEntry(
    addEntry(createBudget(1000), entry({ amount: 300 })),
    entry({ amount: 200, category: 'food' }),
  )

  it('total dépensé', () => {
    expect(spentTotal(budget)).toBe(500)
  })

  it('répartition par catégorie', () => {
    expect(spentByCategory(budget)).toMatchObject({ transport: 300, food: 200, misc: 0 })
    expect(Object.keys(spentByCategory(budget)).sort()).toEqual([...CATEGORY_IDS].sort())
  })

  it('reste à dépenser', () => {
    expect(remaining(budget)).toBe(500)
  })

  it('progression et statut', () => {
    expect(progressPct(budget)).toBe(50)
    expect(budgetStatus(budget)).toBe('ok')
    expect(progressPct({ max: 0, entries: [] })).toBeNull()
    expect(budgetStatus({ max: 0, entries: [] })).toBeNull()
  })

  it('passe en alerte à 80 % puis en dépassement', () => {
    const warn = { max: 100, entries: [entry({ amount: 85 })] }
    const over = { max: 100, entries: [entry({ amount: 120 })] }
    expect(budgetStatus(warn)).toBe('warn')
    expect(budgetStatus(over)).toBe('over')
    expect(remaining(over)).toBe(-20)
  })

  it('catégorie dominante', () => {
    expect(topCategory(budget)).toMatchObject({ id: 'transport', amount: 300 })
    expect(topCategory({ max: 0, entries: [] })).toBeNull()
  })

  it('plan totalise les allocations', () => {
    expect(plannedTotal({ plan: { transport: 100, food: 50 } })).toBe(150)
    expect(plannedTotal({ plan: null })).toBe(0)
  })
})

describe('mutations (immutabilité)', () => {
  it('addEntry ne modifie pas le tableau d’origine', () => {
    const a = createBudget(100)
    const b = addEntry(a, entry())
    expect(a.entries).toHaveLength(0)
    expect(b.entries).toHaveLength(1)
  })

  it('updateEntry borne le montant et garde la catégorie invalide', () => {
    const a = addEntry(createBudget(100), entry({ amount: 10 }))
    const id = a.entries[0].id
    const b = updateEntry(a, id, { amount: 999 })
    expect(b.entries[0].amount).toBe(999)
    expect(a.entries[0].amount).toBe(10)
    const c = updateEntry(a, id, { category: 'nope' })
    expect(c.entries[0].category).toBe('transport')
  })

  it('removeEntry supprime par id', () => {
    const a = addEntry(createBudget(100), entry())
    const b = removeEntry(a, a.entries[0].id)
    expect(b.entries).toHaveLength(0)
  })
})

describe('suggestAllocation', () => {
  it('répartit exactement l’enveloppe', () => {
    const plan = suggestAllocation(1000)
    const sum = CATEGORIES.reduce((s, c) => s + plan[c.id], 0)
    expect(sum).toBe(1000)
    for (const c of CATEGORIES) expect(plan[c.id]).toBeGreaterThanOrEqual(0)
  })

  it('suit les priorités', () => {
    const transportFirst = suggestAllocation(1000, { transport: 1, sejour: 0, confort: 0 })
    const sejourFirst = suggestAllocation(1000, { transport: 0, sejour: 1, confort: 1 })
    expect(transportFirst.transport).toBeGreaterThan(sejourFirst.transport)
    expect(sejourFirst.accommodation).toBeGreaterThan(transportFirst.accommodation)
  })

  it('enveloppe nulle → tout à zéro', () => {
    const plan = suggestAllocation(0)
    expect(Object.values(plan).every((v) => v === 0)).toBe(true)
  })
})
