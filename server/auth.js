import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_BYTES = 32
const SALT_BYTES = 16

export const PASSWORD_MIN_LENGTH = 6

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
 * `hits(key)` enregistre une fréquente et renvoie false si la limite est dépassée.
 */
export function createRateLimiter({ max, windowMs }) {
  const hits = new Map()
  return {
    hit(key) {
      const now = Date.now()
      const list = (hits.get(key) || []).filter((t) => now - t < windowMs)
      if (list.length >= max) {
        hits.set(key, list)
        return false
      }
      list.push(now)
      hits.set(key, list)
      return true
    },
    reset(key) {
      hits.delete(key)
    },
  }
}
