import { useEffect, useState } from 'react'

/**
 * État de connexion réseau.
 *
 * `navigator.onLine` est une indication (faux = certainement hors ligne,
 * vrai = connecté à un réseau local, pas forcément à Internet) : les événements
 * `online` / `offline` du navigateur font foi.
 */
export function isOnline() {
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean') return true
  return navigator.onLine
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(isOnline)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}
