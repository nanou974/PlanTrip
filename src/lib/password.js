/**
 * Dérivation du mot de passe pour la base locale (WebCrypto, PBKDF2-SHA256).
 *
 * Portée : empêcher qu'un dump de `localStorage` lise les mots de passe en clair.
 * Ce n'est PAS une authentification sécurisée — sans serveur, qui contrôle
 * l'appareil contrôle aussi la base locale (voir DEVBOOK.md § Authentification :
 * Magic Link et vérification côté serveur restent à mettre en place côté backend).
 */

export const PASSWORD_ALGO = 'PBKDF2-SHA256'
export const PASSWORD_ITERATIONS = 210_000

export const PASSWORD_UNAVAILABLE_MESSAGE =
  "Authentification indisponible : WebCrypto (crypto.subtle) est requis. Ouvrez l'application en HTTPS ou sur localhost."

const SALT_BYTES = 16
const KEY_BITS = 256
const encoder = new TextEncoder()

export function isPasswordHashingAvailable() {
  return typeof globalThis.crypto?.subtle?.deriveBits === 'function'
}

function subtle() {
  if (!isPasswordHashingAvailable()) throw new Error(PASSWORD_UNAVAILABLE_MESSAGE)
  return globalThis.crypto.subtle
}

function toHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(str) {
  const out = new Uint8Array(str.length / 2)
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(str.slice(i * 2, i * 2 + 2), 16)
  return out
}

function randomSalt() {
  const bytes = new Uint8Array(SALT_BYTES)
  globalThis.crypto.getRandomValues(bytes)
  return toHex(bytes)
}

function equalConstantTime(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Hache un mot de passe ; renvoie la fiche stockée (algo, iterations, salt, hash). */
export async function hashPassword(password, { salt = randomSalt(), iterations = PASSWORD_ITERATIONS } = {}) {
  const subtleCrypto = subtle()
  const key = await subtleCrypto.importKey('raw', encoder.encode(String(password)), 'PBKDF2', false, ['deriveBits'])
  const bits = await subtleCrypto.deriveBits({ name: 'PBKDF2', salt: fromHex(salt), iterations, hash: 'SHA-256' }, key, KEY_BITS)
  return { algo: PASSWORD_ALGO, iterations, salt, hash: toHex(new Uint8Array(bits)) }
}

/** Vérifie un mot de passe contre une fiche hachée (fausse si la fiche est illisible). */
export async function verifyPassword(password, stored) {
  if (!stored || typeof stored.salt !== 'string' || typeof stored.hash !== 'string') return false
  const candidate = await hashPassword(password, { salt: stored.salt, iterations: stored.iterations || PASSWORD_ITERATIONS })
  return equalConstantTime(candidate.hash, stored.hash)
}
