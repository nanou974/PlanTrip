import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import App from './App.jsx'
import { clearTrips, draftToTrip, upsertTrip } from './state/store.js'

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

beforeEach(() => {
  cleanup()
  clearTrips()
  sessionStorage.clear()
  window.localStorage.clear()
})

describe('navigation publique', () => {
  it('affiche l’accueil', () => {
    renderAt('/')
    expect(screen.getByText(/Le GPS qui s’adapte|Le GPS qui s'adapte/i)).toBeTruthy()
  })

  it('affiche la FAQ', () => {
    renderAt('/faq')
    expect(screen.getByText('Questions fréquentes')).toBeTruthy()
  })

  it('couvre les questions essentielles dans la FAQ', () => {
    renderAt('/faq')
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(8)
    expect(screen.getByRole('heading', { name: 'Faut-il un compte pour préparer un voyage ?' })).toBeTruthy()
    expect(screen.getByText(/jamais écrit en clair/)).toBeTruthy()
    expect(screen.getByText(/exportez tout en JSON/)).toBeTruthy()
  })

  it('publie de vrais articles dans le blog', () => {
    renderAt('/blog')
    expect(screen.getByRole('heading', { name: /Touristique, économique, rapide ou découverte/ })).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Partir sans réseau/ })).toBeTruthy()
    expect(screen.queryByText(/Bientôt en ligne/)).toBeNull()
  })

  it('affiche le 404 pour une route inconnue', () => {
    renderAt('/introuvable')
    expect(screen.getByText(/Cette page n'existe pas ou a été déplacée/)).toBeTruthy()
  })

  it('affiche le planificateur', () => {
    renderAt('/preparer-son-voyage')
    expect(screen.getByText(/PlanTrip construit/)).toBeTruthy()
  })

  it('affiche les pages de compte', () => {
    renderAt('/login')
    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeTruthy()
    cleanup()

    renderAt('/register')
    expect(screen.getByRole('heading', { name: 'Créer un compte' })).toBeTruthy()
  })

  it('affiche les pages légales', () => {
    renderAt('/mentions-legales')
    expect(screen.getAllByText('Mentions légales').length).toBeGreaterThan(0)
    cleanup()

    renderAt('/confidentialite')
    expect(screen.getAllByText('Confidentialité').length).toBeGreaterThan(0)
    cleanup()

    renderAt('/accessibilite')
    expect(screen.getAllByText('Accessibilité').length).toBeGreaterThan(0)
  })

  it('renvoie au planificateur depuis le résultat sans voyage', async () => {
    renderAt('/resultat-voyage')
    expect(await screen.findByText(/PlanTrip construit/, {}, { timeout: 5000 })).toBeTruthy()
  })
})

describe('espace personnel', () => {
  it('affiche la liste vide', () => {
    renderAt('/mes-voyages')
    expect(screen.getByText('Votre liste est vide')).toBeTruthy()
  })

  it('ouvre le tableau de bord', () => {
    renderAt('/tableau-de-bord')
    expect(screen.getAllByText(/Tableau de bord/).length).toBeGreaterThan(0)
  })
})

describe('espace voyage', () => {
  it('ouvre les sections d’un voyage existant', () => {
    const saved = draftToTrip(plannerDraft(), null)
    upsertTrip(saved)

    renderAt(`/voyages/${saved.id}/organisation`)
    expect(screen.getAllByText('Organisation').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Charger les tâches types').length).toBeGreaterThan(0)
  })

  it('redirige vers la liste si le voyage n’existe pas', () => {
    renderAt('/voyages/t_inexistant/budget')
    expect(screen.getByText('Votre liste est vide')).toBeTruthy()
  })

  it('ouvre le budget du voyage', () => {
    const saved = draftToTrip(plannerDraft(), null)
    upsertTrip(saved)
    renderAt(`/voyages/${saved.id}/budget`)
    expect(screen.getAllByText('Enveloppe').length).toBeGreaterThan(0)
    expect(screen.getByText('Ajouter une dépense')).toBeTruthy()
    expect(screen.getByText('Estimation du voyage')).toBeTruthy()
  })

  it('ouvre les lieux avec la recherche le long du trajet', () => {
    const saved = draftToTrip(plannerDraft(), null)
    upsertTrip(saved)
    renderAt(`/voyages/${saved.id}/lieux`)
    expect(screen.getByText('Lieux du voyage')).toBeTruthy()
    expect(screen.getByText(/Explorer le long du trajet/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Rechercher' })).toBeEnabled()
    expect(screen.getByLabelText('Type de lieu à rechercher')).toBeTruthy()
  })

  it("ouvre l'aperçu du voyage", async () => {
    const saved = draftToTrip(plannerDraft(), null)
    upsertTrip(saved)
    renderAt(`/voyages/${saved.id}`)
    expect(screen.getAllByText(/Tableau de bord|Distance/).length).toBeGreaterThan(0)
    await screen.findByText(/Estimation directe|Route calculée|À calculer/, {}, { timeout: 5000 })
  })
})
