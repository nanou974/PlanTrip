import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/authContext.js'
import { useTrip } from '../state/store.js'
import { Button, Card, Pill, SectionHeader } from '../design/ui.jsx'
import {
  createShare,
  disableSync,
  enableSync,
  listShares,
  resumeUrl,
  revokeShare,
  shareUrl,
  useSyncStatus,
} from '../services/syncService.js'

function timeLabel(ms) {
  if (!ms) return ''
  return new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

async function nativeShare(url, title) {
  if (typeof navigator.share !== 'function') return false
  try {
    await navigator.share({ title, url })
    return true
  } catch {
    return false
  }
}

/**
 * Synchronisation entre appareils (avec ou sans compte) et lien de partage en lecture seule d'un voyage.
 * @param {{tripId?:string, className?:string}} props
 */
export default function SyncShareCard({ tripId, className = '' }) {
  const { user } = useAuth()
  const status = useSyncStatus(user)
  const trip = useTrip(tripId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [showResume, setShowResume] = useState(false)
  const [shareState, setShare] = useState(null)
  const [showDeparture, setShowDeparture] = useState(false)
  const mode = status.mode
  const share = mode === 'off' || !tripId ? null : shareState

  useEffect(() => {
    if (mode === 'off' || !tripId) return undefined
    let alive = true
    listShares(user)
      .then((list) => {
        if (!alive) return
        const mine = list.find((s) => s.tripId === tripId) || null
        setShare(mine)
        if (mine) setShowDeparture(mine.showDeparture)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [mode, tripId, user])

  const run = useCallback(async (job, success = '') => {
    setBusy(true)
    setError('')
    setInfo('')
    try {
      await job()
      if (success) setInfo(success)
    } catch (err) {
      setError(err?.unreachable ? 'Serveur injoignable : vérifiez votre connexion puis réessayez.' : err?.message || 'Action impossible.')
    } finally {
      setBusy(false)
    }
  }, [])

  const url = share ? shareUrl(share.token) : ''
  const resume = mode === 'space' ? resumeUrl() : ''

  return (
    <Card className={className} data-testid="sync-share">
      <SectionHeader
        title="Synchronisation et partage"
        subtitle="Retrouvez vos voyages sur un autre appareil, ou partagez-en un en lecture seule."
        action={
          mode === 'off' ? (
            <Pill tone="neutral" icon="cloud">
              Désactivée
            </Pill>
          ) : (
            <Pill tone="green" icon="refresh">
              {status.syncing ? 'Synchronisation…' : status.lastOkAt ? `À jour · ${timeLabel(status.lastOkAt)}` : 'Activée'}
            </Pill>
          )
        }
      />

      {status.error && (
        <p role="alert" className="mb-3 text-sm text-pt-danger">
          {status.error}
        </p>
      )}

      {mode === 'off' && (
        <div className="grid gap-3">
          <p className="text-sm text-pt-neutral/80">
            Vos voyages restent sur cet appareil. Activez la synchronisation pour les copier sur le serveur PlanTrip et
            les retrouver ailleurs — sans compte, ou avec votre compte si vous en avez un. Vous pouvez tout effacer du
            serveur à tout moment.
          </p>
          <Button
            variant="primary"
            icon="cloud"
            block
            disabled={busy}
            onClick={() => run(() => enableSync(user), 'Synchronisation activée.')}
          >
            Activer la synchronisation
          </Button>
          <p className="text-xs text-pt-neutral/75">
            Le partage d’un voyage nécessite la synchronisation. <Link to="/confidentialite" className="underline">Ce qui est enregistré</Link>
          </p>
        </div>
      )}

      {mode !== 'off' && (
        <div className="grid gap-4">
          <p className="text-sm text-pt-neutral/80">
            {mode === 'account'
              ? 'Vos voyages sont synchronisés avec votre compte : connectez-vous ailleurs pour les retrouver.'
              : 'Vos voyages sont synchronisés sans compte. Pour les reprendre sur un autre appareil, ouvrez-y le lien de reprise.'}
          </p>

          {mode === 'space' && (
            <div className="grid gap-2">
              <Button variant="secondary" icon="share" block onClick={() => setShowResume((v) => !v)} aria-expanded={showResume}>
                Reprendre sur un autre appareil
              </Button>
              {showResume && resume && (
                <div className="grid gap-2 rounded-xl border border-pt-line p-3" data-testid="resume-link">
                  <label htmlFor="resume-link" className="text-xs font-semibold text-pt-neutral">
                    Lien de reprise (personnel)
                  </label>
                  <input id="resume-link" readOnly value={resume} className="w-full rounded-lg border border-pt-line px-3 py-2 text-xs" onFocus={(e) => e.target.select()} />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" icon="copy" onClick={async () => setInfo((await copyText(resume)) ? 'Lien copié.' : 'Copie impossible : sélectionnez le lien.')}>
                      Copier
                    </Button>
                    <Button size="sm" variant="secondary" icon="share" onClick={() => nativeShare(resume, 'Reprendre mes voyages PlanTrip')}>
                      Envoyer à mon autre appareil
                    </Button>
                  </div>
                  <p className="text-xs text-pt-neutral/75">
                    Ce lien donne accès à tous vos voyages : ne le publiez pas. Sans lui (et sans compte), vos voyages ne
                    sont pas récupérables si vous perdez cet appareil.{' '}
                    <Link to="/register" className="underline">Créer un compte</Link> les garde accessibles partout.
                  </p>
                </div>
              )}
            </div>
          )}

          {trip && (
            <div className="grid gap-2 rounded-xl border border-pt-line p-3" data-testid="share-box">
              <h3 className="text-sm font-semibold text-pt-neutral">Partager « {trip.name} »</h3>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showDeparture}
                  disabled={busy}
                  onChange={(e) => {
                    const next = e.target.checked
                    setShowDeparture(next)
                    if (share) run(async () => setShare(await createShare(user, tripId, { showDeparture: next })), 'Réglage enregistré.')
                  }}
                />
                <span>
                  Montrer mon point de départ exact
                  <span className="block text-xs text-pt-neutral/75">
                    Décoché : seule la commune apparaît et le début du tracé est retiré. Notes, documents et dépenses ne
                    sont jamais partagés.
                  </span>
                </span>
              </label>
              {!share ? (
                <Button
                  variant="primary"
                  icon="share"
                  block
                  disabled={busy}
                  onClick={() => run(async () => setShare(await createShare(user, tripId, { showDeparture })))}
                >
                  Créer un lien de partage
                </Button>
              ) : (
                <div className="grid gap-2" data-testid="share-link">
                  <input aria-label="Lien de partage" readOnly value={url} className="w-full rounded-lg border border-pt-line px-3 py-2 text-xs" onFocus={(e) => e.target.select()} />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" icon="copy" onClick={async () => setInfo((await copyText(url)) ? 'Lien copié.' : 'Copie impossible : sélectionnez le lien.')}>
                      Copier
                    </Button>
                    <Button size="sm" variant="secondary" icon="share" onClick={() => nativeShare(url, trip.name)}>
                      Partager
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      icon="trash"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await revokeShare(user, share.token)
                          setShare(null)
                        }, 'Partage arrêté : le lien ne fonctionne plus.')
                      }
                    >
                      Arrêter le partage
                    </Button>
                  </div>
                  <p className="text-xs text-pt-neutral/75">Toute personne qui a ce lien peut consulter le voyage, sans pouvoir le modifier.</p>
                </div>
              )}
            </div>
          )}

          <Button
            variant="secondary"
            icon="trash"
            block
            disabled={busy}
            onClick={() => {
              if (!window.confirm('Désactiver la synchronisation et effacer vos voyages du serveur ? Ils restent sur cet appareil.')) return
              run(() => disableSync(user), 'Synchronisation désactivée, voyages effacés du serveur.')
            }}
          >
            Désactiver et effacer du serveur
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-pt-danger">
          {error}
        </p>
      )}
      {info && (
        <p role="status" className="mt-3 text-sm text-pt-green-ink">
          {info}
        </p>
      )}
    </Card>
  )
}
