/**
 * Documents de voyage — uniquement les métadonnées.
 * Les fichiers restent sur l'appareil : on n'enregistre que la référence.
 */

export const DOCUMENT_TYPES = [
  { id: 'id', label: 'Pièce d’identité', icon: 'id-card', hint: 'Carte d’identité, passeport' },
  { id: 'license', label: 'Permis de conduire', icon: 'car', hint: 'Permis national ou international' },
  { id: 'insurance', label: 'Assurance', icon: 'shield', hint: 'Carte verte, attestation' },
  { id: 'booking', label: 'Réservation', icon: 'ticket', hint: 'Hôtel, billet, location' },
  { id: 'visa', label: 'Visa / autorisation', icon: 'globe', hint: 'ESTA, e-visa' },
  { id: 'other', label: 'Autre', icon: 'note', hint: 'Document libre' },
]

export const DOCUMENT_TYPE_LABEL = Object.fromEntries(DOCUMENT_TYPES.map((d) => [d.id, d.label]))

export function isDocumentType(id) {
  return DOCUMENT_TYPES.some((d) => d.id === id)
}

export function newDocumentId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `d_${crypto.randomUUID()}`
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function createDocument(input = {}) {
  return {
    id: input.id || newDocumentId(),
    type: isDocumentType(input.type) ? input.type : 'other',
    title: String(input.title || '').trim() || 'Document',
    reference: String(input.reference || '').trim(),
    issuer: String(input.issuer || '').trim(),
    expiry: input.expiry || '',
    notes: String(input.notes || '').trim(),
    filename: String(input.filename || '').trim(),
    createdAt: input.createdAt || new Date().toISOString(),
  }
}

/** Jours restants avant expiration, ou null si pas de date. */
export function daysUntilExpiry(document, now = new Date()) {
  if (!document?.expiry) return null
  const target = new Date(`${document.expiry}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export function expiryTone(document, now = new Date()) {
  const days = daysUntilExpiry(document, now)
  if (days === null) return 'neutral'
  if (days < 0) return 'danger'
  if (days <= 30) return 'orange'
  return 'green'
}

export function expiryLabel(document, now = new Date()) {
  const days = daysUntilExpiry(document, now)
  if (days === null) return ''
  if (days < 0) return `Expiré depuis ${Math.abs(days)} j`
  if (days === 0) return 'Expire aujourd’hui'
  if (days <= 30) return `Expire dans ${days} j`
  return `Expire dans ${days} j`
}

export function sortDocuments(list = []) {
  const now = new Date()
  return [...list].sort((a, b) => {
    const da = daysUntilExpiry(a, now)
    const db = daysUntilExpiry(b, now)
    if (da === null && db === null) return String(a.title).localeCompare(String(b.title), 'fr')
    if (da === null) return 1
    if (db === null) return -1
    return da - db
  })
}
