// @vitest-environment node
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createApp, loadConfig } from './index.js'

let server
let base
let mailboxDir

function mailFiles() {
  return readdirSync(mailboxDir).sort()
}

function lastMail() {
  const files = mailFiles()
  return readFileSync(join(mailboxDir, files[files.length - 1]), 'utf8')
}

async function api(path, { method = 'POST', body, cookie } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const setCookie = res.headers.get('set-cookie') || ''
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  return { status: res.status, data, setCookie }
}

function sessionCookie(setCookie) {
  const m = setCookie.match(/pt_session=([^;]+)/)
  return m ? `pt_session=${m[1]}` : null
}

beforeAll(async () => {
  // Le setup commun neutralise fetch (tests client) : ce fichier parle au vrai serveur.
  vi.unstubAllGlobals()
  mailboxDir = mkdtempSync(join(tmpdir(), 'plantrip-mail-'))
  const config = loadConfig(
    { DATABASE_PATH: ':memory:', MAILBOX_DIR: mailboxDir, MAIL_MODE: 'file' },
    [],
  )
  server = createApp(config)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
})

describe('API auth — comptes et sessions', () => {
  it('crée un compte, ne renvoie jamais les hachages, ouvre une session', async () => {
    const reg = await api('/api/auth/register', {
      body: { email: 'Camille@Exemple.fr', password: 'Secret-123', name: 'Camille' },
    })
    expect(reg.status).toBe(201)
    expect(reg.data.user).toMatchObject({ email: 'camille@exemple.fr', name: 'Camille', provider: 'email' })
    expect(reg.data.user).not.toHaveProperty('hash')
    expect(reg.data.user).not.toHaveProperty('algo')
    expect(reg.data.user).not.toHaveProperty('salt')
    const cookie = sessionCookie(reg.setCookie)
    expect(cookie).toBeTruthy()
    expect(reg.setCookie).toContain('HttpOnly')

    const me = await api('/api/auth/me', { method: 'GET', cookie })
    expect(me.status).toBe(200)
    expect(me.data.user.email).toBe('camille@exemple.fr')

    const dup = await api('/api/auth/register', {
      body: { email: 'camille@exemple.fr', password: 'Autre-456' },
    })
    expect(dup.status).toBe(409)
    expect(dup.data.error.message).toBe('Email déjà utilisé')
  })

  it('valide email et longueur de mot de passe', async () => {
    expect((await api('/api/auth/register', { body: { email: 'pas-un-email', password: '123456' } })).status).toBe(400)
    expect(
      (await api('/api/auth/register', { body: { email: 'ok@exemple.fr', password: 'court' } })).status,
    ).toBe(400)
  })

  it('connecte avec le bon mot de passe et refuse le mauvais, puis déconnecte', async () => {
    await api('/api/auth/register', { body: { email: 'login@exemple.fr', password: 'Secret-123' } })

    const bad = await api('/api/auth/login', { body: { email: 'login@exemple.fr', password: 'faux' } })
    expect(bad.status).toBe(401)
    expect(bad.data.error.message).toBe('Email ou mot de passe incorrect')

    const ok = await api('/api/auth/login', { body: { email: 'login@exemple.fr', password: 'Secret-123' } })
    expect(ok.status).toBe(200)
    const cookie = sessionCookie(ok.setCookie)

    const out = await api('/api/auth/logout', { method: 'POST', cookie })
    expect(out.status).toBe(204)
    const me = await api('/api/auth/me', { method: 'GET', cookie })
    expect(me.status).toBe(401)
  })

  it('change le mot de passe et invalide les anciennes sessions', async () => {
    const reg = await api('/api/auth/register', { body: { email: 'pw@exemple.fr', password: 'Secret-123' } })
    const oldCookie = sessionCookie(reg.setCookie)

    const weak = await api('/api/auth/password', {
      cookie: oldCookie,
      body: { currentPassword: 'Secret-123', newPassword: 'court' },
    })
    expect(weak.status).toBe(400)

    const wrong = await api('/api/auth/password', {
      cookie: oldCookie,
      body: { currentPassword: 'faux', newPassword: 'Nouveau-456' },
    })
    expect(wrong.status).toBe(401)

    const ok = await api('/api/auth/password', {
      cookie: oldCookie,
      body: { currentPassword: 'Secret-123', newPassword: 'Nouveau-456' },
    })
    expect(ok.status).toBe(200)
    const newCookie = sessionCookie(ok.setCookie)
    expect(await api('/api/auth/me', { method: 'GET', cookie: oldCookie }).then((r) => r.status)).toBe(401)
    expect(await api('/api/auth/me', { method: 'GET', cookie: newCookie }).then((r) => r.status)).toBe(200)

    expect((await api('/api/auth/login', { body: { email: 'pw@exemple.fr', password: 'Secret-123' } })).status).toBe(401)
    expect((await api('/api/auth/login', { body: { email: 'pw@exemple.fr', password: 'Nouveau-456' } })).status).toBe(200)
  })
})

