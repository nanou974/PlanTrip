import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './auth.jsx'
import { useAuth } from './authContext.js'
import { PASSWORD_ALGO, PASSWORD_UNAVAILABLE_MESSAGE } from './password.js'

let authView

function auth() {
  return authView.result.current
}

function renderAuth() {
  authView = renderHook(() => useAuth(), { wrapper: AuthProvider })
}

function rawDb() {
  return localStorage.getItem('plantrip_users_db') || ''
}

function usersDb() {
  return JSON.parse(rawDb() || '[]')
}

async function run(fn) {
  await act(async () => {
    await fn()
  })
}

beforeEach(() => {
  localStorage.clear()
  authView = null
})

afterEach(cleanup)

describe('comptes locaux', () => {
  it('enregistre un compte haché, jamais en clair', async () => {
    renderAuth()
    await run(() => auth().register({ email: 'camille@exemple.fr', password: 'Secret-123', name: 'Camille' }))

    expect(rawDb()).not.toContain('Secret-123')
    const [u] = usersDb()
    expect(u.password).toBeUndefined()
    expect(u.auth.algo).toBe(PASSWORD_ALGO)
    expect(auth().user).toMatchObject({ email: 'camille@exemple.fr', name: 'Camille', provider: 'email' })
  })

  it('connecte avec le bon mot de passe et refuse le mauvais', async () => {
    renderAuth()
    await run(() => auth().register({ email: 'camille@exemple.fr', password: 'Secret-123' }))
    await run(() => auth().logout())

    await run(() =>
      expect(auth().login({ email: 'camille@exemple.fr', password: 'mauvais' })).rejects.toThrow(
        'Email ou mot de passe incorrect',
      ),
    )
    expect(auth().user).toBeNull()

    await run(() => auth().login({ email: 'camille@exemple.fr', password: 'Secret-123' }))
    expect(auth().user?.email).toBe('camille@exemple.fr')
  })

  it('refuse un email déjà utilisé', async () => {
    renderAuth()
    await run(() => auth().register({ email: 'camille@exemple.fr', password: 'Secret-123' }))
    await run(() =>
      expect(auth().register({ email: 'camille@exemple.fr', password: 'Autre-456' })).rejects.toThrow('Email déjà utilisé'),
    )
    expect(usersDb()).toHaveLength(1)
    expect(rawDb()).not.toContain('Autre-456')
  })

  it('migre un compte ancien en clair au montage, sans le verrouiller', async () => {
    localStorage.setItem(
      'plantrip_users_db',
      JSON.stringify([
        {
          id: 'u1',
          email: 'ancien@exemple.fr',
          password: 'Ancien-1',
          name: 'Ancien',
          provider: 'email',
          avatar: null,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ]),
    )

    renderAuth()
    await waitFor(() => expect(usersDb()[0].auth?.algo).toBe(PASSWORD_ALGO), { timeout: 5000 })

    expect(rawDb()).not.toContain('Ancien-1')
    expect(usersDb()[0].password).toBeUndefined()

    await run(() => auth().login({ email: 'ancien@exemple.fr', password: 'Ancien-1' }))
    expect(auth().user?.email).toBe('ancien@exemple.fr')
  })

  it('refuse le mot de passe d’un compte créé sans mot de passe (Magic Link)', async () => {
    localStorage.setItem(
      'plantrip_users_db',
      JSON.stringify([
        { id: 'u2', email: 'magic@exemple.fr', name: 'magic', provider: 'magic', avatar: null, createdAt: '2025-01-01T00:00:00.000Z' },
      ]),
    )

    renderAuth()
    await run(() =>
      expect(auth().login({ email: 'magic@exemple.fr', password: 'nimporte-quoi' })).rejects.toThrow(
        'Email ou mot de passe incorrect',
      ),
    )
    expect(auth().user).toBeNull()
  })

  it('signale WebCrypto manquant à l’inscription', async () => {
    const original = globalThis.crypto
    vi.stubGlobal('crypto', { getRandomValues: original.getRandomValues.bind(original) })
    try {
      renderAuth()
      await run(() =>
        expect(auth().register({ email: 'camille@exemple.fr', password: 'Secret-123' })).rejects.toThrow(
          PASSWORD_UNAVAILABLE_MESSAGE,
        ),
      )
      expect(usersDb()).toHaveLength(0)
      expect(auth().user).toBeNull()
    } finally {
      vi.stubGlobal('crypto', original)
    }
  })
})
