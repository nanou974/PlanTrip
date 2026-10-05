import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomToken } from './auth.js'

/** Corps du message : code à saisir + lien de connexion direct. */
export function buildMagicBody({ code, token, baseUrl, ttlMinutes }) {
  const lines = [
    'Bonjour,',
    '',
    `Votre code de connexion PlanTrip : ${code}`,
    `(valable ${ttlMinutes} minutes, usage unique)`,
    '',
    'Ou connectez-vous directement en ouvrant ce lien :',
    `${baseUrl}/login?magique=${token}`,
    '',
    'Si vous n\'êtes pas à l\'origine de cette demande, ignorez ce message.',
    '— PlanTrip',
  ]
  return lines.join('\n')
}

export function buildMagicEmail({ to, code, token, baseUrl, ttlMinutes, from }) {
  return {
    From: `PlanTrip <${from}>`,
    To: to,
    Subject: 'Votre code de connexion PlanTrip',
    'Content-Type': 'text/plain; charset=utf-8',
    body: buildMagicBody({ code, token, baseUrl, ttlMinutes }),
  }
}

/**
 * Envoie l'email de connexion.
 *  - mode « file » (défaut, local/CI) : écrit un fichier .eml dans MAILBOX_DIR ;
 *  - mode « smtp » : envoie réellement via SMTP_URL (nodemailer, import paresseux).
 * Renvoie { mode, path? } — aucun secret n'est renvoyé (le chemin d'aide, lui, l'est).
 */
export async function sendMagicEmail({ to, code, token, baseUrl, ttlMinutes, config }) {
  const from = config.mailFrom
  const email = buildMagicEmail({ to, code, token, baseUrl, ttlMinutes, from })
  const text = [
    `From: ${email.From}`,
    `To: ${email.To}`,
    `Subject: ${email.Subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Content-Type: ${email['Content-Type']}`,
    '',
    email.body,
    '',
  ].join('\r\n')

  if (config.mailMode === 'smtp') {
    if (!config.smtpUrl) throw new Error('MAIL_MODE=smtp mais SMTP_URL est absent')
    const { default: nodemailer } = await import('nodemailer')
    const transport = nodemailer.createTransport(config.smtpUrl)
    await transport.sendMail({ from, to, subject: email.Subject, text: email.body })
    return { mode: 'smtp' }
  }

  mkdirSync(config.mailboxDir, { recursive: true })
  const safeEmail = to.replace(/[^a-z0-9]+/gi, '_')
  // Horodaté en tête : l'ordre lexicographique des noms est chronologique.
  const filename = `${Date.now()}-${safeEmail}-${randomToken(4)}.eml`
  const path = join(config.mailboxDir, filename)
  writeFileSync(path, text, 'utf8')
  return { mode: 'file', path }
}
