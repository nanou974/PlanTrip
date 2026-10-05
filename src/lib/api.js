/**
 * Client de l'API PlanTrip.
 *
 * Même origine partout : en production le serveur sert `dist/` et `/api/*`,
 * en développement un proxy Vite relaie `/api` sur le port du serveur local.
 * En `MODE=test`, tout appel est refusé localement : les tests unitaires
 * restent hors réseau et c'est le repli local qui fait foi.
 */

const API_DISABLED = import.meta.env.MODE === 'test'

export class ApiError extends Error {
  constructor(message, { code = 'error', status = 0 } = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export class ApiUnreachable extends Error {
  constructor() {
    super("Serveur injoignable : l'opération locale a été utilisée.")
    this.name = 'ApiUnreachable'
    this.unreachable = true
  }
}

export function isApiError(err) {
  return err instanceof ApiError
}

export function isUnreachable(err) {
  return err instanceof ApiUnreachable || Boolean(err?.unreachable)
}

export function apiEnabled() {
  return !API_DISABLED
}

/** Appel JSON avec cookie de session ; `ApiUnreachable` si le serveur est absent. */
export async function api(path, { method = 'GET', body, timeoutMs = 8000 } = {}) {
  if (API_DISABLED) throw new ApiUnreachable()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch {
    throw new ApiUnreachable()
  } finally {
    clearTimeout(timer)
  }
  if (res.status === 204) return null
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok) {
    throw new ApiError(data?.error?.message || 'Erreur serveur', {
      code: data?.error?.code || 'error',
      status: res.status,
    })
  }
  return data
}
