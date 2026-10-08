/**
 * Magasin applicatif — état persistant + hooks React.
 * Écriture unique : toutes les mutations passent par ce module.
 */

import { useSyncExternalStore, useMemo, useEffect } from 'react'
import {
  KEYS,
  createPersistentStore,
  removeKey,
  isPersisted,
} from '../lib/storage.js'
import { createTrip, deriveTrip } from '../domain/trip.js'

/* ————————————————————————————————————————————————
   Stores
   ———————————————————————————————————————————————— */

const tripsStore = createPersistentStore(KEYS.trips, [])
const currentStore = createPersistentStore(KEYS.current, null)
const libraryStore = createPersistentStore(KEYS.library, [])
const memoryStore = createPersistentStore(KEYS.memory, null)
const prefsStore = createPersistentStore(KEYS.prefs, {})
const tombstonesStore = createPersistentStore(KEYS.tombstones, {})

export const DEFAULT_PREFS = {
  theme: 'system',
  units: 'metric',
  showPricesWithCents: false,
  lastVehicleSlug: null,
  onboarded: false,
}

/* ————————————————————————————————————————————————
   Hooks
   ———————————————————————————————————————————————— */

function useStore(store) {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}

export function useTrips() {
  const raw = useStore(tripsStore)
  return useMemo(() => safeMap(raw), [raw])
}

export function useTrip(id) {
  const trips = useTrips()
  return useMemo(() => trips.find((t) => t.id === id) || null, [trips, id])
}

export function useCurrentTrip() {
  const raw = useStore(currentStore)
  return useMemo(() => {
    if (!raw || typeof raw !== 'object') return null
    return raw
  }, [raw])
}

export function useLibrary() {
  const raw = useStore(libraryStore)
  return useMemo(() => (Array.isArray(raw) ? raw : []), [raw])
}

export function useMemory() {
  const raw = useStore(memoryStore)
  return useMemo(() => (raw && typeof raw === 'object' ? raw : {}), [raw])
}

export function usePrefs() {
  const raw = useStore(prefsStore)
  return useMemo(() => ({ ...DEFAULT_PREFS, ...(raw || {}) }), [raw])
}

export function usePersisted() {
  useStore(tripsStore)
  return isPersisted()
}

/** Resynchronise les stores quand un autre onglet écrit les mêmes clés. */
export function useCrossTabSync() {
  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key) return
      if (e.key === KEYS.trips) tripsStore.reload()
      if (e.key === KEYS.current) currentStore.reload()
      if (e.key === KEYS.library) libraryStore.reload()
      if (e.key === KEYS.memory) memoryStore.reload()
      if (e.key === KEYS.prefs) prefsStore.reload()
      if (e.key === KEYS.tombstones) tombstonesStore.reload()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
}

/* ————————————————————————————————————————————————
   Actions — voyages
   ———————————————————————————————————————————————— */

export function getTrips() {
  return safeMap(tripsStore.get())
}

export function getTrip(id) {
  if (!id) return getCurrentTrip()
  return getTrips().find((t) => t.id === id) || null
}

export function upsertTrip(trip) {
  if (!trip?.id) return getTrips()
  const list = tripsStore.get()
  const idx = list.findIndex((t) => t.id === trip.id)
  const next = { ...trip, updatedAt: new Date().toISOString() }
  const copy = [...list]
  if (idx >= 0) copy[idx] = next
  else copy.push(next)
  tripsStore.set(copy)
  return safeMap(copy)
}

export function deleteTrip(id) {
  recordDeletion([id])
  const next = tripsStore.get().filter((t) => t.id !== id)
  tripsStore.set(next)
  if (currentStore.get()?.id === id) currentStore.set(null)
  return safeMap(next)
}

export function clearTrips() {
  recordDeletion(tripIdsOf(tripsStore.get()))
  tripsStore.set([])
  currentStore.set(null)
  return []
}

/* ————————————————————————————————————————————————
   Synchronisation — suppressions et voyages reçus
   ———————————————————————————————————————————————— */

function tripIdsOf(list) {
  return (Array.isArray(list) ? list : []).map((t) => t?.id).filter(Boolean)
}

/** Note les voyages supprimés ici : le serveur et les autres appareils doivent l'apprendre. */
function recordDeletion(ids) {
  if (!ids.length) return
  const now = Date.now()
  const next = { ...(tombstonesStore.get() || {}) }
  for (const id of ids) next[id] = now
  tombstonesStore.set(next)
}

/** Voyages tels qu'enregistrés (sans dérivation), pour l'envoi au serveur. */
export function getStoredTrips() {
  const list = tripsStore.get()
  return Array.isArray(list) ? list.filter((t) => t && typeof t === 'object' && t.id) : []
}

export function getTombstones() {
  const t = tombstonesStore.get()
  return t && typeof t === 'object' ? { ...t } : {}
}

