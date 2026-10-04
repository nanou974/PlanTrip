import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/authContext.js'
import { Icon } from '../design/Icon.jsx'
import { Button } from '../design/ui.jsx'

const NAV = [
  { label: 'Accueil', to: '/' },
  { label: 'Fonctionnalités', to: '/fonctionnalites' },
  { label: 'Véhicules', to: '/vehicules' },
  { label: 'Préparer son voyage', to: '/preparer-son-voyage' },
  { label: 'FAQ', to: '/faq' },
]

export default function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const { user, logout } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-200 ${
        scrolled || open
          ? 'bg-pt-cream/90 backdrop-blur-xl border-b border-pt-line shadow-sm'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-5 lg:px-8 h-16 lg:h-20 flex items-center justify-between gap-4">
        <Link to="/" className="inline-flex items-center shrink-0" aria-label="PlanTrip — accueil">
          <img src="/images/86dde5ac8_Logo.png" alt="" className="h-10 lg:h-12 w-auto" />
        </Link>

        <div className="hidden lg:flex items-center gap-0.5">
          {NAV.map((item) => {
            const active = pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`nav-link ${
                  active ? 'text-pt-green-ink bg-pt-green-soft' : 'text-pt-neutral/70 hover:text-pt-neutral hover:bg-pt-neutral/5'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          {user ? (
            <>
              <Link to="/mes-voyages" className="nav-link text-pt-neutral/70 hover:text-pt-neutral hover:bg-pt-neutral/5">
                {user.name}
              </Link>
              <button
                type="button"
                onClick={logout}
                className="nav-link text-pt-neutral/75 hover:text-pt-danger"
              >
                Déconnexion
              </button>
              <Button to="/mes-voyages" icon="suitcase">
                Mon espace
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link text-pt-neutral/70 hover:text-pt-neutral hover:bg-pt-neutral/5">
                Connexion
              </Link>
              <Button to="/preparer-son-voyage" iconRight="arrow-right">
                Démarrer
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden -mr-2 p-2.5 text-pt-neutral"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
        >
          <Icon name={open ? 'close' : 'menu'} size={24} />
        </button>
      </nav>

      {open && (
        <div
          className="lg:hidden bg-pt-cream border-t border-pt-line px-5 py-4 max-h-[calc(100vh-4rem)] overflow-y-auto scrollbar-thin"
          onClick={() => setOpen(false)}
        >
          <div className="flex flex-col gap-1">
            {NAV.map((item) => {
              const active = pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-[15px] font-medium min-h-[44px] ${
                    active ? 'text-pt-green-ink bg-pt-green-soft' : 'text-pt-neutral hover:bg-pt-neutral/5'
                  }`}
                >
                  {item.label}
                  <Icon name="chevron-right" size={16} className="opacity-40" />
                </Link>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-pt-line flex flex-col gap-2">
            {user ? (
              <>
                <Button to="/mes-voyages" icon="suitcase" block>
                  Mon espace
                </Button>
                <Button variant="ghost" onClick={logout} block>
                  Déconnexion
                </Button>
              </>
            ) : (
              <>
                <Button to="/preparer-son-voyage" iconRight="arrow-right" block>
                  Démarrer — gratuit
                </Button>
                <Button to="/login" variant="secondary" block>
                  Connexion
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
