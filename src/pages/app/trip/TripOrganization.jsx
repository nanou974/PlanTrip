import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Button, Card, Checkbox, EmptyState, Field, Progress, SectionHeader, SelectInput, TextArea, TextInput } from '../../../design/ui.jsx'
import { Icon } from '../../../design/Icon.jsx'
import { formatDate, plural } from '../../../domain/format.js'
import { daysUntilExpiry, expiryLabel, expiryTone } from '../../../domain/documents.js'
import {
  TASK_CATEGORIES,
  createTask,
  defaultTasks,
  groupTasks,
  sortTasks,
  taskProgress,
  toggleTask,
} from '../../../domain/checklist.js'
import { upsertTrip } from '../../../state/store.js'

const EMPTY_TASKS = []

export default function TripOrganization() {
  const { trip } = useOutletContext()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('admin')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState('')

  const tasks = trip.checklist || EMPTY_TASKS
  const groups = useMemo(() => groupTasks(sortTasks(tasks)), [tasks])
  const progress = taskProgress(tasks)
  const [notes, setNotes] = useState(trip.notes || '')
  const [notesSaved, setNotesSaved] = useState(false)

  const reminders = useMemo(() => {
    const now = new Date()
    const dueTasks = tasks
      .filter((task) => !task.done && task.dueDate)
      .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
      .slice(0, 5)
      .map((task) => ({
        id: `t-${task.id}`,
        icon: 'bell',
        tone: 'orange',
        title: task.title,
        detail: `Échéance : ${formatDate(task.dueDate, { short: true })}`,
        to: null,
      }))
    const expiring = (trip.documents || [])
      .map((document) => ({ document, days: daysUntilExpiry(document, now) }))
      .filter((item) => item.days !== null && item.days <= 60)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5)
      .map((item) => ({
        id: `d-${item.document.id}`,
        icon: 'id-card',
        tone: expiryTone(item.document, now),
        title: item.document.title,
        detail: expiryLabel(item.document, now),
        to: null,
      }))
    return [...dueTasks, ...expiring]
  }, [tasks, trip.documents])

  function commit(next) {
    upsertTrip({ ...trip, checklist: next })
  }

  function saveNotes() {
    upsertTrip({ ...trip, notes })
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  function submit(event) {
    event.preventDefault()
    if (!title.trim()) return setError('Donnez un intitulé à la tâche.')
    setError('')
    commit([...tasks, createTask({ title, category, dueDate })])
    setTitle('')
    setDueDate('')
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="p-5 sm:p-6">
        <SectionHeader
          title="Organisation"
          subtitle="Démarches, réservations et préparatifs, du départ au retour."
        />
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <div className="min-w-[220px] flex-1">
            <Progress
              value={progress.pct}
              tone={progress.pct === 100 ? 'green' : 'blue'}
              showLabel
              label="Progression de l’organisation"
            />
            <p className="mt-2 text-sm text-pt-neutral/80">
              <strong className="text-pt-neutral">{progress.done}</strong> sur {progress.total} terminée
              {progress.total > 1 ? 's' : ''}
              {progress.remaining > 0 ? ` · ${plural(progress.remaining, 'tâche restante', 'tâches restantes')}` : ''}
            </p>
          </div>
          {tasks.length === 0 && (
            <Button
              icon="checklist"
              onClick={() => commit(defaultTasks({ travelers: trip.travelers, returnTrip: trip.returnTrip }))}
            >
              Charger les tâches types
            </Button>
          )}
        </div>
      </Card>

      {reminders.length > 0 && (
        <Card className="p-5 sm:p-6">
          <SectionHeader
            title="Rappels"
            subtitle="Échéances et documents à surveiller, du plus proche au plus lointain."
          />
          <ul className="mt-3 divide-y divide-pt-line">
            {reminders.map((reminder) => (
              <li key={reminder.id} className="flex items-start gap-3 py-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    {
                      green: 'bg-pt-green-soft text-pt-green-ink',
                      orange: 'bg-pt-orange-soft text-pt-orange-ink',
                      danger: 'bg-pt-danger-soft text-pt-danger',
                      neutral: 'bg-pt-light text-pt-neutral/80',
                    }[reminder.tone]
                  }`}
                >
                  <Icon name={reminder.icon} size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{reminder.title}</p>
                  <p className="text-xs text-pt-neutral/80">{reminder.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-5 sm:p-6">
        <SectionHeader title="Ajouter une tâche" />
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Intitulé" id="task-title" required error={error || undefined}>
            <TextInput
              id="task-title"
              value={title}
              placeholder="Souscrire l’assurance voyage"
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Catégorie" id="task-category">
            <SelectInput id="task-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {TASK_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Échéance (facultatif)" id="task-due">
            <TextInput id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" icon="plus">
              Ajouter
            </Button>
          </div>
        </form>
      </Card>

      {tasks.length === 0 ? (
        <EmptyState
          icon="checklist"
          title="Rien à organiser… pour l’instant"
          description="Chargez les tâches types ou créez les vôtres pour ne rien oublier avant le départ."
          action={
            <Button icon="checklist" onClick={() => commit(defaultTasks({ travelers: trip.travelers, returnTrip: trip.returnTrip }))}>
              Charger les tâches types
            </Button>
          }
        />
      ) : (
        groups.map((group) => (
          <Card key={group.id} className="p-5 sm:p-6">
            <SectionHeader
              title={group.label}
              subtitle={`${group.tasks.filter((t) => t.done).length} / ${group.tasks.length}`}
            />
            <ul className="mt-3 divide-y divide-pt-line">
              {group.tasks.map((task) => (
                <li key={task.id} className="flex items-start gap-3 py-3">
                  <Checkbox
                    checked={task.done}
                    onChange={() => commit(tasks.map((t) => (t.id === task.id ? toggleTask(t) : t)))}
                    label=""
                    id={`task-${task.id}`}
                  />
                  <label
                    htmlFor={`task-${task.id}`}
                    className={`min-w-0 flex-1 cursor-pointer text-sm ${
                      task.done ? 'text-pt-neutral/70 line-through' : 'text-pt-neutral'
                    }`}
                  >
                    {task.title}
                    {task.dueDate && (
                      <span className="mt-0.5 block text-xs text-pt-neutral/75">Échéance : {formatDate(task.dueDate, { short: true })}</span>
                    )}
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="trash"
                    aria-label={`Supprimer ${task.title}`}
                    onClick={() => commit(tasks.filter((t) => t.id !== task.id))}
                  />
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}

      <Card className="p-5 sm:p-6">
        <SectionHeader
          title="Notes"
          subtitle="Un carnet libre : adresses utiles, numéros, idées, imprévus."
        />
        <TextArea
          rows={6}
          value={notes}
          placeholder="Parking gratuit derrière la gare, plage à 10 min, numéro du gîte…"
          aria-label="Notes du voyage"
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="mt-3 flex items-center gap-3">
          <Button icon="check" onClick={saveNotes} disabled={notes === (trip.notes || '')}>
            Enregistrer les notes
          </Button>
          {notesSaved && <span className="text-sm text-pt-green-ink">Notes enregistrées.</span>}
        </div>
      </Card>

      <Card className="p-5 flex items-start gap-3 bg-pt-cream">
        <Icon name="bell" size={18} className="mt-0.5 shrink-0 text-pt-green-ink" />
        <p className="text-sm text-pt-neutral/70">
          Les tâches sont conservées localement : rien n’est envoyé à un serveur, et tout reste accessible hors
          connexion.
        </p>
      </Card>
    </div>
  )
}