describe('API Magic Link — code par email + lien', () => {
  it('émet un code par fichier .eml et connecte par le code', async () => {
    const sent = await api('/api/auth/magic-link', { body: { email: 'magic@exemple.fr' } })
    expect(sent.status).toBe(202)
    expect(sent.data.mode).toBe('file')
    expect(sent.data.mailbox).toMatch(/magic_exemple_fr.*\.eml$/)

    const mail = lastMail()
    expect(mail).toContain('To: magic@exemple.fr')
    const code = mail.match(/code de connexion PlanTrip : (\d{6})/)[1]
    const token = mail.match(/magique=([a-f0-9]{64})/)[1]
    expect(token).toMatch(/^[a-f0-9]{64}$/)

    const bad = await api('/api/auth/magic-link/verify', { body: { email: 'magic@exemple.fr', code: '000000' } })
    expect(bad.status).toBe(400)

    const ok = await api('/api/auth/magic-link/verify', { body: { email: 'magic@exemple.fr', code } })
    expect(ok.status).toBe(200)
    expect(ok.data.user).toMatchObject({ email: 'magic@exemple.fr', provider: 'magic' })
    expect(ok.data.user).not.toHaveProperty('hash')
    const cookie = sessionCookie(ok.setCookie)
    expect((await api('/api/auth/me', { method: 'GET', cookie })).status).toBe(200)

    // Consommé : le code n'est plus réutilisable.
    const again = await api('/api/auth/magic-link/verify', { body: { email: 'magic@exemple.fr', code } })
    expect(again.status).toBe(400)

    // Un compte magique n'a pas de mot de passe à changer.
    const pw = await api('/api/auth/password', {
      cookie,
      body: { currentPassword: 'x', newPassword: 'Nouveau-456' },
    })
    expect(pw.status).toBe(403)
    expect(pw.data.error.message).toMatch(/pas de mot de passe/)
  })

  it('connecte par le lien (jeton) une seule fois', async () => {
    await api('/api/auth/magic-link', { body: { email: 'lien@exemple.fr' } })
    const mail = lastMail()
    const token = mail.match(/magique=([a-f0-9]{64})/)[1]

    const open = await api('/api/auth/magic-link/open', { body: { token } })
    expect(open.status).toBe(200)
    expect(open.data.user.email).toBe('lien@exemple.fr')

    const reuse = await api('/api/auth/magic-link/open', { body: { token } })
    expect(reuse.status).toBe(400)
  })

  it('applique un délai entre deux envois au même email', async () => {
    const first = await api('/api/auth/magic-link', { body: { email: 'cooldown@exemple.fr' } })
    expect(first.status).toBe(202)
    const second = await api('/api/auth/magic-link', { body: { email: 'cooldown@exemple.fr' } })
    expect(second.status).toBe(429)
  })
})

describe('API — garde-fous', () => {
  it('refuse une route inconnue et un corps non JSON', async () => {
    const unknown = await api('/api/auth/inconnu', {})
    expect(unknown.status).toBe(404)
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'pas du json',
    })
    expect(res.status).toBe(400)
  })

  it('signale les échecs de connexion répétés', async () => {
    await api('/api/auth/register', { body: { email: 'brute@exemple.fr', password: 'Secret-123' } })
    let last = 0
    for (let i = 0; i < 11; i++) {
      last = (await api('/api/auth/login', { body: { email: 'brute@exemple.fr', password: 'faux' } })).status
    }
    expect(last).toBe(429)
  })
})
