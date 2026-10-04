import { describe, expect, it } from 'vitest'
import {
  TASK_CATEGORIES,
  createTask,
  defaultTasks,
  groupTasks,
  isTaskCategory,
  sortTasks,
  taskProgress,
  toggleTask,
} from './checklist.js'

describe('createTask', () => {
  it('normalise la tâche', () => {
    const task = createTask({ title: '  Réserver  ', category: 'inconnu', done: 1 })
    expect(task.title).toBe('Réserver')
    expect(task.category).toBe('misc')
    expect(task.done).toBe(true)
    expect(task.id).toMatch(/^k_/)
  })

  it('connaît ses catégories', () => {
    expect(isTaskCategory('booking')).toBe(true)
    expect(isTaskCategory('nope')).toBe(false)
    expect(TASK_CATEGORIES.length).toBeGreaterThanOrEqual(4)
  })
})

describe('progression', () => {
  const tasks = [createTask({ title: 'A', done: true }), createTask({ title: 'B' }), createTask({ title: 'C' })]

  it('compte les tâches', () => {
    expect(taskProgress(tasks)).toEqual({ total: 3, done: 1, pct: 33, remaining: 2 })
    expect(taskProgress([])).toEqual({ total: 0, done: 0, pct: 0, remaining: 0 })
  })

  it('bascule l’état', () => {
    expect(toggleTask(tasks[1]).done).toBe(true)
    expect(toggleTask(tasks[0]).done).toBe(false)
  })

  it('trie les tâches à faire en tête', () => {
    const sorted = sortTasks([tasks[0], tasks[2], tasks[1]])
    expect(sorted.map((t) => t.title)).toEqual(['B', 'C', 'A'])
  })
})

describe('groupement', () => {
  it('regroupe par catégorie et ignore les groupes vides', () => {
    const groups = groupTasks([createTask({ title: 'A', category: 'booking' }), createTask({ title: 'B', category: 'booking' })])
    expect(groups).toHaveLength(1)
    expect(groups[0].id).toBe('booking')
    expect(groups[0].tasks).toHaveLength(2)
    expect(groupTasks([])).toHaveLength(0)
  })
})

describe('tâches types', () => {
  it('propose une liste complète et valide', () => {
    const tasks = defaultTasks({ travelers: 3, returnTrip: true })
    expect(tasks.length).toBeGreaterThanOrEqual(8)
    expect(tasks.every((t) => isTaskCategory(t.category))).toBe(true)
    expect(tasks.every((t) => t.done === false)).toBe(true)
    expect(tasks.some((t) => t.title.includes('3 voyageurs'))).toBe(true)
    expect(tasks.some((t) => t.title.includes('retour'))).toBe(true)
    expect(defaultTasks()).toHaveLength(tasks.length - 1)
  })
})
