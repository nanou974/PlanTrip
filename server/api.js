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
import { createRouteService } from './route.js'
import { createLodgingPriceService } from './lodgingPrices.js'
import { createOsmLodgingService } from './osmLodging.js'
import { MAX_SYNC_BODY, MAX_TRIPS, SPACE_IDLE_MS, TOMBSTONE_TTL_MS, sanitizeForShare, validateIncoming } from './sync.js'

export const SESSION_COOKIE = 'pt_session'
export const SPACE_HEADER = 'x-plantrip-space'
const SPACE_RE = /^([a-f0-9]{32})\.([a-f0-9]{64})$/
const SHARE_TOKEN_RE = /^[a-f0-9]{32}$/
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

function readBody(req, maxBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > maxBytes) {
        reject(new Error('body_too_large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      let parsed
      try {
        parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      } catch {
        return reject(new Error('invalid_json'))
      }
      // `null`, un tableau ou un scalaire ne sont pas des corps exploitables.
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return reject(new Error('invalid_json'))
      resolve(parsed)
    })
    req.on('error', reject)
  })
}

function cookiesOf(req) {
  const out = {}
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=')
    if (i <= 0) continue
    try {
      out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
    } catch {
      // Cookie mal encodé : ignoré, comme s'il était absent.
    }
  }
  return out
}

function isHttps(req) {
  const fwd = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim()
  return fwd === 'https' || req.socket?.encrypted === true
}

/**
 * Origine des liens magiques. `PUBLIC_URL` fait foi : c'est la seule origine
 * que le serveur maîtrise. Sans elle, on ne dérive l'origine de la requête
 * que pour la boucle locale (développement, tests) ; ailleurs, l'en-tête Host
 * est contrôlé par l'appelant et permettrait d'envoyer à la victime un lien
 * pointant vers le site d'un attaquant — on renvoie alors `null` (refus).
 */
function baseUrlOf(req, config) {
  if (config.publicUrl) return config.publicUrl
  const host = String(req.headers.host || '')
  if (!HOST_RE.test(host) || !LOOPBACK_RE.test(host)) return null
  const fwd = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim()
  const proto = fwd === 'https' || fwd === 'http' ? fwd : isHttps(req) ? 'https' : 'http'
  return `${proto}://${host}`
}

function clientIp(req, config) {
  if (config.trustProxy) {
    // Derrière Cloudflare : `CF-Connecting-IP` est posé (et écrasé) par Cloudflare, donc non falsifiable ;
    // le premier élément de `X-Forwarded-For` peut, lui, être fourni par le visiteur.
    const cf = String(req.headers['cf-connecting-ip'] || '').trim()
    if (cf) return cf
    const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    if (fwd) return fwd
  }
  return req.socket?.remoteAddress || 'inconnu'
}

/** `Secure` si la requête arrive en HTTPS, ou si l'origine publique configurée est en HTTPS. */
function cookieAttributes(req, config) {
  const secure = isHttps(req) || String(config.publicUrl || '').startsWith('https://')
  return `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`
}

