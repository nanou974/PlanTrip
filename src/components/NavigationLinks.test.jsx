import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import NavigationLinks from './NavigationLinks.jsx'

afterEach(cleanup)

const A = { lat: 48.85, lon: 2.35 }
const B = { lat: 43.6, lon: 1.44 }
const line = [
  [2.35, 48.85],
  [2.0, 46.0],
  [1.44, 43.6],
]

describe('NavigationLinks', () => {
  it('propose Google Maps avec l’étape de nuit, Waze et Apple Plans', () => {
    render(<NavigationLinks departure={A} destination={B} nightStops={[{ lat: 46, lon: 2 }]} coordinates={line} />)
    const maps = screen.getByRole('link', { name: /Google Maps/ })
    expect(maps.getAttribute('href')).toContain('waypoints=46.00000,2.00000')
    expect(screen.getByRole('link', { name: 'Waze' }).getAttribute('href')).toContain('waze.com')
    expect(screen.getByRole('link', { name: 'Apple Plans' }).getAttribute('href')).toContain('maps.apple.com')
    expect(screen.getByTestId('navigation-note').textContent).toContain('recalcule')
    expect(screen.queryByTestId('nav-return')).toBeNull()
  })

  it('ajoute un bloc retour pour un aller-retour', () => {
    render(<NavigationLinks departure={A} destination={B} returnTrip />)
    expect(screen.getByTestId('nav-return')).toBeTruthy()
    const links = screen.getAllByRole('link', { name: /Google Maps/ })
    expect(links).toHaveLength(2)
    expect(links[1].getAttribute('href')).toContain('origin=43.60000,1.44000')
  })

  it('prévient quand le véhicule a un gabarit', () => {
    render(<NavigationLinks departure={A} destination={B} constrained />)
    expect(screen.getByTestId('navigation-note').textContent).toContain('hauteur et le poids')
  })

  it('indique l’indisponibilité sans coordonnées', () => {
    render(<NavigationLinks departure={A} destination={{}} />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(document.body.textContent).toContain('navigation GPS indisponible')
  })
})
