import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OfflineIndicator } from './connectivity.jsx'
import { isOnline, useOnlineStatus } from './online.js'

function Probe() {
  const online = useOnlineStatus()
  return <span data-testid="etat">{online ? 'en ligne' : 'hors ligne'}</span>
}

function fire(type) {
  act(() => {
    window.dispatchEvent(new Event(type))
  })
}

afterEach(cleanup)

describe('isOnline', () => {
  it('retourne un booléen (true par défaut dans jsdom)', () => {
    expect(typeof isOnline()).toBe('boolean')
    expect(isOnline()).toBe(true)
  })
})

describe('useOnlineStatus', () => {
  it('suit les événements online / offline', () => {
    render(<Probe />)
    expect(screen.getByTestId('etat')).toHaveTextContent('en ligne')
    fire('offline')
    expect(screen.getByTestId('etat')).toHaveTextContent('hors ligne')
    fire('online')
    expect(screen.getByTestId('etat')).toHaveTextContent('en ligne')
  })

  it('détache ses écouteurs au démontage', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<Probe />)
    const added = add.mock.calls.filter(([type]) => type === 'offline').length
    unmount()
    const removed = remove.mock.calls.filter(([type]) => type === 'offline').length
    expect(added).toBe(1)
    expect(removed).toBe(1)
  })
})

describe('OfflineIndicator', () => {
  it('reste absent en ligne puis affiche le bandeau hors connexion', () => {
    render(<OfflineIndicator />)
    expect(screen.queryByRole('status')).toBeNull()

    fire('offline')
    const banner = screen.getByRole('status')
    expect(banner).toHaveTextContent('Hors connexion.')
    expect(banner).toHaveTextContent('Vos voyages restent consultables et modifiables')
    expect(banner).toHaveTextContent('les fonds de carte nécessitent Internet')

    fire('online')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('n’annonce jamais un service réseau comme disponible hors ligne', () => {
    render(<OfflineIndicator />)
    fire('offline')
    expect(screen.getByRole('status')).not.toHaveTextContent(/tout fonctionne/i)
  })
})