export function createApiHandler({ store, config }) {
  // Limites volontairement généreuses : les e2e créent des comptes horodatés.
  const magicRequestLimiter = createRateLimiter({ max: 1, windowMs: 15_000 })
  const magicVerifyLimiter = createRateLimiter({ max: 5, windowMs: 10 * 60_000 })
  const loginLimiter = createRateLimiter({ max: 10, windowMs: 5 * 60_000 })
  // Par adresse : un pisteur ne peut pas faire tourner les limites par email.
  const magicIpLimiter = createRateLimiter({ max: 15, windowMs: 10 * 60_000 })
  const loginIpLimiter = createRateLimiter({ max: 40, windowMs: 5 * 60_000 })
  // Inscriptions : chaque création coûte un scrypt et une ligne en base.
  const registerIpLimiter = createRateLimiter({ max: 30, windowMs: 10 * 60_000 })
  // Les requêtes d'itinéraire consomment le quota de la clé ORS : limite par adresse.
  const routeIpLimiter = createRateLimiter({ max: 40, windowMs: 10 * 60_000 })
  const routeService = createRouteService({ config, fetchImpl: config.fetchImpl || fetch })
  const priceIpLimiter = createRateLimiter({ max: 60, windowMs: 10 * 60_000 })
  // Hébergements OpenStreetMap : ne compte que les recherches qui doivent interroger Overpass (tuiles absentes du cache).
  const osmIpLimiter = createRateLimiter({ max: 30, windowMs: 10 * 60_000 })
  const priceService = createLodgingPriceService({ config, fetchImpl: config.fetchImpl || fetch })
  const osmService = createOsmLodgingService({ config, fetchImpl: config.fetchImpl || fetch })
  // Espaces anonymes : chaque création est une ligne en base, donc limitée par adresse.
  const spaceIpLimiter = createRateLimiter({ max: 20, windowMs: 10 * 60_000 })
  const syncLimiter = createRateLimiter({ max: 240, windowMs: 10 * 60_000 })
  const shareReadLimiter = createRateLimiter({ max: 240, windowMs: 10 * 60_000 })
  const shareWriteLimiter = createRateLimiter({ max: 60, windowMs: 10 * 60_000 })
  const spaceIdleMs = config.spaceIdleMs || SPACE_IDLE_MS

  /** Ménage opportuniste : espaces inactifs et suppressions anciennes. */
  function purgeStale(now = Date.now()) {
    store.purge({ idleCutoff: now - spaceIdleMs, tombstoneCutoff: now - TOMBSTONE_TTL_MS })
  }
  purgeStale()
  const purgeTimer = setInterval(purgeStale, 6 * 3_600_000)
  purgeTimer.unref?.()

  function startSession(req, res, userId) {
    const token = randomToken()
    store.createSession(sha256Hex(token), userId, config.sessionTtlMs)
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=${token}; ${cookieAttributes(req, config)}; Max-Age=${Math.floor(config.sessionTtlMs / 1000)}`,
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

  /** Espace anonyme présenté par l'appareil (en-tête `id.clé`) ; null si absent ou faux. */
  function currentSpace(req) {
    const m = SPACE_RE.exec(String(req.headers[SPACE_HEADER] || '').trim())
    if (!m) return null
    const space = store.findSpace(m[1])
    if (!space || !equalHex(sha256Hex(m[2]), space.key_hash)) return null
    return space
  }

  /** Propriétaire des voyages : le compte connecté, sinon l'espace anonyme. */
  function ownerOf(req) {
    const user = currentUser(req)
    if (user) return { owner: `u:${user.id}`, kind: 'user', user }
    const space = currentSpace(req)
    if (space) {
      store.touchSpace(space.id)
      return { owner: `s:${space.id}`, kind: 'space', space }
    }
    return null
  }

  function requireOwner(req, res) {
    const who = ownerOf(req)
    if (!who) {
      fail(res, 401, 'no_sync_identity', 'Synchronisation non activée sur cet appareil')
      return null
    }
    if (!syncLimiter.hit(`sync:${who.owner}`)) {
      fail(res, 429, 'too_many_requests', 'Trop de synchronisations : réessayez dans quelques minutes.')
      return null
    }
    return who
  }

  async function handleSpaceCreate(req, res) {
    if (!spaceIpLimiter.hit(`space-ip:${clientIp(req, config)}`)) {
      return fail(res, 429, 'too_many_requests', 'Trop de créations d’espaces : réessayez dans quelques minutes.')
    }
    const id = randomToken(16)
    const key = randomToken(32)
    store.createSpace(id, sha256Hex(key))
    return sendJson(res, 201, { space: { id, key } })
  }

  async function handleSync(req, res) {
    const who = requireOwner(req, res)
    if (!who) return
    const body = await readBody(req, MAX_SYNC_BODY)
    const checked = validateIncoming(body.trips)
    if (!checked.ok) return fail(res, 400, checked.code, checked.message)
    const live = store.countLiveTrips(who.owner)
    let added = 0
    for (const item of checked.items) {
      if (item.deleted) continue
      const known = store.findOwnerTrip(who.owner, item.id)
      if (!known || known.deleted) added += 1
    }
    if (live + added > MAX_TRIPS) {
      return fail(res, 413, 'quota_exceeded', `Limite de ${MAX_TRIPS} voyages synchronisés atteinte.`)
    }
    const results = {}
    for (const item of checked.items) results[item.id] = store.applyTrip(who.owner, item)
    return sendJson(res, 200, { trips: store.listOwnerTrips(who.owner), results, serverTime: Date.now(), kind: who.kind })
  }

  async function handleSyncWipe(req, res) {
    const who = requireOwner(req, res)
    if (!who) return
    if (who.kind === 'space') store.deleteSpaceCompletely(who.space.id)
    else store.wipeOwner(who.owner)
    res.writeHead(204, { 'X-Content-Type-Options': 'nosniff' })
    return res.end()
  }

  /** À la connexion : les voyages de l'espace anonyme de l'appareil passent dans le compte. */
  async function handleAdopt(req, res) {
    const user = currentUser(req)
    if (!user) return fail(res, 401, 'no_session', 'Connectez-vous pour reprendre vos voyages')
    const space = currentSpace(req)
    if (!space) return fail(res, 404, 'no_space', 'Aucun espace à reprendre')
    if (!syncLimiter.hit(`sync:u:${user.id}`)) {
      return fail(res, 429, 'too_many_requests', 'Trop de synchronisations : réessayez dans quelques minutes.')
    }
    store.adoptSpace(space.id, user.id)
    return sendJson(res, 200, { trips: store.listOwnerTrips(`u:${user.id}`), kind: 'user' })
  }

  async function handleShareCreate(req, res) {
    const who = requireOwner(req, res)
    if (!who) return
    if (!shareWriteLimiter.hit(`share-w:${who.owner}`)) {
      return fail(res, 429, 'too_many_requests', 'Trop de partages : réessayez dans quelques minutes.')
    }
    const body = await readBody(req)
    const tripId = String(body.tripId || '')
    const showDeparture = body.showDeparture === true
    const trip = store.findOwnerTrip(who.owner, tripId)
    if (!trip || trip.deleted) {
      return fail(res, 404, 'trip_not_synced', 'Ce voyage n’est pas encore synchronisé : réessayez dans un instant.')
    }
    const existing = store.findShareOfTrip(who.owner, tripId)
    if (existing) {
      if (Boolean(existing.show_departure) !== showDeparture) store.setShareDeparture(existing.token, showDeparture)
      return sendJson(res, 200, { share: { token: existing.token, tripId, showDeparture } })
    }
    const token = randomToken(16)
    store.createShare(token, who.owner, tripId, showDeparture)
    return sendJson(res, 201, { share: { token, tripId, showDeparture } })
  }

  async function handleShareList(req, res) {
    const who = requireOwner(req, res)
    if (!who) return
    return sendJson(res, 200, { shares: store.listOwnerShares(who.owner) })
  }

  async function handleShareDelete(req, res, token) {
    const who = requireOwner(req, res)
    if (!who) return
    const share = SHARE_TOKEN_RE.test(token) ? store.findShare(token) : null
    if (!share || share.owner !== who.owner) return fail(res, 404, 'no_share', 'Lien de partage introuvable')
    store.deleteShare(token)
    res.writeHead(204, { 'X-Content-Type-Options': 'nosniff' })
    return res.end()
  }

  /** Lecture publique : jamais d'identité, jamais de cache, jamais d'indexation. */
  async function handleShared(req, res, token) {
    if (!shareReadLimiter.hit(`share-r:${clientIp(req, config)}`)) {
      return fail(res, 429, 'too_many_requests', 'Trop de consultations : réessayez dans quelques minutes.')
    }
    const share = SHARE_TOKEN_RE.test(token) ? store.findShare(token) : null
    const trip = share ? store.findOwnerTrip(share.owner, share.trip_id) : null
    if (!share || !trip || trip.deleted || !trip.data) {
      return fail(res, 404, 'no_share', 'Ce lien de partage n’existe plus.')
    }
    return sendJson(
      res,
      200,
      { trip: sanitizeForShare(trip.data, { showDeparture: Boolean(share.show_departure) }), updatedAt: trip.updatedAt },
      { 'X-Robots-Tag': 'noindex, nofollow' },
    )
  }

  async function handleRegister(req, res) {
    if (!registerIpLimiter.hit(`register-ip:${clientIp(req, config)}`)) {
      return fail(res, 429, 'too_many_requests', 'Trop de créations de compte : réessayez dans quelques minutes.')
    }
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
    const baseUrl = baseUrlOf(req, config)
    if (!baseUrl) {
      console.error(
        '[plantrip-server] PUBLIC_URL absent : lien magique refusé (l’en-tête Host n’est pas fiable). ' +
          'Définissez PUBLIC_URL, par exemple https://plantrip.fr.',
      )
      return fail(res, 503, 'public_url_required', 'Connexion par lien magique momentanément indisponible.')
    }
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
        baseUrl,
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
    // Le chemin du fichier .eml reste côté serveur : il ne sort jamais en réponse.
    return sendJson(res, 202, { ok: true, mode: sent.mode })
  }

  function userAfterMagic(req, res, row) {
    // La preuve de possession de l'email passe d'abord : elle neutralise un
    // éventuel compte inscrit au nom de cette adresse par un tiers.
    const existing = store.findUserByEmail(row.email)
    if (existing) store.claimUnverifiedAccount(existing.id)
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

  async function handleRoute(req, res) {
    const body = await readBody(req)
    // La limite par adresse ne s'applique qu'aux appels réellement envoyés à ORS (pas aux réponses en cache).
    const ipKey = `route-ip:${clientIp(req, config)}`
    const { status, payload } = await routeService.compute(body, { allowUpstream: () => routeIpLimiter.hit(ipKey) })
    if (status !== 200) return fail(res, status, payload.error, payload.message)
    return sendJson(res, 200, payload)
  }

  async function handleLodgingMap(req, res) {
    const body = await readBody(req, 128 * 1024)
    const ipKey = `osm-ip:${clientIp(req, config)}`
    const { status, payload } = await osmService.compute(body, { allowUpstream: () => osmIpLimiter.hit(ipKey) })
    if (status !== 200) return fail(res, status, payload.error, payload.message)
    res.setHeader('Cache-Control', 'no-store')
    return sendJson(res, 200, payload)
  }
  async function handleLodgingPrices(req, res, url) {
    const ipKey = `price-ip:${clientIp(req, config)}`
    const query = { lat: url.searchParams.get('lat'), lon: url.searchParams.get('lon'), type: url.searchParams.get('type') }
    const { status, payload } = await priceService.compute(query, { allowUpstream: () => priceIpLimiter.hit(ipKey) })
    if (status !== 200) return fail(res, status, payload.error, payload.message)
    return sendJson(res, 200, payload)
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
    if (req.method === 'POST' && path === '/api/route') return handleRoute(req, res)
    if (req.method === 'POST' && path === '/api/space') return handleSpaceCreate(req, res)
    if (req.method === 'POST' && path === '/api/sync') return handleSync(req, res)
    if (req.method === 'DELETE' && path === '/api/sync') return handleSyncWipe(req, res)
    if (req.method === 'POST' && path === '/api/sync/adopt') return handleAdopt(req, res)
    if (req.method === 'POST' && path === '/api/shares') return handleShareCreate(req, res)
    if (req.method === 'GET' && path === '/api/shares') return handleShareList(req, res)
    if (req.method === 'DELETE' && path.startsWith('/api/shares/')) return handleShareDelete(req, res, path.slice('/api/shares/'.length))
    if (req.method === 'GET' && path.startsWith('/api/shared/')) return handleShared(req, res, path.slice('/api/shared/'.length))
    if (req.method === 'GET' && path === '/api/lodging-prices') return handleLodgingPrices(req, res, url)
    if (req.method === 'POST' && path === '/api/lodging-map') return handleLodgingMap(req, res)
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
      res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; ${cookieAttributes(req, config)}; Max-Age=0`)
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