export function forgetTombstones(ids) {
  const next = { ...getTombstones() }
  let changed = false
  for (const id of ids) {
    if (id in next) {
      delete next[id]
      changed = true
    }
  }
  if (changed) tombstonesStore.set(next)
}

/** Appelle `fn` à chaque changement de la liste des voyages ; renvoie la fonction de désabonnement. */
export function subscribeTrips(fn) {
  return tripsStore.subscribe(fn)
}

function looksLikeTrip(data) {
  return Boolean(data) && typeof data === 'object' && data.dates && typeof data.dates === 'object' && data.departure && data.destination
}

/**
 * Intègre les voyages renvoyés par le serveur : la modification la plus récente l'emporte, une suppression
 * plus récente efface le voyage ici, un voyage supprimé ici plus récemment n'est pas ressuscité.
 * @param {Array<{id:string, updatedAt:number, deleted:boolean, data:object|null}>} items
 * @returns {boolean} vrai si la liste locale a changé
 */
export function applyRemoteTrips(items) {
  const list = [...getStoredTrips()]
  const tomb = getTombstones()
  let changed = false
  let removedCurrent = false
  for (const item of Array.isArray(items) ? items : []) {
    if (!item?.id || !Number.isFinite(Number(item.updatedAt))) continue
    const idx = list.findIndex((t) => t.id === item.id)
    const localTs = idx >= 0 ? Date.parse(list[idx].updatedAt) || 0 : 0
    if (item.deleted) {
      if (idx >= 0 && item.updatedAt > localTs) {
        list.splice(idx, 1)
        if (currentStore.get()?.id === item.id) removedCurrent = true
        changed = true
      }
      continue
    }
    if (!looksLikeTrip(item.data)) continue
    if ((Number(tomb[item.id]) || 0) >= item.updatedAt) continue
    if (idx >= 0 && item.updatedAt <= localTs) continue
    const next = { ...item.data, id: item.id, updatedAt: new Date(item.updatedAt).toISOString() }
    if (idx >= 0) list[idx] = next
    else list.push(next)
    changed = true
  }
  if (changed) tripsStore.set(list)
  if (removedCurrent) currentStore.set(null)
  return changed
}

/* ————————————————————————————————————————————————
   Actions — voyage en cours (brouillon du planificateur)
   ———————————————————————————————————————————————— */

/** Persiste le brouillon ET le promeut en voyage sauvegardé. */
export function saveTrip(draft) {
  if (!draft || typeof draft !== 'object') return null
  const stamped = { ...draft, updatedAt: new Date().toISOString() }
  currentStore.set(stamped)
  try {
    const persisted = draftToTrip(stamped, findMatchingTripId(stamped))
    upsertTrip(persisted)
    const saved = getTrip(persisted.id)
    if (saved) currentStore.set(saved)
    return saved || stamped
  } catch {
    /* le brouillon reste consultable même si la promotion échoue */
    return stamped
  }
}

export function getCurrentTrip() {
  return currentStore.get()
}

export function clearCurrentTrip() {
  currentStore.set(null)
}

export function setCurrentTrip(trip) {
  currentStore.set(trip)
  return trip
}

/* ————————————————————————————————————————————————
   Actions — lieux favoris, mémoire, préférences
   ———————————————————————————————————————————————— */

export function getLibrary() {
  const list = libraryStore.get()
  return Array.isArray(list) ? list : []
}

export function addToLibrary(place) {
  const lib = getLibrary()
  if (!lib.some((p) => p.id === place.id)) {
    libraryStore.set([...lib, place])
  }
  return getLibrary()
}

export function removeFromLibrary(id) {
  const next = getLibrary().filter((p) => p.id !== id)
  libraryStore.set(next)
  return next
}

export function isInLibrary(id) {
  return getLibrary().some((p) => p.id === id)
}

export function getMemory() {
  const mem = memoryStore.get()
  return mem && typeof mem === 'object' ? mem : null
}

export function updateMemory(patch) {
  const next = { ...(getMemory() || {}), ...patch }
  memoryStore.set(next)
  return next
}

export function getPrefs() {
  return { ...DEFAULT_PREFS, ...(prefsStore.get() || {}) }
}

export function setPrefs(patch) {
  const next = { ...getPrefs(), ...patch }
  prefsStore.set(next)
  return next
}

/* ————————————————————————————————————————————————
   Migrations & adaptation
   ———————————————————————————————————————————————— */

function safeMap(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((t) => t && typeof t === 'object' && t.id)
    .map((t) => {
      try {
        return deriveTrip(t)
      } catch {
        return t
      }
    })
}

function findMatchingTripId(draft) {
  const key = draftKey(draft)
  const list = safeMap(tripsStore.get())
  const byShape = list.find((t) => draftKey(t) === key)
  if (byShape) return byShape.id
  const byId = draft.tripId ? list.find((t) => t.id === draft.tripId) : null
  return byId ? byId.id : null
}

