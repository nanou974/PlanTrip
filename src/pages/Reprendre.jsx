import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/authContext.js'
import { Button, Card, EmptyState } from '../design/ui.jsx'
import { parseResumeHash, resumeFromLink } from '../services/syncService.js'

const MESSAGES = {
  invalid: 'Ce lien de reprise est invalide, ou l’espace a été supprimé.',
  offline: 'Serveur injoignable : vérifiez votre connexion puis réessayez.',
  error: 'La reprise a échoué : réessayez dans un instant.',
}

/**
 * Reprise des voyages d'un autre appareil. La clé voyage dans le fragment de l'adresse (`#…`), que le navigateur
 * n'envoie jamais au serveur ; on la retire de la barre d'adresse dès qu'elle est lue.
 */
export default function Reprendre() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [credentials] = useState(() => parseResumeHash(typeof window === 'undefined' ? '' : window.location.hash))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (credentials && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [credentials])

  async function onResume() {
    setBusy(true)
    setError('')
    const result = await resumeFromLink(credentials)
    setBusy(false)
    if (result.ok) nav('/mes-voyages')
    else setError(MESSAGES[result.reason] || MESSAGES.error)
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-12 lg:px-8">
      {!credentials ? (
        <EmptyState
          icon="share"
          title="Lien de reprise incomplet"
          description="Ouvrez le lien complet affiché sur votre autre appareil, dans « Synchronisation et partage »."
          action={
            <Button to="/" icon="home">
              Retour à l’accueil
            </Button>
          }
        />
      ) : user?.serverSession ? (
        <Card>
          <h1 className="font-display font-semibold text-xl">Vous êtes connecté</h1>
          <p className="mt-2 text-sm text-pt-neutral/80">
            Vos voyages sont déjà synchronisés avec votre compte. Pour reprendre ceux d’un espace sans compte, déconnectez-vous
            d’abord.
          </p>
          <div className="mt-4">
            <Button to="/mes-voyages" icon="suitcase">
              Mes voyages
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <h1 className="font-display font-semibold text-xl">Reprendre mes voyages</h1>
          <p className="mt-2 text-sm text-pt-neutral/80">
            Les voyages de votre autre appareil vont être copiés ici. Ceux déjà présents sur cet appareil sont conservés ;
            en cas de doublon, la version la plus récente est gardée.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" icon="refresh" disabled={busy} onClick={onResume}>
              {busy ? 'Reprise en cours…' : 'Reprendre mes voyages'}
            </Button>
            <Button variant="secondary" to="/">
              Annuler
            </Button>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-pt-danger">
              {error}
            </p>
          )}
          <p className="mt-4 text-xs text-pt-neutral/75">
            <Link to="/confidentialite" className="underline">
              Ce qui est enregistré sur le serveur
            </Link>
          </p>
        </Card>
      )}
    </div>
  )
}
