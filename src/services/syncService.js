/**
 * Synchronisation des voyages entre appareils — le stockage local reste la référence.
 *
 * Deux identités possibles, jamais mélangées :
 *  - un compte (session serveur) : les voyages suivent la personne ;
 *  - un « espace » anonyme (identifiant + clé secrète gardés sur l'appareil) : repris sur un autre appareil par
 *    un lien de reprise dont la clé est dans le fragment (`#`), donc jamais envoyée au serveur par le navigateur.
 *
 * Fusion : la modification la plus récente de chaque voyage l'emporte ; les suppressions voyagent aussi.
 */

import { useSyncExternalStore } from 'react'
import { api, apiEnabled, isApiError, isUnreachable } from '../lib/api.js'
import { KEYS, createPersistentStore } from '../lib/storage.js'
import { applyRemoteTrips, forgetTombstones, getStoredTrips, getTombstones } from '../state/store.js'

const SPACE_RE = /^[a-f0-9]{32}$/
const KEY_RE = /^[a-f0-9]{64}$/

const spaceStore = createPersistentStore(KEYS.space, null)
const metaStore = createPersistentStore(KEYS.syncMeta, { lastSyncAt: 0, lastOkAt: 0, optOut: false })

let runtime = { syncing: false, error: '' }
let snapshot = buildSnapshot()
const listeners = new Set()

function currentSpace() {
  const s = spaceStore.get()
  return s && SPACE_RE.test(String(s.id)) && KEY_RE.test(String(s.key)) ? s : null
}

function buildSnapshot() {
  const meta = metaStore.get() || {}
  return {
    hasSpace: Boolean(currentSpace()),
    optOut: Boolean(meta.optOut),
    lastOkAt: Number(meta.lastOkAt) || 0,
    syncing: runtime.syncing,
    error: runtime.error,
  }
}

function refresh() {
  snapshot = buildSnapshot()
  listeners.forEach((fn) => fn())
}

spaceStore.subscribe(refresh)
metaStore.subscribe(refresh)

function setRuntime(patch) {
  runtime = { ...runtime, ...patch }
  refresh()
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

const getSnapshot = () => snapshot

/** Mode de synchronisation : 'account' | 'space' | 'off'. */
export function syncModeOf(user, snap = snapshot) {
  if (user?.serverSession) return snap.optOut ? 'off' : 'account'
  return snap.hasSpace ? 'space' : 'off'
}

/** État de synchronisation pour l'interface. */
export function useSyncStatus(user) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return { ...snap, mode: syncModeOf(user, snap) }
}

function identityHeaders(user) {
  const space = currentSpace()
  return !user?.serverSession && space ? { 'X-PlanTrip-Space': `${space.id}.${space.key}` } : undefined
}

const FRIENDLY = {
  quota_exceeded: 'Limite de voyages synchronisés atteinte : supprimez-en pour continuer.',
  trip_too_large: 'Un voyage est trop volumineux pour être synchronisé.',
  too_many_requests: 'Trop de synchronisations : nouvelle tentative dans quelques minutes.',
}

let inFlight = null
let again = false

/**
 * Envoie les modifications locales et reçoit celles des autres appareils.
 * @param {{user?:object|null, full?:boolean}} [opts] `full` : renvoie tous les voyages (activation, reprise).
 * @returns {Promise<{ok:boolean, reason?:string}>}
 */
export function runSync(opts = {}) {
  if (inFlight) {
    again = true
    return inFlight
  }
  inFlight = doSync(opts).finally(() => {
    inFlight = null
    if (again) {
      again = false
      runSync(opts)
    }
  })
  return inFlight
}

async function doSync({ user = null, full = false } = {}) {
  if (!apiEnabled()) return { ok: false, reason: 'disabled' }
  const mode = syncModeOf(user)
  if (mode === 'off') return { ok: false, reason: 'off' }
  const startedAt = Date.now()
  const since = full ? 0 : Number(metaStore.get()?.lastSyncAt) || 0
  const trips = getStoredTrips()
    .map((t) => ({ id: t.id, updatedAt: Date.parse(t.updatedAt) || 1, data: t }))
    .filter((t) => t.updatedAt > since)
  const tombstones = Object.entries(getTombstones()).map(([id, updatedAt]) => ({ id, updatedAt, deleted: true }))
  setRuntime({ syncing: true, error: '' })
  try {
    const res = await api('/sync', {
      method: 'POST',
      body: { trips: [...trips, ...tombstones] },
      headers: identityHeaders(user),
      timeoutMs: 20_000,
    })
    // Les voyages du serveur d'abord (une suppression ici plus récente reste prioritaire), puis on oublie
    // les suppressions : le serveur les a, ou connaît une version plus récente qu'on vient de recevoir.
    applyRemoteTrips(res.trips)
    forgetTombstones(tombstones.map((t) => t.id))
    metaStore.set({ ...(metaStore.get() || {}), lastSyncAt: startedAt, lastOkAt: Date.now() })
    setRuntime({ syncing: false })
    return { ok: true }
  } catch (err) {
    if (isUnreachable(err)) {
      setRuntime({ syncing: false })
      return { ok: false, reason: 'offline' }
    }
    if (isApiError(err) && err.status === 401 && mode === 'space') {
      // L'espace n'existe plus côté serveur (supprimé, expiré) : on arrête proprement.
      spaceStore.set(null)
      setRuntime({ syncing: false, error: 'Cet espace de synchronisation n’existe plus : la synchronisation est désactivée.' })
      return { ok: false, reason: 'invalid' }
    }
    const message = FRIENDLY[err?.code] || 'La synchronisation a échoué : nouvelle tentative plus tard.'
    setRuntime({ syncing: false, error: message })
    return { ok: false, reason: 'error' }
  }
}

