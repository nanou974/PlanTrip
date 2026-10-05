import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../lib/authContext.js'
import { useTrips } from '../state/store.js'
import { Icon } from '../design/Icon.jsx'
import { Button } from '../design/ui.jsx'
import { OfflineIndicator } from '../lib/connectivity.jsx'
import BottomNav from './BottomNav.jsx'

const NAV = [
  { to: '/tableau-de-bord', label: 'Tableau de bord', icon: 'grid' },
  { to: '/mes-voyages', label: 'Mes voyages', icon: 'suitcase' },
  { to: '/budget', label: 'Budget', icon: 'wallet' },
]

const SECONDARY = [
  { to: '/mon-profil', label: 'Mon profil', icon: 'user' },
  { to: '/faq', label: 'Aide & FAQ', icon: 'help' },
]

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'PT'
}

export default function AppShell() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const trips = useTrips()
  const activeCount = trips.filter((t) => t.status !== 'done').length

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium min-h-[42px] transition-colors ${
      isActive ? 'bg-pt-green-soft text-pt-green-ink' : 'text-pt-neutral/70 hover:bg-pt-neutral/5 hover:text-pt-neutral'
    }`

  return (
    <div className="min-h-screen bg-pt-cream">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:z-60 focus:top-3 focus:left-3 focus:bg-white focus:px-4 focus:py-2.5 focus:rounded-xl focus:shadow-pop focus:text-sm focus:font-semibold"
      >
        Aller au contenu
      </a>

      {/* Barre latérale — planche 07 */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[264px] flex-col bg-white border-r border-pt-line z-40">
        <div className="px-5 py-5 border-b border-pt-line">
          <Link to="/" className="inline-flex items-center gap-2" aria-label="PlanTrip — retour au site">
            <img src="/images/86dde5ac8_Logo.png" alt="" className="h-9 w-auto" />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1" aria-label="Navigation">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass} end={item.to === '/tableau-de-bord'}>
              <Icon name={item.icon} size={19} />
              <span className="flex-1">{item.label}</span>
              {item.to === '/mes-voyages' && activeCount > 0 && (
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-pt-green text-white">
                  {activeCount}
                </span>
              )}
            </NavLink>
          ))}

          <div className="pt-3 pb-1 px-3.5">
            <Button to="/preparer-son-voyage" icon="plus" size="sm" block>
              Préparer un voyage
            </Button>
          </div>

          <div className="my-3 h-px bg-pt-line" />

          {SECONDARY.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass}>
              <Icon name={item.icon} size={19} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-pt-line p-3">
          {user ? (
            <div className="flex items-center gap-3 px-2 py-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pt-blue text-white text-xs font-semibold">
                {initials(user.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{user.name}</p>
                <p className="text-xs text-pt-neutral/75 truncate">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                aria-label="Se déconnecter"
                title="Se déconnecter"
                className="p-2 rounded-lg text-pt-neutral/70 hover:text-pt-danger hover:bg-pt-danger-soft transition-colors"
              >
                <Icon name="external" size={17} />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button to="/login" variant="secondary" size="sm" block>
                Connexion
              </Button>
              <p className="text-[11px] text-pt-neutral/75 text-center leading-snug px-2">
                Créez un compte pour retrouver vos voyages partout.
              </p>
            </div>
          )}
          <Link
            to="/"
            className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-pt-neutral/75 hover:text-pt-neutral py-1.5"
          >
            <Icon name="globe" size={13} />
            Voir le site
          </Link>
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        {/* Barre supérieure mobile — planche 08 */}
        <header className="lg:hidden sticky top-0 z-30 h-14 bg-white border-b border-pt-line flex items-center justify-between px-4">
          <Link to="/tableau-de-bord" className="flex items-center gap-2">
            <img src="/images/86dde5ac8_Logo.png" alt="PlanTrip" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-1">
            <NavLink
              to="/preparer-son-voyage"
              aria-label="Préparer un voyage"
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-pt-green-soft text-pt-green-ink"
            >
              <Icon name="plus" size={20} strokeWidth={2.4} />
            </NavLink>
            <NavLink to="/mon-profil" aria-label="Mon profil" className="flex items-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pt-blue text-white text-xs font-semibold">
                {user ? initials(user.name) : <Icon name="user" size={18} />}
              </span>
            </NavLink>
          </div>
        </header>

        <main id="contenu" className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10 pt-5 lg:pt-9 pb-24 lg:pb-16">
          <OfflineIndicator />
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
