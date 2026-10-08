import { useEffect } from 'react'
import { useAuth } from '../lib/authContext.js'
import { subscribeTrips } from '../state/store.js'
import { adoptSpaceIfNeeded, runSync, syncModeOf, useSyncStatus } from '../services/syncService.js'

/** Délai avant d'envoyer une série de modifications : une seule requête pour plusieurs frappes. */
const DEBOUNCE_MS = 2500

/**
 * Pilote la synchronisation en arrière-plan : au démarrage, après chaque modification, au retour du réseau
 * et quand l'onglet redevient visible. Ne rend rien.
 */
export default function SyncManager() {
  const { user } = useAuth()
  const serverSession = Boolean(user?.serverSession)
  const status = useSyncStatus(user)
  const mode = status.mode

  // Connexion : l'espace anonyme de l'appareil rejoint le compte.
  useEffect(() => {
    if (serverSession) adoptSpaceIfNeeded(user)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverSession, user?.id])

  useEffect(() => {
    if (syncModeOf(user) === 'off') return undefined
    runSync({ user })
    let timer = null
    const later = () => {
      clearTimeout(timer)
      timer = setTimeout(() => runSync({ user }), DEBOUNCE_MS)
    }
    const unsubscribe = subscribeTrips(later)
    const onOnline = () => runSync({ user })
    const onVisible = () => {
      if (document.visibilityState === 'visible') runSync({ user })
    }
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      unsubscribe()
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, serverSession, user?.id])

  return null
}
