/**
 * Liste d'organisation — tâches, catégories, modèles par défaut.
 */

export const TASK_CATEGORIES = [
  { id: 'admin', label: 'Documents & démarches', icon: 'id-card' },
  { id: 'booking', label: 'Réservations', icon: 'ticket' },
  { id: 'packing', label: 'Bagages', icon: 'suitcase' },
  { id: 'vehicle', label: 'Véhicule', icon: 'car' },
  { id: 'home', label: 'Avant de partir', icon: 'home' },
  { id: 'misc', label: 'Divers', icon: 'checklist' },
]

export const TASK_CATEGORY_LABEL = Object.fromEntries(TASK_CATEGORIES.map((c) => [c.id, c.label]))

export function isTaskCategory(id) {
  return TASK_CATEGORIES.some((c) => c.id === id)
}

export function createTask(input = {}) {
  return {
    id: input.id || `k_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    title: String(input.title || '').trim() || 'Tâche',
    category: isTaskCategory(input.category) ? input.category : 'misc',
    done: Boolean(input.done),
    dueDate: input.dueDate || '',
    createdAt: input.createdAt || new Date().toISOString(),
  }
}

export function toggleTask(task) {
  return { ...task, done: !task.done }
}

export function taskProgress(tasks = []) {
  const total = tasks.length
  const done = tasks.filter((t) => t.done).length
  return {
    total,
    done,
    pct: total ? Math.round((done / total) * 100) : 0,
    remaining: total - done,
  }
}

export function groupTasks(tasks = []) {
  const groups = TASK_CATEGORIES.map((c) => ({ ...c, tasks: [] }))
  const index = Object.fromEntries(groups.map((g) => [g.id, g]))
  for (const task of tasks) {
    const group = index[isTaskCategory(task.category) ? task.category : 'misc']
    group.tasks.push(task)
  }
  return groups.filter((g) => g.tasks.length > 0)
}

/** Modèles proposés à la création d'un voyage. */
export function defaultTasks({ travelers = 1, returnTrip = false } = {}) {
  const items = [
    { title: 'Vérifier la validité des pièces d’identité', category: 'admin' },
    { title: 'Souscrire / vérifier l’assurance voyage', category: 'admin' },
    { title: 'Réserver l’hébergement', category: 'booking' },
    { title: 'Réserver les activités et billets', category: 'booking' },
    { title: 'Préparer les bagages', category: 'packing' },
    { title: 'Contrôle niveau huile, pneus et pression', category: 'vehicle' },
    { title: 'Réserver le parking / la navette', category: 'vehicle' },
    { title: 'Prévoir les plantes et le courrier', category: 'home' },
    { title: 'Prévenir la banque du départ', category: 'home' },
    { title: `Prévoir l’eau et les collines pour ${travelers > 1 ? `${travelers} voyageurs` : 'le voyage'}`, category: 'misc' },
  ]
  if (returnTrip) items.push({ title: 'Prévoir un arrêt retour et la fatigue de conduite', category: 'vehicle' })
  return items.map((item) => createTask(item))
}

export function sortTasks(tasks = []) {
  return [...tasks].sort((a, b) => Number(a.done) - Number(b.done) || String(a.title).localeCompare(String(b.title), 'fr'))
}