function draftKey(draft) {
  return [
    draft?.departure?.name || '',
    draft?.destination?.name || '',
    draft?.dates?.start || '',
    draft?.vehicle?.slug || '',
    // Gabarit : change les ponts et routes autorisés, donc le tracé.
    draft?.vehicle?.heightM || '',
    draft?.vehicle?.weightT || '',
    // Options qui changent le tracé : un ancien itinéraire enregistré ne doit pas survivre à leur modification.
    draft?.preferences?.avoidTolls ? 'T' : '',
    draft?.preferences?.avoidHighways ? 'H' : '',
    (draft?.preferences?.returnTrip ?? draft?.returnTrip) ? 'R' : '',
  ].join('|')
}

/** Adaptateur : brouillon du planificateur → modèle domaine. */
export function draftToTrip(draft, id = null) {
  const p = draft.profile || {}
  const prefs = draft.preferences || {}
  const existing = id ? safeMap(tripsStore.get()).find((t) => t.id === id) : null
  const trip = createTrip({
    id: id || undefined,
    createdAt: draft.createdAt,
    name: draft.name,
    departure: draft.departure,
    destination: draft.destination,
    dates: draft.dates,
    departureTime: draft.departureTime,
    arrivalTime: draft.arrivalTime,
    travelers: draft.travelers,
    vehicleSlug: draft.vehicle?.slug,
    vehicleModel: draft.vehicleModel || '',
    vehicleHeightM: draft.vehicle?.heightM,
    vehicleWeightT: draft.vehicle?.weightT,
    customConsumption: draft.vehicle?.consumption,
    profile: {
      transport: num(p.economies, 0.5),
      sejour: num(p.paysages, 0.5),
      confort: num(p.confort, 0.5),
      nature: num(p.paysages, 0.5),
      decouverte: (num(p.paysages, 0.5) + num(p.confort, 0.5)) / 2,
    },
    motivations: draft.motivations,
    avoidTolls: Boolean(prefs.avoidTolls),
    avoidHighways: Boolean(prefs.avoidHighways),
    driveTime: prefs.driveTime,
    returnTrip: Boolean(prefs.returnTrip),
    budgetMax: typeof draft.budget === 'number' ? draft.budget : draft.budgetMax,
    budget: typeof draft.budget === 'object' && draft.budget ? draft.budget : undefined,
    status: 'ready',
  })

  if (!existing) return trip

  // Édition : on conserve les sections qui ne dépendent pas du planificateur.
  const sameRoute =
    draftKey(draft) === draftKey(existing)
  return {
    ...trip,
    createdAt: existing.createdAt,
    name: draft.name || existing.name,
    status: existing.status === 'draft' ? trip.status : existing.status,
    places: Array.isArray(existing.places) ? existing.places : [],
    itinerary: sameRoute ? { ...trip.itinerary, ...existing.itinerary } : trip.itinerary,
    documents: Array.isArray(existing.documents) ? existing.documents : [],
    checklist: Array.isArray(existing.checklist) ? existing.checklist : [],
    notes: existing.notes || '',
    budget: { ...trip.budget, entries: Array.isArray(existing.budget?.entries) ? existing.budget.entries : [] },
  }
}

function num(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/* ————————————————————————————————————————————————
   Lecture directe (hors React — export, calcul, test)
   ———————————————————————————————————————————————— */

export function readAll() {
  return {
    trips: getTrips(),
    current: getCurrentTrip(),
    library: getLibrary(),
    memory: getMemory(),
    prefs: getPrefs(),
    persisted: isPersisted(),
  }
}

export function wipeAll() {
  // Effacer ses données, c'est aussi les effacer des autres appareils synchronisés.
  recordDeletion(tripIdsOf(tripsStore.get()))
  tripsStore.set([])
  currentStore.set(null)
  libraryStore.set([])
  memoryStore.set(null)
  prefsStore.set({})
  removeKey(KEYS.trips)
  removeKey(KEYS.current)
  removeKey(KEYS.library)
  removeKey(KEYS.memory)
  removeKey(KEYS.prefs)
}

/** Export JSON téléchargeable (sauvegarde manuelle). */
export function exportBackup() {
  return JSON.stringify({ v: 1, exportedAt: new Date().toISOString(), ...readAll() }, null, 2)
}

/** Restaure une sauvegarde ; renvoie le nombre de voyages importés. */
export function importBackup(json) {
  let payload
  try {
    payload = typeof json === 'string' ? JSON.parse(json) : json
  } catch {
    return 0
  }
  if (!payload || typeof payload !== 'object') return 0
  if (Array.isArray(payload.trips)) {
    tripsStore.set(payload.trips.filter((t) => t && t.id))
  }
  if (payload.library) libraryStore.set(payload.library)
  if (payload.memory) memoryStore.set(payload.memory)
  if (payload.prefs) prefsStore.set({ ...DEFAULT_PREFS, ...payload.prefs })
  return getTrips().length
}
