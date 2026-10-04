/**
 * Formatters — strictement pur, testable sans DOM.
 * Locale figée : fr-FR (interface 100 % française).
 */

const FR = 'fr-FR'

const eur0 = new Intl.NumberFormat(FR, {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const eur2 = new Intl.NumberFormat(FR, {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const num = new Intl.NumberFormat(FR)

export function formatEUR(value, { cents = false } = {}) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return (cents ? eur2 : eur0).format(n)
}

export function formatNumber(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return num.format(n)
}

export function formatPercent(value, { digits = 0 } = {}) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat(FR, {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n / 100)
}

export function formatDistance(meters) {
  const m = Number(meters)
  if (!Number.isFinite(m) || m <= 0) return '—'
  if (m < 1000) return `${Math.round(m)} m`
  const km = m / 1000
  return `${new Intl.NumberFormat(FR, { maximumFractionDigits: km < 100 ? 1 : 0 }).format(km)} km`
}

export function formatDuration(seconds) {
  const s = Number(seconds)
  if (!Number.isFinite(s) || s <= 0) return '—'
  const totalMin = Math.round(s / 60)
  const h = Math.floor(totalMin / 60)
  const min = totalMin % 60
  if (h === 0) return `${min} min`
  if (min === 0) return `${h} h`
  return `${h} h ${String(min).padStart(2, '0')}`
}

function toDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'string' && value) {
    const d = new Date(value.length === 10 ? `${value}T00:00:00` : value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

export function formatDate(value, { short = false, weekday = false } = {}) {
  const d = toDate(value)
  if (!d) return '—'
  return new Intl.DateTimeFormat(FR, {
    day: 'numeric',
    month: short ? 'short' : 'long',
    year: 'numeric',
    ...(weekday ? { weekday: 'long' } : {}),
  }).format(d)
}

export function formatDayLabel(value) {
  const d = toDate(value)
  if (!d) return '—'
  return new Intl.DateTimeFormat(FR, { day: 'numeric', month: 'short', weekday: 'short' }).format(d)
}

export function formatRange(start, end) {
  const a = toDate(start)
  const b = toDate(end)
  if (!a && !b) return '—'
  if (!b) return formatDate(a)
  if (!a) return formatDate(b)
  const sameYear = a.getFullYear() === b.getFullYear()
  const sameMonth = sameYear && a.getMonth() === b.getMonth()
  if (sameMonth) {
    const m = new Intl.DateTimeFormat(FR, { month: 'long' }).format(a)
    return `${a.getDate()}–${b.getDate()} ${m} ${b.getFullYear()}`
  }
  return `${formatDate(a, { short: true })} → ${formatDate(b, { short: true })}`
}

/** Jours civils entre deux dates (au moins 1 si bornes identiques). */
export function daysBetween(start, end) {
  const a = toDate(start)
  const b = toDate(end)
  if (!a || !b) return 0
  const ms = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
    Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  return Math.max(0, Math.round(ms / 86400000))
}

/** Nuits entre deux dates. */
export function nightsBetween(start, end) {
  return Math.max(0, daysBetween(start, end))
}

/** Date ISO (AAAA-MM-JJ) décalée de `days` jours civils. */
export function addDays(value, days) {
  const d = toDate(value)
  if (!d) return ''
  const out = new Date(d.getTime() + Math.round(days) * 86400000)
  const pad = (n) => String(n).padStart(2, '0')
  return `${out.getFullYear()}-${pad(out.getMonth() + 1)}-${pad(out.getDate())}`
}

export function plural(n, one, many) {
  return `${n} ${Number(n) > 1 ? many : one}`
}

export function tripDurationLabel(trip) {
  const days =
    trip?.dates?.days ||
    (trip?.dates?.start && trip?.dates?.end ? daysBetween(trip.dates.start, trip.dates.end) + 1 : 0)
  if (days <= 0) return '—'
  const nights = Math.max(0, days - 1)
  return nights > 0
    ? `${plural(days, 'jour', 'jours')} · ${plural(nights, 'nuit', 'nuits')}`
    : plural(days, 'jour', 'jours')
}
