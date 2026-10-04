import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import Contact from './Contact.jsx'
import { buildMailto } from '../lib/contactMailto.js'

afterEach(cleanup)

describe('buildMailto', () => {
  it('prépare l’e-mail vers contact@plantrip.fr avec sujet, message et expéditeur', () => {
    const href = buildMailto({
      name: 'Camille',
      email: 'camille@exemple.fr',
      subject: 'Signaler un bug',
      message: 'Bouton cassé\nsur /faq',
    })

    const [address, query] = href.split('?')
    expect(address).toBe('mailto:contact@plantrip.fr')

    const params = new URLSearchParams(query)
    expect(params.get('subject')).toBe('[PlanTrip] Signaler un bug')
    expect(params.get('body')).toContain('Bouton cassé\nsur /faq')
    expect(params.get('body')).toContain('— Camille')
    expect(params.get('body')).toContain('E-mail de réponse : camille@exemple.fr')
  })

  it('tolère un message vide et des champs facultatifs absents', () => {
    const params = new URLSearchParams(buildMailto({ subject: 'Une question', message: '   ' }).split('?')[1])
    expect(params.get('subject')).toBe('[PlanTrip] Une question')
    expect(params.get('body')).not.toContain('E-mail de réponse')
  })
})

describe('page Contact', () => {
  it('annonce un envoi par messagerie locale, sans faux bouton d’envoi', () => {
    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Sujet/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Votre message/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ouvrir ma messagerie' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Envoyer/ })).toBeNull()
    expect(screen.getByText(/rien ne part depuis le site/)).toBeInTheDocument()
  })
})
