import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/authContext.js'
import { apiEnabled } from '../lib/api.js'
import AuthSecurityNotice from '../components/AuthSecurityNotice.jsx'
import { Button, Card, Field, TextInput } from '../design/ui.jsx'

export default function Register() {
  const { register, loginWithProvider } = useAuth()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await register({ email, password, name })
      nav('/')
    } catch (err) {
      setError(err.message)
    }
  }

  function onProvider(provider) {
    loginWithProvider(provider)
    nav('/')
  }

  return (
    <section className="bg-pt-cream topo-bg py-12">
      <div className="mx-auto max-w-md px-5">
        <h1 className="text-center font-display text-3xl font-bold">Créer un compte</h1>
        <p className="mt-2 text-center text-pt-neutral/80">Gratuit, sans carte, contrôle total</p>

        <Card className="mt-8">
          <AuthSecurityNotice className="mb-5" />
          <div className="grid gap-3">
            <Button variant="secondary" block onClick={() => onProvider('google')}>
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-pt-line bg-white text-[11px] font-bold">
                G
              </span>
              Continuer avec Google
            </Button>
            <Button block onClick={() => onProvider('facebook')} style={{ backgroundColor: '#1877F2' }}>
              Continuer avec Facebook
            </Button>
          </div>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-pt-line" />
            <span className="text-xs uppercase text-pt-neutral/70">ou</span>
            <span className="h-px flex-1 bg-pt-line" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Nom affiché" id="register-name" hint="Facultatif — utilisé pour vos voyages.">
              <TextInput
                id="register-name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Camille Dupont"
              />
            </Field>
            <Field label="Adresse e-mail" id="register-email">
              <TextInput
                id="register-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
              />
            </Field>
            <Field
              label="Mot de passe"
              id="register-password"
              hint={
                apiEnabled()
                  ? '6 caractères minimum. Vérifié par le serveur, jamais stocké en clair.'
                  : '6 caractères minimum. Votre compte reste local à cet appareil.'
              }
            >
              <TextInput
                id="register-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            {error && (
              <p role="alert" className="text-sm text-pt-danger">
                {error}
              </p>
            )}
            <Button type="submit" block iconRight="arrow-right">
              Créer mon compte
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-pt-neutral/80">
            Déjà inscrit ?{' '}
            <Link to="/login" className="font-semibold text-pt-orange-ink hover:underline">
              Se connecter
            </Link>
          </p>
        </Card>
      </div>
    </section>
  )
}
