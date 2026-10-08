import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App.jsx'
import { clearCurrentTrip, clearTrips, getTrip, saveTrip } from '../state/store.js'

function draft(patch = {}) {
  return {
    departure: { name: 'Toulouse, Occitanie', lat: 43.6, lon: 1.44 },
    destination: { name: 'Briançon, Hautes-Alpes', lat: 44.9, lon: 6.64 },
    dates: { start: '2026-12-10', end: '2026-12-12' },
    travelers: 1,
    vehicle: { slug: 'camping-car', heightM: 3.4, weightT: 3.5 },
    profile: { economies: 0.8, paysages: 0.3, confort: 0.2 },
    preferences: { driveTime: 'balanced', returnTrip: true },
    budget: 700,
    ...patch,
  }
}

beforeEach(() => {
  cleanup()
  clearTrips()
  clearCurrentTrip()
  sessionStorage.clear()
  window.localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('formulaire en mode édition', () => {
  it('recharge budget, priorités, aller-retour et gabarit d’un voyage enregistré', async () => {
    const saved = saveTrip(draft())
    const tripId = saved?.id || getTrip()?.id
    sessionStorage.setItem('plantrip_edit_mode', '1')
    if (tripId) sessionStorage.setItem('plantrip_edit_trip', tripId)
    window.history.pushState({}, '', '/preparer-son-voyage')
    render(<App />)

    expect(await screen.findByDisplayValue('700')).toBeTruthy()
    expect(screen.getByLabelText(/Hauteur/).value).toBe('3.4')
    expect(screen.getByLabelText(/Poids total/).value).toBe('3.5')
    const text = document.body.textContent || ''
    expect(text).not.toContain('NaN')
    expect(text).not.toContain('[object Object]')
    const returnBox = screen.getAllByRole('checkbox').find((c) => /retour/i.test(c.closest('label')?.textContent || ''))
    expect(returnBox?.checked).toBe(true)
  })
})

describe('validation du formulaire', () => {
  it('annonce les informations manquantes au clic sur « Construire mon voyage »', async () => {
    window.history.pushState({}, '', '/preparer-son-voyage')
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /Construire mon voyage/ }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Informations manquantes')
    expect(alert.textContent).toContain('point de départ')
    expect(alert.textContent).toContain('destination')
    expect(alert.textContent).toContain('véhicule')
    expect(alert.textContent).toContain('Budget')
    expect(alert.textContent).toContain('Date de départ')
  })
})