/** Active la synchronisation : compte → on la réactive ; sinon création d'un espace anonyme. */
export async function enableSync(user) {
  if (user?.serverSession) {
    metaStore.set({ ...(metaStore.get() || {}), optOut: false, lastSyncAt: 0 })
    return runSync({ user, full: true })
  }
  const res = await api('/space', { method: 'POST' })
  spaceStore.set({ id: res.space.id, key: res.space.key, createdAt: Date.now() })
  metaStore.set({ lastSyncAt: 0, lastOkAt: 0, optOut: false })
  return runSync({ user, full: true })
}

/**
 * Désactive la synchronisation et efface les voyages du serveur. Lève une erreur si le serveur est injoignable :
 * rien n'est alors modifié, pour ne pas laisser croire que les données sont effacées.
 */
export async function disableSync(user) {
  const mode = syncModeOf(user)
  if (mode === 'off') return
  try {
    await api('/sync', { method: 'DELETE', headers: identityHeaders(user) })
  } catch (err) {
    // Un espace déjà inexistant côté serveur équivaut à des données effacées.
    if (!(isApiError(err) && err.status === 401 && mode === 'space')) throw err
  }
  if (mode === 'space') spaceStore.set(null)
  else metaStore.set({ ...(metaStore.get() || {}), optOut: true })
  metaStore.set({ ...(metaStore.get() || {}), lastSyncAt: 0, lastOkAt: 0 })
  setRuntime({ error: '' })
}

/** À la connexion : l'espace anonyme de l'appareil est fusionné dans le compte. */
export async function adoptSpaceIfNeeded(user) {
  const space = currentSpace()
  if (!user?.serverSession || !space || !apiEnabled()) return { ok: false, reason: 'nothing' }
  try {
    const res = await api('/sync/adopt', {
      method: 'POST',
      headers: { 'X-PlanTrip-Space': `${space.id}.${space.key}` },
    })
    applyRemoteTrips(res.trips)
    spaceStore.set(null)
    metaStore.set({ ...(metaStore.get() || {}), lastSyncAt: 0, optOut: false })
    return runSync({ user, full: true })
  } catch (err) {
    if (isUnreachable(err)) return { ok: false, reason: 'offline' }
    if (isApiError(err) && (err.status === 404 || err.status === 401)) {
      if (err.status === 404) spaceStore.set(null)
      return { ok: false, reason: 'invalid' }
    }
    return { ok: false, reason: 'error' }
  }
}

/* ————————————————————————————————————————————————
   Reprise sur un autre appareil
   ———————————————————————————————————————————————— */

export function resumeUrl() {
  const space = currentSpace()
  return space ? `${window.location.origin}/reprendre#${space.id}.${space.key}` : ''
}

/** Lit `#id.clé` ; renvoie null si le format est faux. */
export function parseResumeHash(hash) {
  const m = /^#?([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(String(hash || '').trim())
  return m ? { id: m[1], key: m[2] } : null
}

/** Rattache cet appareil à l'espace d'un autre appareil et fusionne les voyages. */
export async function resumeFromLink({ id, key }) {
  if (!SPACE_RE.test(String(id)) || !KEY_RE.test(String(key))) return { ok: false, reason: 'invalid' }
  const previous = spaceStore.get()
  spaceStore.set({ id, key, createdAt: Date.now() })
  metaStore.set({ lastSyncAt: 0, lastOkAt: 0, optOut: false })
  const result = await runSync({ user: null, full: true })
  if (!result.ok) {
    spaceStore.set(previous && SPACE_RE.test(String(previous.id)) ? previous : null)
    return result
  }
  return result
}

/* ————————————————————————————————————————————————
   Partage en lecture seule
   ———————————————————————————————————————————————— */

export function shareUrl(token) {
  return `${window.location.origin}/partage/${token}`
}

/** Crée (ou met à jour) le lien de partage d'un voyage. Le voyage est d'abord synchronisé. */
export async function createShare(user, tripId, { showDeparture = false } = {}) {
  const synced = await runSync({ user })
  if (!synced.ok && synced.reason !== 'offline') throw new Error('Synchronisation impossible : réessayez dans un instant.')
  const res = await api('/shares', {
    method: 'POST',
    body: { tripId, showDeparture },
    headers: identityHeaders(user),
  })
  return res.share
}

export async function listShares(user) {
  const res = await api('/shares', { headers: identityHeaders(user) })
  return res.shares || []
}

export async function revokeShare(user, token) {
  await api(`/shares/${token}`, { method: 'DELETE', headers: identityHeaders(user) })
}

/** Réservé aux tests : remet le module dans son état initial. */
export function __resetSyncForTests() {
  spaceStore.set(null)
  metaStore.set({ lastSyncAt: 0, lastOkAt: 0, optOut: false })
  runtime = { syncing: false, error: '' }
  inFlight = null
  again = false
  refresh()
}
