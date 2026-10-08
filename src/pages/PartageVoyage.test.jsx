import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../lib/api.js', () => {
  class ApiError extends Error {
    constructor(message, { code = 'error', status = 0 } = {}) {
      super(message)
      this.name = 'ApiError'
      this.code = code
      this.status = status
    }
  }
  return {
    api: vi.fn(),
    apiEnabled: () => true,
    isApiError: (e) => e?.name === 'ApiError',
    isUnreachable: (e) => Boolean(e?.unreachable),
    ApiError,
  }
})
vi.mock('../components/MapView.jsx', () => ({
  default: ({ coordinates, markers }) => <div data-testid="map" data-points={coordinates.length} data-markers={markers.length} />,
}))

import { api, ApiError } from '../lib/api.js'
import PartageVoyage from './PartageVoyage.jsx'

const trip = {
  name: 'Paris → Lyon',
  departure: { name: 'Paris, France', lat: 48.9, lon: 2.4 },
  destination: { name: 'Lyon', lat: 45.76, lon: 4.83 },
  returnTrip: true,
  dates: { start: '2026-11-01', end: '2026-11-03', days: 3, nights: 2 },
  travelers: 2,
  vehicle: { slug: 'camping-car' },
  itinerary: { distanceKm: 465, durationSec: 17000, polyline: [[2.9, 48], [4.83, 45.76]] },
  places: [{ name: 'Dijon', kind: 'stop', lat: 47.3, lon: 5.04, order: 1 }],
  departureHidden: true,
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/partage/abc']}>
      <Routes>
        <Route path="/partage/:token" element={<PartageVoyage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  // Bloc volontaire : renvoyer le mock ferait de lui une fonction de nettoyage appelée par vitest.
  api.mockReset()
})
afterEach(cleanup)

describe('PartageVoyage', () => {
  it('affiche le voyage en lecture seule avec la mention du départ masqué', async () => {
    api.mockResolvedValue({ trip })
    renderPage()
    expect(await screen.findByTestId('shared-trip')).toBeTruthy()
    expect(api).toHaveBeenCalledWith('/shared/abc')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Paris → Lyon')
    expect(screen.getByText('Lecture seule')).toBeTruthy()
    expect(screen.getByText(/aller-retour/)).toBeTruthy()
    expect(screen.getByText('Dijon')).toBeTruthy()
    expect(screen.getByTestId('departure-hidden-note')).toBeTruthy()
    expect((await screen.findByTestId('map')).getAttribute('data-points')).toBe('2')
    expect(screen.getByRole('link', { name: /Préparer mon voyage/ }).getAttribute('href')).toBe('/preparer-son-voyage')
    // Aucune action d'édition n'est proposée.
    expect(screen.queryByRole('button', { name: /Modifier|Supprimer/ })).toBeNull()
  })

  it('ne parle pas de départ masqué quand il est montré', async () => {
    api.mockResolvedValue({ trip: { ...trip, departureHidden: false } })
    renderPage()
    await screen.findByTestId('shared-trip')
    expect(screen.queryByTestId('departure-hidden-note')).toBeNull()
  })

  it('demande aux moteurs de recherche de ne pas indexer la page', async () => {
    api.mockResolvedValue({ trip })
    renderPage()
    await screen.findByTestId('shared-trip')
    expect(document.head.querySelector('meta[name="robots"]').content).toContain('noindex')
    cleanup()
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
  })

  it('un lien révoqué ou inconnu est expliqué', async () => {
    api.mockRejectedValue(new ApiError('non', { code: 'no_share', status: 404 }))
    renderPage()
    expect(await screen.findByText('Ce lien de partage n’existe plus')).toBeTruthy()
    expect(screen.queryByTestId('shared-trip')).toBeNull()
  })

  it('serveur injoignable : message dédié', async () => {
    api.mockRejectedValue(Object.assign(new Error('x'), { unreachable: true }))
    renderPage()
    expect(await screen.findByText('Serveur injoignable')).toBeTruthy()
  })
})
