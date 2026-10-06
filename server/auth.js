import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_BYTES = 32
const SALT_BYTES = 16

export const PASSWORD_MIN_LENGTH = 8

/** Hache un mot de passe avec scrypt (côté serveur). Fiche { algo, salt, hash, params }. */
export async function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES)
  const derived = await scryptAsync(String(password), salt, KEY_BYTES, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })
  return {
    algo: 'scrypt',
    salt: salt.toString('hex'),
    hash: derived.toString('hex'),
    params: { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P },
  }
}

/** Vérifie un mot de passe contre une fiche scrypt du serveur. */
export async function verifyPassword(password, record) {
  if (!record || record.algo !== 'scrypt' || !record.salt || !record.hash) return false
  const params = record.params || {}
  const derived = await scryptAsync(String(password), Buffer.from(record.salt, 'hex'), Buffer.from(record.hash, 'hex').length, {
    N: params.N || SCRYPT_N,
    r: params.r || SCRYPT_R,
    p: params.p || SCRYPT_P,
  })
  const expected = Buffer.from(record.hash, 'hex')
  return derived.length === expected.length && timingSafeEqual(derived, expected)
}

export function sha256Hex(value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

/**
 * Vérifie deux empreintes hex en temps constant : deux hachages SHA-256 ont
 * toujours la même longueur, ce qui rend `timingSafeEqual` sûr ici.
 */
export function equalHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length || a.length % 2 !== 0) return false
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch {
    return false
  }
}

/**
 * Coût scrypt identique à `verifyPassword` mais sans résultat exploitable :
 * appelé quand le compte n'existe pas, pour que le temps de réponse ne trahisse
 * pas l'existence d'un compte (anti-énumération).
 */
export async function dummyVerifyPassword(password) {
  const salt = Buffer.alloc(SALT_BYTES, 9)
  await scryptAsync(String(password), salt, KEY_BYTES, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('hex')
}

/** Code de connexion à 6 chiffres. */
export function randomCode() {
  const n = randomBytes(4).readUInt32BE(0) % 1_000_000
  return String(n).padStart(6, '0')
}

export function isExpired(row, now = Date.now()) {
  return !row || row.expires_at < now
}

/**
 * Limiteur en mémoire : fenêtre glissante simple.
 * `hit(key)` enregistre une fréquence et renvoie false si la limite est dépassée.
 * Les clés dont toutes les occurrences ont expiré sont purgées (mémoire bornée).
 */
export function createRateLimiter({ max, windowMs }) {
  const hits = new Map()
  let lastSweep = 0
  function sweep(now) {
    if (now - lastSweep < windowMs) return
    lastSweep = now
    for (const [key, list] of hits) {
      if (!list.some((t) => now - t < windowMs)) hits.delete(key)
    }
  }
  return {
    hit(key) {
      const now = Date.now()
      sweep(now)
      const list = (hits.get(key) || []).filter((t) => now - t < windowMs)
      if (list.length >= max) {
        hits.set(key, list)
        return false
      }
      list.push(now)
      hits.set(key, list)
      return true
    },
    /** Annule l'ultimo hit (ex. : l'envoi a échoué, on ne pénalise pas l'utilisateur). */
    release(key) {
      const list = hits.get(key)
      if (list && list.length) {
        list.pop()
        if (!list.length) hits.delete(key)
        else hits.set(key, list)
      }
    },
    reset(key) {
      hits.delete(key)
    },
  }
}
