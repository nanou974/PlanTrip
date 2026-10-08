/**
 * Persistance locale — primitives KV, versionnées et résilientes.
 *
 * Règles :
 *  - tout est enveloppé (`{ v, savedAt, data }`) pour migrer sans casser,
 *  - lecture tolérante : JSON corrompu → valeur par défaut, jamais de crash,
 *  - écriture protégée : quota plein / navigation privée → mémoire + `isPersisted() === false`,
 *  - stores abonnables, consommables via `useSyncExternalStore`.
 *
 * La couche métier (voyages, préférences, favoris) vit dans `src/state/store.js`.
 */

export const NS = 'plantrip'

export const KEYS = {
  current: `${NS}.current.v1`,
  trips: `${NS}.trips.v1`,
  library: `${NS}.library.v1`,
  memory: `${NS}.memory.v1`,
  prefs: `${NS}.prefs.v1`,
  /** Espace de synchronisation anonyme de cet appareil : { id, key }. */
  space: `${NS}.space.v1`,
  /** Suivi de la synchronisation : { lastSyncAt, lastOkAt, optOut }. */
  syncMeta: `${NS}.syncmeta.v1`,
  /** Voyages supprimés ici et pas encore signalés au serveur : { [id]: horodatage }. */
  tombstones: `${NS}.tombstones.v1`,
}

export const SCHEMA_VERSION = 1

const memoryFallback = new Map()
let lastWriteFailed = false

export function storageAvailable() {
  try {
    const k = `${NS}.probe`
    window.localStorage.setItem(k, '1')
    window.localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

export function isPersisted() {
  return !lastWriteFailed
}

function envelope(data) {
  return { v: SCHEMA_VERSION, savedAt: new Date().toISOString(), data }
}

function unwrap(raw, fallback) {
  if (raw == null) return fallback
  let parsed
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return fallback
  }
  if (parsed && typeof parsed === 'object' && 'data' in parsed && 'v' in parsed) {
    if (parsed.v > SCHEMA_VERSION) return fallback
    return parsed.data ?? fallback
  }
  return parsed ?? fallback
}

export function readKey(key, fallback = null) {
  let raw = null
  try {
    raw = window.localStorage.getItem(key)
  } catch {
    raw = null
  }
  if (raw == null) return memoryFallback.has(key) ? memoryFallback.get(key) : fallback
  return unwrap(raw, fallback)
}

export function writeKey(key, value) {
  memoryFallback.set(key, value)
  try {
    window.localStorage.setItem(key, JSON.stringify(envelope(value)))
    lastWriteFailed = false
    return true
  } catch {
    lastWriteFailed = true
    return false
  }
}

export function removeKey(key) {
  memoryFallback.delete(key)
  try {
    window.localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

/**
 * Store persistant générique, prêt pour `useSyncExternalStore`.
 * @returns {{get:()=>any,set:(next:any|((prev:any)=>any))=>void,subscribe:(fn:()=>void)=>()=>void}}
 */
export function createPersistentStore(key, initial) {
  let state = readKey(key, initial)
  const listeners = new Set()

  const emit = () => listeners.forEach((fn) => fn())

  return {
    get: () => state,
    set(next) {
      const value = typeof next === 'function' ? next(state) : next
      if (Object.is(value, state)) return
      state = value
      writeKey(key, state)
      emit()
    },
    /** Resynchronise l'état en mémoire depuis le disque (autre onglet, écriture externe). */
    reload() {
      const fresh = readKey(key, initial)
      if (!Object.is(fresh, state)) {
        state = fresh
        emit()
      }
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}
