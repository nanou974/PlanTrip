import { useState } from 'react'
import SimplePage from './SimplePage.jsx'
import { Button, Field, SelectInput, TextArea, TextInput } from '../design/ui.jsx'
import { CONTACT_ADDRESS, buildMailto } from '../lib/contactMailto.js'

const SUBJECTS = [
  'Une question',
  'Signaler un bug',
  'Une idée de fonctionnalité',
  'Un problème d’accessibilité',
  'Autre demande',
]

export default function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function onSubmit(e) {
    e.preventDefault()
    if (!message.trim()) {
      setError('Décrivez votre demande en quelques mots.')
      return
    }
    setError('')
    window.location.href = buildMailto({ name, email, subject, message })
  }

  return (
    <SimplePage
      title="Contact"
      subtitle="Une question, un bug, une idée ? Parlons-en."
      icon="mail"
      eyebrow="À votre écoute"
    >
      <p className="text-pt-neutral/70">
        Écrivez-nous à{' '}
        <a href={`mailto:${CONTACT_ADDRESS}`} className="text-pt-orange-ink font-semibold hover:underline">
          {CONTACT_ADDRESS}
        </a>{' '}
        — nous répondons sous 48 h.
      </p>

      <form onSubmit={onSubmit} className="mt-8 card p-5 space-y-4">
        <h2 className="font-display font-semibold">Préparer un message</h2>
        <p className="text-sm text-pt-neutral/80 -mt-2">
          PlanTrip n'a pas de serveur d'envoi : ce formulaire prépare un e-mail dans votre
          messagerie, rien ne part depuis le site. Si votre messagerie ne s'ouvre pas,
          écrivez directement à <strong>{CONTACT_ADDRESS}</strong>.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Votre nom" id="contact-name" hint="Facultatif.">
            <TextInput
              id="contact-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Camille Dupont"
            />
          </Field>
          <Field label="E-mail de réponse" id="contact-email" hint="Facultatif.">
            <TextInput
              id="contact-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
            />
          </Field>
        </div>

        <Field label="Sujet" id="contact-subject">
          <SelectInput id="contact-subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
            {SUBJECTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Votre message" id="contact-message" required error={error}>
          {({ describedBy }) => (
            <TextArea
              id="contact-message"
              required
              rows={6}
              error={error}
              aria-describedby={describedBy}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="La page concernée, votre navigateur, ce que vous attendiez…"
            />
          )}
        </Field>

        <Button type="submit" block icon="mail">
          Ouvrir ma messagerie
        </Button>
      </form>

      <div className="mt-8 card p-5">
        <h2 className="font-display font-semibold">Besoin d'aide immédiate ?</h2>
        <p className="text-sm text-pt-neutral/80 mt-2">
          La plupart des réponses se trouvent dans la FAQ. Pour un problème d'itinéraire,
          joignez le lien de votre voyage.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button to="/faq" variant="secondary" icon="help">
            Consulter la FAQ
          </Button>
        </div>
      </div>
    </SimplePage>
  )
}
