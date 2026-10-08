import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Button,
  Card,
  EmptyState,
  Field,
  Pill,
  SectionHeader,
  SelectInput,
  TextArea,
  TextInput,
} from '../../../design/ui.jsx'
import { Icon } from '../../../design/Icon.jsx'
import { plural } from '../../../domain/format.js'
import {
  DOCUMENT_TYPES,
  createDocument,
  expiryLabel,
  expiryTone,
  sortDocuments,
} from '../../../domain/documents.js'
import { upsertTrip } from '../../../state/store.js'

const EMPTY_FORM = { type: 'id', title: '', reference: '', issuer: '', expiry: '', notes: '' }

export default function TripDocuments() {
  const { trip } = useOutletContext()
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')

  const documents = useMemo(() => sortDocuments(trip.documents || []), [trip.documents])

  function commit(next) {
    upsertTrip({ ...trip, documents: next })
  }

  function submit(event) {
    event.preventDefault()
    if (!form.title.trim()) return setError('Donnez un titre au document.')
    setError('')
    if (editingId) {
      commit(documents.map((d) => (d.id === editingId ? { ...d, ...form, title: form.title.trim() } : d)))
      setEditingId(null)
    } else {
      commit([...documents, createDocument(form)])
    }
    setForm(EMPTY_FORM)
  }

  function startEdit(doc) {
    setEditingId(doc.id)
    setForm({
      type: doc.type,
      title: doc.title,
      reference: doc.reference,
      issuer: doc.issuer,
      expiry: doc.expiry,
      notes: doc.notes,
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="p-5 sm:p-6">
        <SectionHeader
          title={editingId ? 'Modifier le document' : 'Ajouter un document'}
          subtitle="Seules les métadonnées sont conservées : les fichiers restent sur votre appareil."
        />
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Type" id="doc-type">
            <SelectInput
              id="doc-type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Titre" id="doc-title" required error={error || undefined}>
            <TextInput
              id="doc-title"
              value={form.title}
              placeholder="Passeport de Léa"
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </Field>
          <Field label="N° de référence" id="doc-ref">
            <TextInput
              id="doc-ref"
              value={form.reference}
              placeholder="Facultatif"
              onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
            />
          </Field>
          <Field label="Autorité émettrice" id="doc-issuer">
            <TextInput
              id="doc-issuer"
              value={form.issuer}
              placeholder="Préfecture, assureur…"
              onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
            />
          </Field>
          <Field label="Date d’expiration" id="doc-expiry" hint="Pour le suivi des alertes.">
            <TextInput
              id="doc-expiry"
              type="date"
              value={form.expiry}
              onChange={(e) => setForm((f) => ({ ...f, expiry: e.target.value }))}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes" id="doc-notes">
              <TextArea
                id="doc-notes"
                rows={2}
                value={form.notes}
                placeholder="Où le scanner, qui contacter en cas de perte…"
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </Field>
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <Button type="submit" icon={editingId ? 'check' : 'plus'}>
              {editingId ? 'Enregistrer' : 'Ajouter'}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingId(null)
                  setForm(EMPTY_FORM)
                  setError('')
                }}
              >
                Annuler
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card className="p-5 sm:p-6">
        <SectionHeader
          title="Mes documents"
          subtitle={`${plural(documents.length, 'document', 'documents')} pour ce voyage`}
        />
        {documents.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon="id-card"
            title="Aucun document"
            description="Ajoutez vos pièces d’identité, assurances et réservations pour les suivre au même endroit."
          />
        ) : (
          <ul className="mt-4 divide-y divide-pt-line">
            {documents.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-start gap-3 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pt-cream text-pt-neutral/80">
                  <Icon
                    name={DOCUMENT_TYPES.find((t) => t.id === doc.type)?.icon || 'note'}
                    size={19}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display font-semibold">{doc.title}</p>
                    <Pill tone={expiryTone(doc)}>
                      {expiryLabel(doc) || DOCUMENT_TYPES.find((t) => t.id === doc.type)?.label}
                    </Pill>
                  </div>
                  <p className="mt-0.5 text-sm text-pt-neutral/80">
                    {doc.reference && <span>Réf. {doc.reference}</span>}
                    {doc.issuer && <span> · {doc.issuer}</span>}
                    {!doc.reference && !doc.issuer && <span>—</span>}
                  </p>
                  {doc.notes && <p className="mt-1 text-sm text-pt-neutral/75">{doc.notes}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="sm" icon="edit" aria-label={`Modifier ${doc.title}`} onClick={() => startEdit(doc)} />
                  <Button
                    variant="danger"
                    size="sm"
                    icon="trash"
                    aria-label={`Supprimer ${doc.title}`}
                    onClick={() => {
                      if (editingId === doc.id) {
                        setEditingId(null)
                        setForm(EMPTY_FORM)
                      }
                      commit(documents.filter((d) => d.id !== doc.id))
                    }}
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
