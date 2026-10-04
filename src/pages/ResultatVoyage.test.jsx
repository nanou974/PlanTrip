import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App.jsx'
import vehicles from '../data/vehicles.json'
import { formatDuration } from '../domain/format.js'
import { estimateItinerary, itineraryPoints } from '../domain/itinerary.js'
import { clearCurrentTrip, clearTrips, saveTrip } from '../state/store.js'

const VOITURE = vehicles.find((v) => v.slug === 'voiture')

function plannerDraft(patch = {}) {
  return {
    departure: { name: 'Paris, Île-de-France', lat: 48.8566, lon: 2.3522 },
    destination: { name: 'Lyon, Auvergne-Rhône-Alpes', lat: 45.764, lon: 4.8357 },
    dates: { start: '2026-06-01', end: '2026-06-05' },
    travelers: 2,
    vehicle: { slug: 'voiture' },
    profile: { economies: 0.6, paysages: 0.6, confort: 0.6 },
    preferences: { driveTime: 'balanced' },
    budget: 900,
    ...patch,
  }
}

function renderAt(path) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

function bodyText() {
  return document.body.textContent || ''
}

function mealsTotal() {
  const label = screen.getByText(/^Total repas/)
  const spans = label.parentElement.querySelectorAll(':scope > span')
  return Number(spans[spans.length - 1].textContent.replace(/\D/g, ''))
}

beforeEach(() => {
  cleanup()
  clearTrips()
  clearCurrentTrip()
  sessionStorage.clear()
  window.localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
  URL.createObjectURL = vi.fn(() => 'blob:mock')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  delete URL.createObjectURL
  delete URL.revokeObjectURL
})

describe('résultat du voyage', () => {
  it('s’affiche avec les données du modèle sans valeur invalide', async () => {
    saveTrip(plannerDraft())
    renderAt('/resultat-voyage')

    expect(
      await screen.findByRole('heading', { name: 'Itinéraire' }, { timeout: 5000 }),
    ).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Votre voyage Paris → Lyon/ })).toBeTruthy()

    const text = bodyText()
    expect(text).not.toContain('NaN')
    expect(text).not.toContain('undefined')
    expect(text).not.toContain('[object Object]')

    expect(text).toContain('900')
    expect(text).toContain(VOITURE.advice[0])
    expect(text).toContain(VOITURE.routing.realisticSpeed)
    expect(screen.getByText(/Budget 900/)).toBeTruthy()
  })

  it('affiche une estimation hors ligne quand OSRM est injoignable', async () => {
    const saved = saveTrip(plannerDraft())
    renderAt('/resultat-voyage')

    expect(await screen.findByText('Estimation directe', {}, { timeout: 5000 })).toBeTruthy()
    expect(screen.getByText(/Calcul en ligne indisponible/)).toBeTruthy()

    const geo = estimateItinerary(itineraryPoints(saved), VOITURE.avgSpeedKph)
    expect(bodyText()).toContain(formatDuration(geo.durationSec))
    expect(bodyText()).toContain(`${geo.distanceKm}`.replace('.', ','))
  })

  it('propose les hébergements propres au véhicule choisi', async () => {
    saveTrip(plannerDraft({ vehicle: { slug: 'camping-car' } }))
    renderAt('/resultat-voyage')

    expect(
      await screen.findByRole('heading', { name: 'Hébergement' }, { timeout: 5000 }),
    ).toBeTruthy()
    expect(screen.getByText('Camping-car park')).toBeTruthy()
    expect(screen.queryByText('Aire de parking')).toBeNull()
    expect(bodyText()).not.toContain('NaN')
    expect(bodyText()).not.toContain('[object Object]')
  })

  it('tient compte de l’aller-retour et des préférences de conduite', async () => {
    saveTrip(
      plannerDraft({
        preferences: { driveTime: 'balanced', avoidTolls: true, avoidHighways: true, returnTrip: true },
      }),
    )
    renderAt('/resultat-voyage')

    expect(
      await screen.findByRole('heading', { name: 'Itinéraire' }, { timeout: 5000 }),
    ).toBeTruthy()
    expect(screen.getByText('Sans péage')).toBeTruthy()
    expect(screen.getByText('Sans autoroute')).toBeTruthy()
    expect(screen.getByText('Aller-retour')).toBeTruthy()
  })

  it('recalcule le total repas quand on change un choix', async () => {
    saveTrip(plannerDraft())
    const user = userEvent.setup()
    renderAt('/resultat-voyage')

    await screen.findByRole('heading', { name: 'Repas du voyage' }, { timeout: 5000 })
    const before = mealsTotal()
    expect(before).toBeGreaterThan(0)

    await user.click(screen.getAllByRole('button', { name: /Pas de petit-déjeuner/ })[0])
    expect(mealsTotal()).toBeLessThan(before)
  })

  it('propose les actions et les liens de navigation', async () => {
    saveTrip(plannerDraft())
    renderAt('/resultat-voyage')

    await screen.findByRole('heading', { name: 'Actions' }, { timeout: 5000 })
    expect(screen.getByRole('button', { name: /Télécharger GPX/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Imprimer \/ PDF/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Modifier le voyage/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Google Maps/ }).getAttribute('href')).toContain(
      'google.com/maps',
    )
    expect(screen.getByRole('link', { name: /Waze/ }).getAttribute('href')).toContain('waze.com')
  })

  it('affiche un état explicite quand les coordonnées manquent', async () => {
    saveTrip(plannerDraft({ departure: { name: 'Paris' }, destination: { name: 'Lyon' } }))
    renderAt('/resultat-voyage')

    expect(
      await screen.findByText('Coordonnées manquantes : la carte est indisponible.', {}, { timeout: 5000 }),
    ).toBeTruthy()
    expect(screen.getByText(/Points de départ ou d’arrivée manquants/)).toBeTruthy()
    expect(screen.getByText(/navigation GPS indisponible/)).toBeTruthy()

    const text = bodyText()
    expect(text).not.toContain('NaN')
    expect(text).not.toContain('undefined')
    expect(text).not.toContain('[object Object]')
  })

  it('exporte un GPX même hors ligne avec un message explicite', async () => {
    saveTrip(plannerDraft())
    const user = userEvent.setup()
    renderAt('/resultat-voyage')

    await screen.findByRole('heading', { name: 'Actions' }, { timeout: 5000 })
    await user.click(screen.getByRole('button', { name: /Télécharger GPX/ }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      /GPX exporté en points d’étape/,
    )
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
})
