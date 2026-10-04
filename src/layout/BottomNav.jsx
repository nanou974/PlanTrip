import { NavLink, useLocation } from 'react-router-dom'
import { Icon } from '../design/Icon.jsx'

const ITEMS = [
  { to: '/tableau-de-bord', label: 'Accueil', icon: 'home' },
  { to: '/mes-voyages', label: 'Voyages', icon: 'suitcase' },
  { to: '/preparer-son-voyage', label: 'Créer', icon: 'plus', primary: true },
  { to: '/budget', label: 'Budget', icon: 'wallet' },
  { to: '/mon-profil', label: 'Profil', icon: 'user' },
]

export default function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Navigation principale"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-pt-line pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const active =
            pathname === item.to || (item.to !== '/tableau-de-bord' && pathname.startsWith(item.to))
          if (item.primary) {
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className="flex flex-col items-center justify-center gap-1 pt-1.5 pb-2 min-h-[56px]"
                  aria-label="Créer un voyage"
                >
                  <span className="flex h-10 w-10 -mt-5 items-center justify-center rounded-full bg-pt-green text-white shadow-pop ring-4 ring-white">
                    <Icon name="plus" size={22} strokeWidth={2.5} />
                  </span>
                  <span className="text-[10px] font-semibold text-pt-neutral/70">{item.label}</span>
                </NavLink>
              </li>
            )
          }
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 pt-2 pb-2 min-h-[56px] transition-colors ${
                  active ? 'text-pt-green' : 'text-pt-neutral/50'
                }`}
              >
                <Icon name={item.icon} size={22} strokeWidth={active ? 2.2 : 1.8} />
                <span className={`text-[10px] ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
