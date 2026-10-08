import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthCtx } from '../lib/authContext.js'

vi.mock('../services/syncService.js', () => ({
  useSyncStatus: vi.fn(),
  enableSync: vi.fn(),
  disableSync: vi.fn(),
  listShares: vi.fn(),
  createShare: vi.fn(),
  revokeShare: vi.fn(),
  resumeUrl: vi.fn(() => 'https://plantrip.fr/reprendre#cle-secrete'),
  shareUrl: (token) => `https://plantrip.fr/partage/${token}`,
}))

import * as sync from '../services/syncService.js'
import { clearTrips, forgetTombstones, getTombstones, upsertTrip } from '../state/store.js'
import { createTrip } from '../domain/trip.js'
import SyncShareCard from './SyncShareCard.jsx'

const TOKEN = 'd'.repeat(32)

function renderCard(props = { tripId: 't_1' }) {
  return render(
    <MemoryRouter>
      <AuthCtx.Provider value={{ user: null }}>
        <SyncShareCard {...props} />
      </AuthCtx.Provider>
    </MemoryRouter>,
  )
}

const status = (patch) => ({ mode: 'off', hasSpace: false, optOut: false, lastOkAt: 0, syncing: false, error: '', ...patch })

beforeEach(() => {
  vi.clearAllMocks()
  clearTrips()
  forgetTombstones(Object.keys(getTombstones()))
  upsertTrip(
    createTrip({
      id: 't_1',
      name: 'Paris → Lyon',
      departure: { name: 'Paris', lat: 48.85, lon: 2.35 },
      destination: { name: 'Lyon', lat: 45.76, lon: 4.83 },
      dates: { start: '2026-11-01', end: '2026-11-03' },
    }),
  )
  sync.listShares.mockResolvedValue([])
})
afterEach(cleanup)

describe('SyncShareCard', () => {
  it('désactivée : propose d’activer et explique ce qui est enregistré', async () => {
    sync.useSyncStatus.mockReturnValue(status({ mode: 'off' }))
    sync.enableSync.mockResolvedValue({ ok: true })
    renderCard()
    expect(screen.getByText(/restent sur cet appareil/)).toBeTruthy()
    expect(screen.queryByTestId('share-box')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Activer la synchronisation/ }))
    await waitFor(() => expect(sync.enableSync).toHaveBeenCalled())
    expect(await screen.findByRole('status')).toHaveTextContent('Synchronisation activée.')
    expect(screen.getByRole('link', { name: /Ce qui est enregistré/ }).getAttribute('href')).toBe('/confidentialite')
  })

  it('sans compte : affiche le lien de reprise avec son avertissement', () => {
    sync.useSyncStatus.mockReturnValue(status({ mode: 'space', hasSpace: true, lastOkAt: Date.now() }))
    renderCard()
    expect(screen.queryByTestId('resume-link')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Reprendre sur un autre appareil/ }))
    const box = screen.getByTestId('resume-link')
    expect(box.querySelector('input').value).toContain('/reprendre#')
    expect(box.textContent).toMatch(/ne le publiez pas/)
  })

  it('avec un compte : pas de lien de reprise', () => {
    sync.useSyncStatus.mockReturnValue(status({ mode: 'account', lastOkAt: Date.now() }))
    renderCard()
    expect(screen.queryByRole('button', { name: /Reprendre sur un autre appareil/ })).toBeNull()
    expect(screen.getByText(/synchronisés avec votre compte/)).toBeTruthy()
  })

  it('crée un lien de partage avec le départ masqué par défaut, puis l’arrête', async () => {
    sync.useSyncStatus.mockReturnValue(status({ mode: 'space', hasSpace: true }))
    sync.createShare.mockResolvedValue({ token: TOKEN, tripId: 't_1', showDeparture: false })
    sync.revokeShare.mockResolvedValue(undefined)
    renderCard()
    const checkbox = screen.getByRole('checkbox', { name: /point de départ exact/ })
    expect(checkbox.checked).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: /Créer un lien de partage/ }))
    await waitFor(() => expect(sync.createShare).toHaveBeenCalledWith(null, 't_1', { showDeparture: false }))
    const link = await screen.findByLabelText('Lien de partage')
    expect(link.value).toBe(`https://plantrip.fr/partage/${TOKEN}`)
    fireEvent.click(screen.getByRole('button', { name: /Arrêter le partage/ }))
    await waitFor(() => expect(sync.revokeShare).toHaveBeenCalledWith(null, TOKEN))
    await waitFor(() => expect(screen.queryByLabelText('Lien de partage')).toBeNull())
    expect(screen.getByRole('status')).toHaveTextContent('le lien ne fonctionne plus')
  })

  it('met à jour le partage existant quand on coche le départ exact', async () => {
    sync.useSyncStatus.mockReturnValue(status({ mode: 'space', hasSpace: true }))
    sync.listShares.mockResolvedValue([{ token: TOKEN, tripId: 't_1', showDeparture: false }])
    sync.createShare.mockResolvedValue({ token: TOKEN, tripId: 't_1', showDeparture: true })
    renderCard()
    await screen.findByLabelText('Lien de partage')
    fireEvent.click(screen.getByRole('checkbox', { name: /point de départ exact/ }))
    await waitFor(() => expect(sync.createShare).toHaveBeenCalledWith(null, 't_1', { showDeparture: true }))
  })

  it('annonce une panne réseau sans rien casser', async () => {
    sync.useSyncStatus.mockReturnValue(status({ mode: 'off' }))
    sync.enableSync.mockRejectedValue(Object.assign(new Error('x'), { unreachable: true }))
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: /Activer la synchronisation/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Serveur injoignable')
  })

  it('désactiver demande confirmation avant d’effacer du serveur', async () => {
    sync.useSyncStatus.mockReturnValue(status({ mode: 'space', hasSpace: true }))
    sync.disableSync.mockResolvedValue(undefined)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    renderCard()
    const button = screen.getByRole('button', { name: /Désactiver et effacer du serveur/ })
    fireEvent.click(button)
    expect(sync.disableSync).not.toHaveBeenCalled()
    fireEvent.click(button)
    await waitFor(() => expect(sync.disableSync).toHaveBeenCalledTimes(1))
    confirm.mockRestore()
  })

  it('sans voyage connu : seulement l’état de la synchronisation', () => {
    sync.useSyncStatus.mockReturnValue(status({ mode: 'space', hasSpace: true }))
    renderCard({ tripId: 'inconnu' })
    expect(screen.queryByTestId('share-box')).toBeNull()
  })
})
