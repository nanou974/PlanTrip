import { describe, expect, it, vi } from 'vitest'
import {
  PASSWORD_ALGO,
  PASSWORD_ITERATIONS,
  PASSWORD_UNAVAILABLE_MESSAGE,
  hashPassword,
  isPasswordHashingAvailable,
  verifyPassword,
} from './password.js'

describe('hachage du mot de passe', () => {
  it('produit une fiche PBKDF2 sans aucun fragment du mot de passe', async () => {
    const stored = await hashPassword('mot-de-passe-solide')
    expect(stored.algo).toBe(PASSWORD_ALGO)
    expect(stored.iterations).toBe(PASSWORD_ITERATIONS)
    expect(stored.salt).toMatch(/^[0-9a-f]{32}$/)
    expect(stored.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(stored)).not.toContain('mot-de-passe-solide')
  })

  it('sélit différemment à chaque appel', async () => {
    const a = await hashPassword('phrase-identique')
    const b = await hashPassword('phrase-identique')
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
  })

  it('valide le bon mot de passe et refuse les autres', async () => {
    const stored = await hashPassword('E2e-Pass-1')
    expect(await verifyPassword('E2e-Pass-1', stored)).toBe(true)
    expect(await verifyPassword('E2e-Pass-2', stored)).toBe(false)
    expect(await verifyPassword('', stored)).toBe(false)
  })

  it('refuse une fiche absente ou illisible', async () => {
    expect(await verifyPassword('x', null)).toBe(false)
    expect(await verifyPassword('x', {})).toBe(false)
    expect(await verifyPassword('x', { algo: PASSWORD_ALGO, salt: 'zz', hash: 'zz' })).toBe(false)
  })

  it('signale l’absence de WebCrypto au lieu de simuler un échec', async () => {
    const original = globalThis.crypto
    vi.stubGlobal('crypto', { getRandomValues: original.getRandomValues.bind(original) })
    try {
      expect(isPasswordHashingAvailable()).toBe(false)
      await expect(hashPassword('x')).rejects.toThrow(PASSWORD_UNAVAILABLE_MESSAGE)
    } finally {
      vi.stubGlobal('crypto', original)
    }
  })
})
