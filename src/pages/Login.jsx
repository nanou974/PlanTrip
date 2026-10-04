import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/authContext.js'
import { Button, Card, Field, TextInput } from '../design/ui.jsx'

function SocialButtons({ onLogin }) {
  return (
    <div className="grid gap-3">
      <Button variant="secondary" block onClick={() => onLogin('google')}>
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-pt-line bg-white text-[11px] font-bold">
          G
        </span>
        Continuer avec Google
      </Button>
      <Button block onClick={() => onLogin('facebook')} style={{ backgroundColor: '#1877F2' }}>
        Continuer avec Facebook
      </Button>
    </div>
  )
}

function ModeSwitch({ mode, onChange }) {
  return (
    <div className="flex rounded-xl bg-pt-cream p-1" role="tablist" aria-label="Mode de connexion">
      {[
        { id: 'password', label: 'Mot de passe' },
        { id: 'magic', label: 'Magic Link' },
      ].map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={mode === item.id}
          onClick={() => onChange(item.id)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            mode === item.id ? 'bg-white shadow-sm text-pt-neutral' : 'text-pt-neutral/50 hover:text-pt-neutral'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export default function Login() {
  const { login, loginWithProvider, sendMagicLink, verifyOTP } = useAuth()
  const nav = useNavigate()
  const [mode, setMode] = useState('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  function onPassword(e) {
    e.preventDefault()
    setError('')
    try {
      login({ email, password })
      nav('/')
    } catch (err) {
      setError(err.message)
    }
  }

  function onSendMagic(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!email) return setError('Email requis')
    const code = sendMagicLink(email)
    setSent(true)
    setInfo(`Code envoyé ! (démo, code = ${code}) — valable 10 min`)
  }

  function onVerify(e) {
    e.preventDefault()
    setError('')
    try {
      verifyOTP(email, otp)
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
        <h1 className="text-center font-display text-3xl font-bold">Connexion</h1>
        <p className="mt-2 text-center text-pt-neutral/60">Retrouvez vos voyages, où que vous soyez</p>

        <Card className="mt-8">
          <SocialButtons onLogin={onProvider} />

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-pt-line" />
            <span className="text-xs uppercase text-pt-neutral/40">ou</span>
            <span className="h-px flex-1 bg-pt-line" />
          </div>

          <ModeSwitch
            mode={mode}
            onChange={(next) => {
              setMode(next)
              setError('')
              setInfo('')
            }}
          />

          <div className="mt-6">
            {mode === 'password' ? (
              <form onSubmit={onPassword} className="space-y-4">
                <Field label="Adresse e-mail" id="login-email">
                  <TextInput
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.fr"
                  />
                </Field>
                <Field label="Mot de passe" id="login-password">
                  <TextInput
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
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
                <Button type="submit" block>
                  Se connecter
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                {!sent ? (
                  <form onSubmit={onSendMagic} className="space-y-4">
                    <Field
                      label="Adresse e-mail"
                      id="login-magic-email"
                      hint="Vous recevrez un code à 6 chiffres (démo : affiché à l'envoi, en prod envoyé par email)."
                    >
                      <TextInput
                        id="login-magic-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="vous@exemple.fr"
                      />
                    </Field>
                    {error && (
                      <p role="alert" className="text-sm text-pt-danger">
                        {error}
                      </p>
                    )}
                    <Button type="submit" variant="secondary" block icon="mail">
                      Envoyer le code
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={onVerify} className="space-y-4">
                    <p className="text-sm text-pt-neutral/70">
                      Code envoyé à <strong>{email}</strong>
                    </p>
                    {info && (
                      <p className="rounded-xl border border-pt-green/20 bg-pt-green-soft p-3 text-sm text-pt-green">
                        {info}
                      </p>
                    )}
                    <Field label="Code à 6 chiffres" id="login-otp">
                      <TextInput
                        id="login-otp"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="000000"
                        className="text-center text-lg tracking-[0.3em]"
                      />
                    </Field>
                    {error && (
                      <p role="alert" className="text-sm text-pt-danger">
                        {error}
                      </p>
                    )}
                    <Button type="submit" block icon="check">
                      Vérifier et se connecter
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      block
                      onClick={() => {
                        setSent(false)
                        setOtp('')
                        setInfo('')
                      }}
                    >
                      Renvoyer le code
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-pt-neutral/60">
            Pas de compte ?{' '}
            <Link to="/register" className="font-semibold text-pt-orange-ink hover:underline">
              Créer un compte
            </Link>
          </p>
        </Card>

        <p className="mt-4 text-center text-xs text-pt-neutral/45">
          Auth locale (localStorage). Pour Google/Facebook réels, configurez un fournisseur dans{' '}
          <code className="text-pt-neutral/60">src/lib/auth.jsx</code>.
        </p>
      </div>
    </section>
  )
}
