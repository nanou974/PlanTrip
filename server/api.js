import { randomUUID } from 'node:crypto'
import {
  createRateLimiter,
  dummyVerifyPassword,
  equalHex,
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
const CODE_RE = /^\d{6}$/
const HOST_RE = /^[a-zA-Z0-9.\-[\]:]+$/
const LOOPBACK_RE = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/

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

function isHttps(req) {
  const fwd = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim()
  return fwd === 'https' || req.socket?.encrypted === true
}

/**
 * Origine des liens magiques. `PUBLIC_URL` fait foi (recommandé en production,
 * et seul moyen de maîtriser l'origine derrière un reverse proxy) ; sinon on
 * dérive de la requête, en n'acceptant que http(s) et un Host plausible — un
 * avertissement signale l'origine non maîtrisée.
 */
function baseUrlOf(req, config) {
  if (config.publicUrl) return config.publicUrl
  const fwd = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim()
  const proto = fwd === 'https' || fwd === 'http' ? fwd : isHttps(req) ? 'https' : 'http'
  const host = String(req.headers.host || 'localhost')
  if (!HOST_RE.test(host)) return 'http://localhost'
  if (!LOOPBACK_RE.test(host)) {
    console.warn(
      `[plantrip-server] PUBLIC_URL absent : lien magique construit depuis l'en-tête Host (${host}). ` +
        'Définissez PUBLIC_URL pour maîtriser l’origine des liens de connexion.',
    )
  }
  return `${proto}://${host}`
}

function clientIp(req, config) {
  if (config.trustProxy) {
    const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    if (fwd) return fwd
  }
  return req.socket?.remoteAddress || 'inconnu'
}

function cookieAttributes(req) {
  return `Path=/; HttpOnly; SameSite=Lax${isHttps(req) ? '; Secure' : ''}`
}

export function createApiHandler({ store, config }) {
  // Limites volontairement généreuses : les e2e créent des comptes horodatés.
  const magicRequestLimiter = createRateLimiter({ max: 1, windowMs: 15_000 })
  const magicVerifyLimiter = createRateLimiter({ max: 5, windowMs: 10 * 60_000 })
  const loginLimiter = createRateLimiter({ max: 10, windowMs: 5 * 60_000 })
  // Par adresse : un pisteur ne peut pas faire tourner les limites par email.
  const magicIpLimiter = createRateLimiter({ max: 15, windowMs: 10 * 60_000 })
  const loginIpLimiter = createRateLimiter({ max: 40, windowMs: 5 * 60_000 })

  function startSession(req, res, userId) {
    const token = randomToken()
    store.createSession(sha256Hex(token), userId, config.sessionTtlMs)
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=${token}; ${cookieAttributes(req)}; Max-Age=${Math.floor(config.sessionTtlMs / 1000)}`,
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
    let user
    try {
      user = store.createUser({ id: randomUUID(), email, name, provider: 'email', password: rec })
    } catch (err) {
      // Course possible entre la vérification et l'insertion (contrainte UNIQUE).
      if (/UNIQUE|CONSTRAINT/i.test(String(err?.message || err))) {
        return fail(res, 409, 'email_taken', 'Email déjà utilisé')
      }
      throw err
    }
    startSession(req, res, user.id)
    return sendJson(res, 201, { user })
  }

  async function handleLogin(req, res) {
    const body = await readBody(req)
    const email = normalizeEmail(body.email)
    const password = String(body.password || '')
    const ipKey = `login-ip:${clientIp(req, config)}`
    if (!loginIpLimiter.hit(ipKey)) {
      return fail(res, 429, 'too_many_attempts', 'Trop de tentatives : réessayez dans quelques minutes.')
    }
    const user = store.findUserByEmail(email)
    const record = user ? store.passwordRecordOf(user) : null
    let ok = false
    if (record) ok = await verifyPassword(password, record)
    else await dummyVerifyPassword(password)
    if (!ok || !user) {
      if (!loginLimiter.hit(`login:${email}`)) {
        return fail(res, 429, 'too_many_attempts', 'Trop de tentatives : réessayez dans quelques minutes.')
      }
      return fail(res, 401, 'invalid_credentials', 'Email ou mot de passe incorrect')
    }
    loginLimiter.reset(`login:${email}`)
    startSession(req, res, user.id)
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
    startSession(req, res, row.id)
    return sendJson(res, 200, { user })
  }

  async function handleProfile(req, res) {
    const user = currentUser(req)
    if (!user) return fail(res, 401, 'no_session', 'Connectez-vous pour modifier votre profil')
    const body = await readBody(req)
    const name = String(body.name ?? '').trim()
    if (!name || name.length > 80) return fail(res, 400, 'invalid_name', 'Nom affiché : 1 à 80 caractères')
    store.setUserName(user.id, name)
    return sendJson(res, 200, { user: { ...publicUser(store.findUserById(user.id)), name } })
  }

  async function handleMagicRequest(req, res) {
    const body = await readBody(req)
    const email = normalizeEmail(body.email)
    if (!EMAIL_RE.test(email)) return fail(res, 400, 'invalid_email', 'Adresse e-mail invalide')
    const emailKey = `magic:${email}`
    const ipKey = `magic-ip:${clientIp(req, config)}`
    if (!magicRequestLimiter.hit(emailKey)) {
      return fail(res, 429, 'too_soon', 'Un code vient d\'être envoyé : patientez quelques instants.')
    }
    if (!magicIpLimiter.hit(ipKey)) {
      magicRequestLimiter.release(emailKey)
      return fail(res, 429, 'too_many_requests', 'Trop de demandes de codes : patientez quelques instants.')
    }
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
        baseUrl: baseUrlOf(req, config),
        ttlMinutes: Math.round(config.magicTtlMs / 60_000),
        config,
      })
    } catch (err) {
      // L'utilisateur n'est pas responsable d'une panne SMTP : on relâche les
      // compteurs et on ne divulgue pas le détail technique.
      magicRequestLimiter.release(emailKey)
      magicIpLimiter.release(ipKey)
      console.error('[plantrip-server] envoi email impossible :', err)
      return fail(res, 500, 'mail_failed', 'Envoi de l’email impossible : réessayez dans un instant.')
    }
    return sendJson(res, 202, { ok: true, mode: sent.mode, mailbox: sent.path })
  }

  function userAfterMagic(req, res, row) {
    const user = ensureMagicUser(row.email)
    store.deleteMagic(row.email)
    startSession(req, res, user.id)
    return user
  }

  async function handleMagicVerify(req, res) {
    const body = await readBody(req)
    const email = normalizeEmail(body.email)
    const code = String(body.code || '').trim()
    if (!EMAIL_RE.test(email)) return fail(res, 400, 'invalid_email', 'Adresse e-mail invalide')
    if (!CODE_RE.test(code)) return fail(res, 400, 'wrong_code', 'Code incorrect')
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
    if (!equalHex(sha256Hex(code), row.code_hash)) {
      store.bumpMagicAttempts(email, row.attempts + 1)
      return fail(res, 400, 'wrong_code', 'Code incorrect')
    }
    const user = userAfterMagic(req, res, row)
    return sendJson(res, 200, { user })
  }

  async function handleMagicOpen(req, res) {
    const body = await readBody(req)
    const token = String(body.token || '').trim().toLowerCase()
    if (!/^[a-f0-9]{64}$/.test(token)) return fail(res, 400, 'invalid_token', 'Lien invalide')
    const row = store.findMagicByToken(sha256Hex(token))
    if (!row) return fail(res, 400, 'no_token', 'Lien invalide ou déjà utilisé')
    if (isExpired(row)) {
      store.deleteMagic(row.email)
      return fail(res, 410, 'expired', 'Lien expiré')
    }
    const user = userAfterMagic(req, res, row)
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
    if (req.method === 'PATCH' && path === '/api/auth/profile') return handleProfile(req, res)
    if (req.method === 'POST' && path === '/api/auth/magic-link') return handleMagicRequest(req, res)
    if (req.method === 'POST' && path === '/api/auth/magic-link/verify') return handleMagicVerify(req, res)
    if (req.method === 'POST' && path === '/api/auth/magic-link/open') return handleMagicOpen(req, res)
    if (req.method === 'POST' && path === '/api/auth/logout') {
      const token = cookiesOf(req)[SESSION_COOKIE]
      if (token) store.deleteSession(sha256Hex(token))
      res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; ${cookieAttributes(req)}; Max-Age=0`)
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
      if (status === 500) console.error('[plantrip-server]', err)
      if (!res.headersSent) fail(res, status, code, message)
      else res.end()
      return true
    }
  }
}
