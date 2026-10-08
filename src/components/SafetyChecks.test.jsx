import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import SafetyChecks from './SafetyChecks.jsx'

afterEach(cleanup)

describe('SafetyChecks', () => {
  it('affiche les contrôles avec la pression des pneus, premier groupe ouvert', () => {
    render(<SafetyChecks vehicleSlug="voiture" />)
    const box = screen.getByTestId('safety-checks')
    expect(box.textContent).toContain('Contrôles de sécurité avant le départ')
    expect(box.textContent).toContain('Pression')
    const groups = box.querySelectorAll('details')
    expect(groups.length).toBeGreaterThan(3)
    expect(groups[0].open).toBe(true)
    expect(groups[1].open).toBe(false)
  })

  it('ajoute la vie à bord pour un camping-car', () => {
    render(<SafetyChecks vehicleSlug="camping-car" />)
    expect(screen.getByTestId('safety-checks').textContent).toContain('Vie à bord')
  })

  it('ne rend rien pour un véhicule inconnu', () => {
    const { container } = render(<SafetyChecks vehicleSlug="inconnu" />)
    expect(container.innerHTML).toBe('')
  })
})
