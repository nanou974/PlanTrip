import { describe, it, expect } from 'vitest'
import {
  addDays,
  formatEUR,
  formatNumber,
  formatPercent,
  formatDistance,
  formatDuration,
  formatDate,
  formatRange,
  daysBetween,
  nightsBetween,
  plural,
  tripDurationLabel,
} from './format.js'

const norm = (s) => String(s).replace(/[\u202f\u00a0]/g, ' ')

describe('formatEUR', () => {
  it('formate en euros entiers', () => {
    expect(norm(formatEUR(1234))).toBe('1 234 €')
    expect(norm(formatEUR(0))).toBe('0 €')
    expect(norm(formatEUR(-50))).toBe('-50 €')
  })

  it('gère les centimes sur demande', () => {
    expect(norm(formatEUR(12.5, { cents: true }))).toBe('12,50 €')
  })

  it('renvoie un tiret pour les valeurs invalides', () => {
    expect(formatEUR(NaN)).toBe('—')
    expect(formatEUR('abc')).toBe('—')
    expect(formatEUR(undefined)).toBe('—')
  })
})

describe('formatNumber / formatPercent', () => {
  it('séparateur de milliers français', () => {
    expect(norm(formatNumber(1234567))).toBe('1 234 567')
  })

  it('pourcentage entier par défaut', () => {
    expect(norm(formatPercent(42))).toBe('42 %')
    expect(norm(formatPercent(42.45, { digits: 1 }))).toBe('42,5 %')
    expect(formatPercent(NaN)).toBe('—')
  })
})

describe('formatDistance', () => {
  it('mètres sous 1 km', () => {
    expect(formatDistance(500)).toBe('500 m')
  })

  it('kilomètres au-delà', () => {
    expect(norm(formatDistance(1500))).toBe('1,5 km')
    expect(norm(formatDistance(230000))).toBe('230 km')
  })

  it('tiret si distance absente', () => {
    expect(formatDistance(0)).toBe('—')
    expect(formatDistance(NaN)).toBe('—')
  })
})

describe('formatDuration', () => {
  it('heures et minutes', () => {
    expect(formatDuration(3600)).toBe('1 h')
    expect(formatDuration(5400)).toBe('1 h 30')
    expect(formatDuration(7200)).toBe('2 h')
  })

  it('minutes seules', () => {
    expect(formatDuration(1800)).toBe('30 min')
  })

  it('tiret si durée absente', () => {
    expect(formatDuration(0)).toBe('—')
  })
})

describe('dates', () => {
  it('compte les jours civils', () => {
    expect(daysBetween('2026-06-01', '2026-06-05')).toBe(4)
    expect(daysBetween('2026-02-27', '2026-03-02')).toBe(3)
    expect(daysBetween('2026-06-05', '2026-06-01')).toBe(0)
    expect(nightsBetween('2026-06-01', '2026-06-05')).toBe(4)
  })

  it('formate une date', () => {
    expect(formatDate('2026-06-01')).toBe('1 juin 2026')
    expect(formatDate('2026-06-01', { short: true })).toBe('1 juin 2026')
    expect(formatDate(null)).toBe('—')
  })

  it('formate une plage du même mois', () => {
    expect(norm(formatRange('2026-06-01', '2026-06-05'))).toBe('1–5 juin 2026')
  })

  it('formate une plage sur deux mois', () => {
    expect(norm(formatRange('2026-06-28', '2026-07-03'))).toBe('28 juin 2026 → 3 juil. 2026')
  })
})

describe('plural & tripDurationLabel', () => {
  it('accorde', () => {
    expect(plural(1, 'jour', 'jours')).toBe('1 jour')
    expect(plural(3, 'jour', 'jours')).toBe('3 jours')
  })

  it('libellé de durée', () => {
    expect(tripDurationLabel({ dates: { days: 3 } })).toBe('3 jours · 2 nuits')
    expect(tripDurationLabel({ dates: { days: 1 } })).toBe('1 jour')
    expect(tripDurationLabel(null)).toBe('—')
  })
})

describe('addDays — changement d’heure', () => {
  it('avance d’un jour civil à la bascule heure d’été → hiver', () => {
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
  })
  it('avance d’un jour civil à la bascule heure d’hiver → été', () => {
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
  })
  it('gère les fins de mois et d’année', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})
