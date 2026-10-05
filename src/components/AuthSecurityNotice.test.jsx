import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AuthSecurityNotice from './AuthSecurityNotice.jsx'
import { PASSWORD_UNAVAILABLE_MESSAGE } from '../lib/password.js'

afterEach(cleanup)

describe('AuthSecurityNotice', () => {
  it('reste absent quand WebCrypto est disponible', () => {
    render(<AuthSecurityNotice />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('explique l’obstacle avant toute tentative quand WebCrypto manque', () => {
    const original = globalThis.crypto
    vi.stubGlobal('crypto', { getRandomValues: original.getRandomValues.bind(original) })
    try {
      render(<AuthSecurityNotice />)
      expect(screen.getByRole('alert')).toHaveTextContent(PASSWORD_UNAVAILABLE_MESSAGE)
    } finally {
      vi.stubGlobal('crypto', original)
    }
  })
})
