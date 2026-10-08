import { describe, expect, it } from 'vitest'
import { breaksFor, drivingDaysFor, planDriving, pointAtFraction } from './driving.js'

const H = 3600

describe('drivingDaysFor', () => {
  it('un trajet court se fait en une journée, même sous 3 h', () => {
    expect(drivingDaysFor(1.5 * H, 'short')).toBe(1)
    expect(drivingDaysFor(5 * H, 'short')).toBe(1)
    expect(drivingDaysFor(6 * H, 'long')).toBe(1)
  })

  it('ne dépasse jamais 6 h par jour', () => {
    for (const driveTime of ['short', 'balanced', 'long']) {
      for (const hours of [6.5, 9, 12, 13.5, 20, 31]) {
        const days = drivingDaysFor(hours * H, driveTime)
        expect((hours * H) / days).toBeLessThanOrEqual(6 * H + 1)
      }
    }
  })

  it('ne descend pas sous 3 h par jour dès que le trajet dépasse 6 h', () => {
    for (const driveTime of ['short', 'balanced', 'long']) {
      for (const hours of [6.5, 9, 12, 13.5, 20, 31]) {
        const days = drivingDaysFor(hours * H, driveTime)
        expect((hours * H) / days).toBeGreaterThanOrEqual(3 * H - 1)
      }
    }
  })

  it('suit la préférence du voyageur', () => {
    const t = 13.5 * H
    expect(drivingDaysFor(t, 'short')).toBe(4)
    expect(drivingDaysFor(t, 'balanced')).toBe(3)
    expect(drivingDaysFor(t, 'long')).toBe(3)
    expect(drivingDaysFor(9 * H, 'long')).toBe(2)
  })

  it('renvoie 0 sans durée valide', () => {
    expect(drivingDaysFor(0)).toBe(0)
    expect(drivingDaysFor(NaN)).toBe(0)
  })
})

describe('breaksFor', () => {
  it('une pause toutes les 2 h, de 15 à 20 minutes', () => {
    expect(breaksFor(1.5 * H)).toEqual({ count: 0, minMinutes: 0, maxMinutes: 0 })
    expect(breaksFor(2 * H).count).toBe(0)
    expect(breaksFor(2.5 * H)).toEqual({ count: 1, minMinutes: 15, maxMinutes: 20 })
    expect(breaksFor(4.5 * H)).toEqual({ count: 2, minMinutes: 30, maxMinutes: 40 })
    expect(breaksFor(6 * H).count).toBe(2)
  })
})

describe('pointAtFraction', () => {
  const line = [
    [0, 0],
    [0, 1],
    [0, 2],
  ]
  it('situe le milieu et les extrémités', () => {
    expect(pointAtFraction(line, 0)).toEqual({ lat: 0, lon: 0 })
    expect(pointAtFraction(line, 1).lat).toBeCloseTo(2, 5)
    expect(pointAtFraction(line, 0.5).lat).toBeCloseTo(1, 3)
    expect(pointAtFraction(line, 0.25).lat).toBeCloseTo(0.5, 3)
  })
  it('renvoie null sans tracé exploitable', () => {
    expect(pointAtFraction([], 0.5)).toBeNull()
    expect(pointAtFraction([[1, 1]], 0.5)).toBeNull()
  })
})

describe('planDriving', () => {
  const line = [
    [0, 40],
    [0, 50],
  ]

  it('trajet de 13 h 29 : 3 jours et 2 nuits en route (équilibré)', () => {
    const plan = planDriving({ durationSec: 13.48 * H, driveTime: 'balanced', nights: 5, coordinates: line })
    expect(plan.days).toBe(3)
    expect(plan.roadNights).toBe(2)
    expect(plan.stops).toHaveLength(2)
    expect(plan.stops[0].lat).toBeCloseTo(43.33, 1)
    expect(plan.stops[1].lat).toBeCloseTo(46.67, 1)
    expect(plan.tooShort).toBe(false)
    expect(plan.nightsAtDestination).toBe(3)
  })

  it('prévient quand les dates sont trop courtes', () => {
    const plan = planDriving({ durationSec: 13.48 * H, driveTime: 'balanced', nights: 1, coordinates: line })
    expect(plan.tooShort).toBe(true)
    expect(plan.neededNights).toBe(2)
    expect(plan.nightsAtDestination).toBe(0)
  })

  it('un trajet de moins de 6 h ne demande aucune nuit en route', () => {
    const plan = planDriving({ durationSec: 4 * H, nights: 0, coordinates: line })
    expect(plan.days).toBe(1)
    expect(plan.stops).toEqual([])
    expect(plan.tooShort).toBe(false)
    expect(plan.breaks.count).toBe(1)
  })

  it('aller-retour : les nuits en route sont comptées dans les deux sens', () => {
    const plan = planDriving({ durationSec: 18 * H, driveTime: 'balanced', roundTrip: true, nights: 3, coordinates: line })
    expect(plan.legSec).toBe(9 * H)
    expect(plan.days).toBe(2)
    expect(plan.roadNights).toBe(2)
    expect(plan.tooShort).toBe(false)
    expect(plan.nightsAtDestination).toBe(1)
    // l'étape de l'aller est au milieu de la première moitié du tracé
    expect(plan.stops[0].lat).toBeCloseTo(42.5, 1)
  })

  it('fonctionne sans tracé : jours et pauses, sans position', () => {
    const plan = planDriving({ durationSec: 9 * H, nights: 4 })
    expect(plan.stops[0].lat).toBeUndefined()
    expect(plan.days).toBe(2)
  })

  it('renvoie null sans durée', () => {
    expect(planDriving({ durationSec: 0 })).toBeNull()
  })
})
