import { describe, expect, it } from 'vitest'
import {
  createDocument,
  daysUntilExpiry,
  expiryLabel,
  expiryTone,
  isDocumentType,
  sortDocuments,
} from './documents.js'

const iso = (date) => date.toISOString().slice(0, 10)
const NOW = new Date('2026-06-15T12:00:00')

describe('createDocument', () => {
  it('normalise et sécurise le type', () => {
    const doc = createDocument({ title: '  Passeport  ', type: 'bizarre', reference: ' AB123 ' })
    expect(doc.title).toBe('Passeport')
    expect(doc.type).toBe('other')
    expect(doc.reference).toBe('AB123')
    expect(doc.id).toMatch(/^d_/)
  })

  it('garde un type valide', () => {
    expect(createDocument({ type: 'insurance' }).type).toBe('insurance')
    expect(isDocumentType('license')).toBe(true)
    expect(isDocumentType('nope')).toBe(false)
  })
})

describe('suivi des expirations', () => {
  it('compte les jours restants', () => {
    expect(daysUntilExpiry(createDocument({ expiry: iso(new Date('2026-06-25')) }), NOW)).toBe(10)
    expect(daysUntilExpiry(createDocument({ expiry: iso(new Date('2026-06-15')) }), NOW)).toBe(0)
    expect(daysUntilExpiry(createDocument({ expiry: iso(new Date('2026-06-01')) }), NOW)).toBe(-14)
    expect(daysUntilExpiry(createDocument({}), NOW)).toBeNull()
    expect(daysUntilExpiry(createDocument({ expiry: 'not-a-date' }), NOW)).toBeNull()
  })

  it('classe l’urgence', () => {
    expect(expiryTone(createDocument({}), NOW)).toBe('neutral')
    expect(expiryTone(createDocument({ expiry: '2026-06-10' }), NOW)).toBe('danger')
    expect(expiryTone(createDocument({ expiry: '2026-07-01' }), NOW)).toBe('orange')
    expect(expiryTone(createDocument({ expiry: '2027-01-01' }), NOW)).toBe('green')
  })

  it('libelle l’alerte', () => {
    expect(expiryLabel(createDocument({}), NOW)).toBe('')
    expect(expiryLabel(createDocument({ expiry: '2026-06-15' }), NOW)).toBe('Expire aujourd’hui')
    expect(expiryLabel(createDocument({ expiry: '2026-06-01' }), NOW)).toBe('Expiré depuis 14 j')
    expect(expiryLabel(createDocument({ expiry: '2026-06-25' }), NOW)).toBe('Expire dans 10 j')
  })
})

describe('sortDocuments', () => {
  it('met les expirations proches en tête et les sans date en fin', () => {
    const soon = createDocument({ title: 'Bientôt', expiry: '2026-06-20' })
    const far = createDocument({ title: 'Lointain', expiry: '2030-01-01' })
    const none = createDocument({ title: 'Sans date' })
    expect(sortDocuments([none, far, soon]).map((d) => d.title)).toEqual(['Bientôt', 'Lointain', 'Sans date'])
  })
})
