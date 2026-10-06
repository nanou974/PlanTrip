import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/authContext.js'
import { apiEnabled } from '../lib/api.js'
import {
  useTrips,
  useLibrary,
  usePrefs,
  setPrefs,
  exportBackup,
  importBackup,
  wipeAll,
} from '../state/store.js'
import { Icon } from '../design/Icon.jsx'
import {
  Button,
  PageHeader,
  SectionHeader,
  Card,
  Toggle,
  SelectInput,
  TextInput,
  Field,
  Pill,
  Modal,
} from '../design/ui.jsx'

export default function Profile() {
  const { user, logout, updateProfile, changePassword } = useAuth()
  const nav = useNavigate()
  const trips = useTrips()
  const library = useLibrary()
  const prefs = usePrefs()

  const [name, setName] = useState(user?.name || '')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [notice, setNotice] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordChanged, setPasswordChanged] = useState(false)
  const fileRef = useRef(null)

  if (!user) {
    return (
      <div>
        <PageHeader title="Mon profil" subtitle="Connectez-vous pour gérer votre compte et votre profil." />
        <Card className="max-w-md text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-pt-green-soft text-pt-green-ink mb-4">
            <Icon name="user" size={24} />
          </span>
          <p className="text-sm text-pt-neutral/80 mb-5">
            PlanTrip fonctionne sans compte : vos voyages restent stockés sur cet appareil. La
            connexion vérifie votre identité et conserve votre profil (nom, e-mail).
          </p>
          <div className="flex flex-col gap-2">
            <Button to="/login" iconRight="arrow-right">
              Se connecter
            </Button>
            <Button to="/register" variant="secondary">
              Créer un compte
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  async function save() {
    setSaveError('')
    try {
      await updateProfile({ name: name.trim() || user.name })
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    } catch (err) {
      setSaveError(err.message)
    }
  }

  async function onSubmitPassword(e) {
    e.preventDefault()
    setPasswordError('')
    setPasswordChanged(false)
    try {
      await changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setPasswordChanged(true)
    } catch (err) {
      setPasswordError(err.message)
    }
  }

  function downloadBackup() {
    const blob = new Blob([exportBackup()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plantrip-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setNotice('Sauvegarde téléchargée.')
    setTimeout(() => setNotice(''), 2500)
  }

  function onImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const count = importBackup(String(reader.result || ''))
      setNotice(count > 0 ? `${count} voyage(s) importé(s).` : 'Fichier illisible.')
      setTimeout(() => setNotice(''), 3000)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  return (
    <div>
      <PageHeader
        eyebrow="Compte local"
        title="Mon profil"
        subtitle="Identité, préférences d’affichage et gestion de vos données."
        actions={
          <Button variant="secondary" icon="external" onClick={() => { logout(); nav('/') }}>
            Se déconnecter
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SectionHeader title="Identité" />
          <Card>
            <div className="flex items-center gap-4 mb-6">
              <span className="w-14 h-14 rounded-full bg-pt-green text-white flex items-center justify-center text-xl font-semibold shrink-0">
                {initials || 'PT'}
              </span>
              <div className="min-w-0">
                <p className="font-semibold truncate">{user.name}</p>
                <p className="text-sm text-pt-neutral/80 truncate">
                  {user.email} · {user.provider}
                </p>
              </div>
              <Pill tone="green" className="ml-auto">
                {apiEnabled() ? 'Compte vérifié' : 'Local'}
              </Pill>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="profile-name" className="field-label mb-1.5">
                  Nom affiché
                </label>
                <TextInput id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="profile-email" className="field-label mb-1.5">
                  Adresse e-mail
                </label>
                <TextInput id="profile-email" value={user.email} readOnly className="opacity-70" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-5">
              <Button onClick={save} disabled={!name.trim()}>
                Enregistrer
              </Button>
              {saved && (
                <span className="text-sm text-pt-green-ink inline-flex items-center gap-1.5">
                  <Icon name="check-circle" size={16} />
                  Profil mis à jour
                </span>
              )}
              {saveError && (
                <p role="alert" className="text-sm text-pt-danger">
                  {saveError}
                </p>
              )}
            </div>
          </Card>

          <SectionHeader title="Sécurité" />
          <Card>
            {user.provider === 'email' ? (
              <form onSubmit={onSubmitPassword} className="space-y-4">
                <p className="text-sm text-pt-neutral/80">
                  Votre mot de passe est haché (PBKDF2-SHA256) dans le stockage local de cet
                  appareil pour le contrôle hors ligne, et vérifié par le serveur : jamais en clair.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Mot de passe actuel" id="profile-current-password" required error={passwordError}>
                    <TextInput
                      id="profile-current-password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Nouveau mot de passe"
                    id="profile-new-password"
                    required
                    hint="8 caractères minimum."
                  >
                    <TextInput
                      id="profile-new-password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={!currentPassword || newPassword.length < 8}>
                    Modifier le mot de passe
                  </Button>
                  {passwordChanged && (
                    <span className="text-sm text-pt-green-ink inline-flex items-center gap-1.5">
                      <Icon name="check-circle" size={16} />
                      Mot de passe modifié
                    </span>
                  )}
                </div>
              </form>
            ) : (
              <p className="text-sm text-pt-neutral/80">
                Ce compte n’a pas de mot de passe : il est ouvert par lien magique.
              </p>
            )}
          </Card>

          <SectionHeader title="Préférences d’affichage" />
          <Card>
            <div className="divide-y divide-pt-line">
              <Toggle
                id="pref-cents"
                checked={prefs.showPricesWithCents}
                onChange={(v) => setPrefs({ showPricesWithCents: v })}
                label="Afficher les centimes"
                hint="Par défaut les montants sont arrondis à l’euro."
              />
              <div className="flex items-center justify-between gap-4 py-3">
                <div>
                  <label htmlFor="pref-units" className="text-sm font-medium">
                    Unités
                  </label>
                  <p id="pref-units-hint" className="text-xs text-pt-neutral/80 mt-0.5">
                    Distances et poids.
                  </p>
                </div>
                <span className="w-44">
                  <SelectInput
                    id="pref-units"
                    aria-describedby="pref-units-hint"
                    value={prefs.units}
                    onChange={(e) => setPrefs({ units: e.target.value })}
                  >
                    <option value="metric">Métriques (km, kg)</option>
                    <option value="imperial">Impériales (mi, lb)</option>
                  </SelectInput>
                </span>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <SectionHeader title="Vos données" />
          <Card>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-pt-neutral/80">Voyages enregistrés</span>
                <span className="font-semibold tabular-nums">{trips.length}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-pt-neutral/80">Lieux favoris</span>
                <span className="font-semibold tabular-nums">{library.length}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-pt-neutral/80">Stockage</span>
                <span className="font-semibold text-pt-green-ink">Sur cet appareil</span>
              </li>
            </ul>

            <div className="mt-5 pt-5 border-t border-pt-line space-y-2">
              <Button variant="secondary" icon="download" block onClick={downloadBackup}>
                Exporter ma sauvegarde
              </Button>
              <Button variant="secondary" icon="inbox" block onClick={() => fileRef.current?.click()}>
                Importer une sauvegarde
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={onImport}
                aria-label="Fichier de sauvegarde"
              />
              <Button variant="danger" icon="trash" block onClick={() => setConfirmWipe(true)}>
                Effacer toutes mes données
              </Button>
              {notice && <p className="text-xs text-pt-green-ink text-center pt-1">{notice}</p>}
            </div>
          </Card>

          <Card className="bg-pt-cream border-transparent">
            <p className="text-sm font-semibold mb-1.5">Hors connexion</p>
            <p className="text-sm text-pt-neutral/80 leading-relaxed">
              Vos voyages restent disponibles sans réseau. Aucune donnée de voyage n’est envoyée sur un
              serveur : si vous videz le stockage de votre navigateur, ces données disparaissent —
              pensez à exporter.
            </p>
          </Card>
        </div>
      </div>

      <Modal
        open={confirmWipe}
        onClose={() => setConfirmWipe(false)}
        title="Effacer toutes les données ?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmWipe(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              icon="trash"
              onClick={() => {
                wipeAll()
                setConfirmWipe(false)
                setNotice('Toutes les données ont été effacées.')
                setTimeout(() => setNotice(''), 3000)
              }}
            >
              Tout effacer
            </Button>
          </>
        }
      >
        <p className="text-sm text-pt-neutral/70">
          Les {trips.length} voyage(s), les {library.length} lieu(x) favori(s), vos préférences et votre
          brouillon en cours seront supprimés définitivement de cet appareil.
        </p>
      </Modal>
    </div>
  )
}
