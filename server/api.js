import { randomUUID } from 'node:crypto'
import {
  createRateLimiter,
  hashPassword,
  isExpired,
  randomCode,
  randomToken,
  sha256Hex,
  verifyPassword,
  PASSWORD_MIN_LENGTH,
} from './auth.js'
import { normalizeEmail, publicUser } from './db.js'
import { sendMagicEmail } from './mailer.js'

export const SESSION_COOKIE = 'pt_session'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  })
  res.end(body)
}

function fail(res, status, code, message) {
  sendJson(res, status, { error: { code, message } })
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > 64 * 1024) {
        reject(new Error('body_too_large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new Error('invalid_json'))
      }
    })
    req.on('error', reject)
  })
}

function cookiesOf(req) {
  const out = {}
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

function baseUrlOf(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim()
  return `${proto}://${req.headers.host || 'localhost'}`
}

export function createApiHandler({ store, config }) {
  // Limites volontairement généreuses : les e2e créent des comptes horodatés.
  const magicRequestLimiter = createRateLimiter({ max: 1, windowMs: 15_000 })
  const magicVerifyLimiter = createRateLimiter({ max: 5, windowMs: 10 * 60_000 })
  const loginLimiter = createRateLimiter({ max: 10, windowMs: 5 * 60_000 })

  function startSession(res, userId) {
    const token = randomToken()
    store.createSession(sha256Hex(token), userId, config.sessionTtlMs)
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(config.sessionTtlMs / 1000)}`,
    )
    return token
  }

  function currentUser(req) {
    const token = cookiesOf(req)[SESSION_COOKIE]
    if (!token) return null
    return store.resolveSession(sha256Hex(token))
  }

  function ensureMagicUser(email) {
    const existing = store.findUserByEmail(email)
    if (existing) return publicUser(existing)
    return store.createUser({
      id: randomUUID(),
      email,
      name: email.split('@')[0],
      provider: 'magic',
      password: null,
    })
  }

  async function handleRegister(req, res) {
    const body = await readBody(req)
    const email = normalizeEmail(body.email)
    const password = String(body.password || '')
    const name = String(body.name || '').trim() || email.split('@')[0]
    if (!EMAIL_RE.test(email)) return fail(res, 400, 'invalid_email', 'Adresse e-mail invalide')
    if (password.length < PASSWORD_MIN_LENGTH)
      return fail(res, 400, 'weak_password', `Mot de passe : ${PASSWORD_MIN_LENGTH} caractères minimum`)
    if (store.findUserByEmail(email)) return fail(res, 409, 'email_taken', 'Email déjà utilisé')
    const rec = await hashPassword(password)
    const user = store.createUser({ id: randomUUID(), email, name, provider: 'email', password: rec })
    startSession(res, user.id)
    return sendJson(res, 201, { user })
  }

  async function handleLogin(req, res) {
    const body = await readBody(req)
    const email = normalizeEmail(body.email)
    const password = String(body.password || '')
    const user = store.findUserByEmail(email)
    const record = user ? store.passwordRecordOf(user) : null
    const ok = Boolean(record) && (await verifyPassword(password, record))
    if (!ok || !user) {
      if (!loginLimiter.hit(`login:${email}`)) {
        return fail(res, 429, 'too_many_attempts', 'Trop de tentatives : réessayez dans quelques minutes.')
      }
      return fail(res, 401, 'invalid_credentials', 'Email ou mot de passe incorrect')
    }
    loginLimiter.reset(`login:${email}`)
    startSession(res, user.id)
    return sendJson(res, 200, { user: publicUser(user) })
  }

  async function handlePassword(req, res) {
    const user = currentUser(req)
    if (!user) return fail(res, 401, 'no_session', 'Connectez-vous pour changer de mot de passe')
    const body = await readBody(req)
    const current = String(body.currentPassword || '')
    const next = String(body.newPassword || '')
    if (next.length < PASSWORD_MIN_LENGTH)
      return fail(res, 400, 'weak_password', `Nouveau mot de passe : ${PASSWORD_MIN_LENGTH} caractères minimum`)
    const row = store.findUserByEmail(user.email)
    const record = row ? store.passwordRecordOf(row) : null
    if (!record) return fail(res, 403, 'no_password', "Ce compte n'a pas de mot de passe : il passe par un lien magique ou un fournisseur.")
    if (!(await verifyPassword(current, record)))
      return fail(res, 401, 'invalid_password', 'Mot de passe actuel incorrect')
    const rec = await hashPassword(next)
    store.setUserPassword(row.id, rec)
    // Le changement invalide les autres sessions ; la courante est renouvelée.
    store.deleteSessionsOf(row.id)
    startSession(res, row.id)
    return sendJson(res, 200, { user })
  }

  async function handleMagicRequest(req, res) {
    const body = await readBody(req)
    const email = normalizeEmail(body.email)
    if (!EMAIL_RE.test(email)) return fail(res, 400, 'invalid_email', 'Adresse e-mail invalide')
    if (!magicRequestLimiter.hit(`magic:${email}`))
      return fail(res, 429, 'too_soon', 'Un code vient d\'être envoyé : patientez quelques instants.')
    const code = randomCode()
    const token = randomToken()
    store.issueMagic(email, {
      codeHash: sha256Hex(code),
      tokenHash: sha256Hex(token),
      ttlMs: config.magicTtlMs,
    })
    let sent
    try {
      sent = await sendMagicEmail({
        to: email,
        code,
        token,
        baseUrl: baseUrlOf(req),
        ttlMinutes: Math.round(config.magicTtlMs / 60_000),
        config,
      })
    } catch (err) {
      return fail(res, 500, 'mail_failed', `Envoi impossible : ${err.message}`)
    }
    return sendJson(res, 202, { ok: true, mode: sent.mode, mailbox: sent.path })
  }

  function userAfterMagic(res, row) {
    const user = ensureMagicUser(row.email)
    store.deleteMagic(row.email)
    startSession(res, user.id)
    return user
  }

  async function handleMagicVerify(req, res) {
    const body = await readBody(req)
    const email = normalizeEmail(body.email)
    const code = String(body.code || '').trim()
    if (!EMAIL_RE.test(email)) return fail(res, 400, 'invalid_email', 'Adresse e-mail invalide')
    if (!magicVerifyLimiter.hit(`magicv:${email}`))
      return fail(res, 429, 'too_many_attempts', 'Trop de tentatives : demandez un nouveau code.')
    const row = store.findMagic(email)
    if (!row) return fail(res, 400, 'no_code', 'Aucun code envoyé')
    if (isExpired(row)) {
      store.deleteMagic(email)
      return fail(res, 410, 'expired', 'Code expiré')
    }
    if (row.attempts >= 5) {
      store.deleteMagic(email)
      return fail(res, 429, 'too_many_attempts', 'Trop de tentatives : demandez un nouveau code.')
    }
    if (sha256Hex(code) !== row.code_hash) {
      store.bumpMagicAttempts(email, row.attempts + 1)
      return fail(res, 400, 'wrong_code', 'Code incorrect')
    }
    const user = userAfterMagic(res, row)
    return sendJson(res, 200, { user })
  }

  async function handleMagicOpen(req, res) {
    const body = await readBody(req)
    const token = String(body.token || '').trim()
    if (!/^[a-f0-9]{64}$/i.test(token)) return fail(res, 400, 'invalid_token', 'Lien invalide')
    const row = store.findMagicByToken(sha256Hex(token))
    if (!row) return fail(res, 400, 'no_token', 'Lien invalide ou déjà utilisé')
    if (isExpired(row)) {
      store.deleteMagic(row.email)
      return fail(res, 410, 'expired', 'Lien expiré')
    }
    const user = userAfterMagic(res, row)
    return sendJson(res, 200, { user })
  }

  async function route(req, res) {
    const url = new URL(req.url, 'http://localhost')
    const path = url.pathname
    if (path === '/api/health') return sendJson(res, 200, { ok: true })
    if (req.method === 'GET' && path === '/api/auth/me') {
      const user = currentUser(req)
      if (!user) return fail(res, 401, 'no_session', 'Non connecté')
      return sendJson(res, 200, { user })
    }
    if (req.method === 'POST' && path === '/api/auth/register') return handleRegister(req, res)
    if (req.method === 'POST' && path === '/api/auth/login') return handleLogin(req, res)
    if (req.method === 'POST' && path === '/api/auth/password') return handlePassword(req, res)
    if (req.method === 'POST' && path === '/api/auth/magic-link') return handleMagicRequest(req, res)
    if (req.method === 'POST' && path === '/api/auth/magic-link/verify') return handleMagicVerify(req, res)
    if (req.method === 'POST' && path === '/api/auth/magic-link/open') return handleMagicOpen(req, res)
    if (req.method === 'POST' && path === '/api/auth/logout') {
      const token = cookiesOf(req)[SESSION_COOKIE]
      if (token) store.deleteSession(sha256Hex(token))
      res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
      res.writeHead(204, { 'X-Content-Type-Options': 'nosniff' })
      return res.end()
    }
    return false
  }

  return async function handleApi(req, res) {
    if (!req.url.startsWith('/api/')) return false
    try {
      const handled = await route(req, res)
      if (handled === false) {
        fail(res, 404, 'not_found', 'Route API inconnue')
      }
      return true
    } catch (err) {
      const status = err.message === 'invalid_json' ? 400 : err.message === 'body_too_large' ? 413 : 500
      const code = status === 400 ? 'invalid_json' : status === 413 ? 'body_too_large' : 'internal'
      const message = status === 500 ? 'Erreur serveur' : 'Corps de requête invalide'
      if (!res.headersSent) fail(res, status, code, message)
      else res.end()
      return true
    }
  }
}
