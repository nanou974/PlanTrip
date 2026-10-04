import { Icon } from '../design/Icon.jsx'
import { useOnlineStatus } from './online.js'

/**
 * Bandeau discret affiché uniquement hors connexion : l'application reste
 * utilisable (données locales), les services réseau sont explicitement cités.
 */
export function OfflineIndicator({ className = '' }) {
  const online = useOnlineStatus()
  if (online) return null

  return (
    <div
      role="status"
      className={`mb-4 flex items-start gap-2.5 rounded-xl border border-pt-orange/30 bg-pt-orange-soft px-3.5 py-2.5 text-sm leading-relaxed text-pt-orange-ink ${className}`}
    >
      <Icon name="globe" size={16} className="mt-0.5 shrink-0" />
      <p>
        <span className="font-semibold">Hors connexion.</span> Vos voyages restent consultables et
        modifiables sur cet appareil ; la recherche d’adresses, le calcul d’itinéraire, les
        hébergements et les fonds de carte nécessitent Internet.
      </p>
    </div>
  )
}
