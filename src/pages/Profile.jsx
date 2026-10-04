import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/authContext.js'
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
  Pill,
  Modal,
} from '../design/ui.jsx'

export default function Profile() {
  const { user, logout, updateProfile } = useAuth()
  const nav = useNavigate()
  const trips = useTrips()
  const library = useLibrary()
  const prefs = usePrefs()

  const [name, setName] = useState(user?.name || '')
  const [saved, setSaved] = useState(false)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [notice, setNotice] = useState('')
  const fileRef = useRef(null)

  if (!user) {
    return (
      <div>
        <PageHeader title="Mon profil" subtitle="Connectez-vous pour retrouver vos voyages sur cet appareil." />
        <Card className="max-w-md text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-pt-green-soft text-pt-green mb-4">
            <Icon name="user" size={24} />
          </span>
          <p className="text-sm text-pt-neutral/65 mb-5">
            PlanTrip fonctionne sans compte. La connexion sert simplement à préserver vos voyages et
            vos préférences.
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

  function save() {
    updateProfile({ name: name.trim() || user.name })
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
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
                <p className="text-sm text-pt-neutral/55 truncate">
                  {user.email} · {user.provider}
                </p>
              </div>
              <Pill tone="green" className="ml-auto">
                Local
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

            <div className="flex items-center gap-3 mt-5">
              <Button onClick={save} disabled={!name.trim()}>
                Enregistrer
              </Button>
              {saved && (
                <span className="text-sm text-pt-green inline-flex items-center gap-1.5">
                  <Icon name="check-circle" size={16} />
                  Profil mis à jour
                </span>
              )}
            </div>
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
                  <p className="text-sm font-medium">Unités</p>
                  <p className="text-xs text-pt-neutral/55 mt-0.5">Distances et poids.</p>
                </div>
                <span className="w-44">
                  <SelectInput
                    id="pref-units"
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
                <span className="text-pt-neutral/65">Voyages enregistrés</span>
                <span className="font-semibold tabular-nums">{trips.length}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-pt-neutral/65">Lieux favoris</span>
                <span className="font-semibold tabular-nums">{library.length}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-pt-neutral/65">Stockage</span>
                <span className="font-semibold text-pt-green">Sur cet appareil</span>
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
              {notice && <p className="text-xs text-pt-green text-center pt-1">{notice}</p>}
            </div>
          </Card>

          <Card className="bg-pt-cream border-transparent">
            <p className="text-sm font-semibold mb-1.5">Hors connexion</p>
            <p className="text-sm text-pt-neutral/65 leading-relaxed">
              Vos voyages restent disponibles sans réseau. Rien n’est envoyé sur un serveur : si vous
              videz le stockage de votre navigateur, ces données disparaissent — pensez à exporter.
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
