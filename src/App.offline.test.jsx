import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { clearTrips, draftToTrip, upsertTrip } from './state/store.js'

const originalFetch = globalThis.fetch

const plannerDraft = () => ({
  departure: { name: 'Paris, Île-de-France', lat: 48.8566, lon: 2.3522 },
  destination: { name: 'Lyon, Auvergne-Rhône-Alpes', lat: 45.764, lon: 4.8357 },
  dates: { start: '2026-06-01', end: '2026-06-05' },
  travelers: 2,
  vehicle: { slug: 'voiture' },
  profile: { economies: 0.6, paysages: 0.6, confort: 0.6 },
  preferences: { driveTime: 'balanced' },
  budget: 900,
})

function renderAt(path) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

function fireOffline() {
  act(() => {
    window.dispatchEvent(new Event('offline'))
  })
}

beforeEach(() => {
  cleanup()
  clearTrips()
  sessionStorage.clear()
  window.localStorage.clear()
  // Aucun réseau dans ce bloc de tests : tout appel distant échoue.
  globalThis.fetch = vi.fn(() => Promise.reject(new Error('réseau indisponible')))
})

afterEach(() => {
  cleanup()
  if (originalFetch === undefined) delete globalThis.fetch
  else globalThis.fetch = originalFetch
})

describe('application hors connexion', () => {
  it('affiche le bandeau explicite sur un espace privé local', () => {
    renderAt('/tableau-de-bord')
    expect(screen.queryByText('Hors connexion.')).toBeNull()

    fireOffline()

    expect(screen.getByText('Hors connexion.')).toBeInTheDocument()
    expect(screen.getAllByText(/Tableau de bord/).length).toBeGreaterThan(0)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('lire et modifier un voyage sauvegardé reste possible sans réseau', async () => {
    const saved = draftToTrip(plannerDraft(), null)
    upsertTrip(saved)

    renderAt(`/voyages/${saved.id}/organisation`)
    expect(screen.getAllByText('Organisation').length).toBeGreaterThan(0)

    fireOffline()

    expect(screen.getByText('Hors connexion.')).toBeInTheDocument()
    expect(screen.getAllByText(saved.name).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Charger les tâches types').length).toBeGreaterThan(0)
  })

  it('liste les voyages depuis le stockage local', () => {
    const saved = draftToTrip(plannerDraft(), null)
    upsertTrip(saved)

    renderAt('/mes-voyages')
    fireOffline()

    expect(screen.getByText('Hors connexion.')).toBeInTheDocument()
    expect(screen.getAllByText(saved.name).length).toBeGreaterThan(0)
  })

  it('ouvre les sections de données locales (documents, budget) sans réseau', () => {
    const saved = draftToTrip(plannerDraft(), null)
    upsertTrip(saved)

    renderAt(`/voyages/${saved.id}/budget`)
    fireOffline()

    expect(screen.getByText('Hors connexion.')).toBeInTheDocument()
    expect(screen.getByText('Estimation du voyage')).toBeInTheDocument()
    expect(screen.getByText('Ajouter une dépense')).toBeInTheDocument()
  })

  it('signale l’échec de la recherche d’adresses au lieu de faire croire à un résultat', async () => {
    // Comportement réel d'un navigateur hors ligne : navigator.onLine passe à false.
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true })
    try {
      renderAt('/preparer-son-voyage')
      fireOffline()

      const input = screen.getByLabelText('Départ')
      await userEvent.type(input, 'Paris')

      expect(await screen.findByText(/Recherche impossible/, {}, { timeout: 3000 })).toBeInTheDocument()
      expect(screen.getByText(/une connexion est nécessaire/)).toBeInTheDocument()
      expect(globalThis.fetch).toHaveBeenCalled()
    } finally {
      delete window.navigator.onLine
    }
  })

  it('ne promet rien d’autre que le local dans la FAQ', () => {
    renderAt('/faq')
    fireOffline()

    expect(screen.getByText('Questions fréquentes')).toBeInTheDocument()
    expect(screen.getByText(/PlanTrip s'ouvre sans réseau/)).toBeInTheDocument()
    expect(screen.getAllByText(/nécessitent Internet/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Les cartes restent consultables/)).toBeNull()
  })
})

describe('reprise réseau', () => {
  it('masque le bandeau dès que la connexion revient', async () => {
    renderAt('/tableau-de-bord')
    fireOffline()
    expect(screen.getByText('Hors connexion.')).toBeInTheDocument()

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    await waitFor(() => expect(screen.queryByText('Hors connexion.')).toBeNull())
  })
})
