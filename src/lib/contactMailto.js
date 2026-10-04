export const CONTACT_ADDRESS = 'contact@plantrip.fr'

/** Construit le lien mailto du formulaire de contact — le site n'envoie rien lui-même. */
export function buildMailto({ name = '', email = '', subject = 'Une question', message = '' }) {
  const lines = [message.trim()]
  if (name.trim()) lines.push('', `— ${name.trim()}`)
  if (email.trim()) lines.push(`E-mail de réponse : ${email.trim()}`)
  const params = new URLSearchParams({
    subject: `[PlanTrip] ${subject}`,
    body: lines.join('\n'),
  })
  return `mailto:${CONTACT_ADDRESS}?${params.toString()}`
}
