import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthCtx } from '../lib/authContext.js'

vi.mock('../services/syncService.js', async () => {
  const real = await vi.importActual('../services/syncService.js')
  return { ...real, resumeFromLink: vi.fn() }
})

import { resumeFromLink } from '../services/syncService.js'
import Reprendre from './Reprendre.jsx'

const ID = 'a'.repeat(32)
const KEY = 'b'.repeat(64)

function renderPage(user = null) {
  return render(
    <MemoryRouter initialEntries={['/reprendre']}>
      <AuthCtx.Provider value={{ user }}>
        <Routes>
          <Route path="/reprendre" element={<Reprendre />} />
          <Route path="/mes-voyages" element={<p>Page de mes voyages</p>} />
        </Routes>
      </AuthCtx.Provider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  window.history.replaceState(null, '', `/reprendre#${ID}.${KEY}`)
})
afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

describe('Reprendre', () => {
  it('lit la clé du fragment, la retire de la barre d’adresse et reprend les voyages', async () => {
    resumeFromLink.mockResolvedValue({ ok: true })
    renderPage()
    expect(window.location.hash).toBe('')
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre mes voyages' }))
    await waitFor(() => expect(resumeFromLink).toHaveBeenCalledWith({ id: ID, key: KEY }))
    expect(await screen.findByText('Page de mes voyages')).toBeTruthy()
  })

  it('un lien faux affiche une erreur et reste sur la page', async () => {
    resumeFromLink.mockResolvedValue({ ok: false, reason: 'invalid' })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre mes voyages' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('invalide')
  })

  it('un lien incomplet est expliqué', () => {
    window.history.replaceState(null, '', '/reprendre#abc')
    renderPage()
    expect(screen.getByText('Lien de reprise incomplet')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Reprendre mes voyages' })).toBeNull()
  })

  it('une personne connectée est renvoyée vers ses voyages, sans reprise', () => {
    renderPage({ id: 'u1', serverSession: true })
    expect(screen.getByText('Vous êtes connecté')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Reprendre mes voyages' })).toBeNull()
  })
})
