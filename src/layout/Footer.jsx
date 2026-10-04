import { Link } from 'react-router-dom'
import { Icon } from '../design/Icon.jsx'

const COLUMNS = [
  {
    title: 'Produit',
    links: [
      { label: 'Fonctionnalités', to: '/fonctionnalites' },
      { label: 'Véhicules compatibles', to: '/vehicules' },
      { label: 'Préparer son voyage', to: '/preparer-son-voyage' },
      { label: 'Connexion', to: '/login' },
    ],
  },
  {
    title: 'Ressources',
    links: [
      { label: 'Blog', to: '/blog' },
      { label: 'FAQ', to: '/faq' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Compte',
    links: [
      { label: 'Tableau de bord', to: '/tableau-de-bord' },
      { label: 'Mes voyages', to: '/mes-voyages' },
      { label: 'Mon profil', to: '/mon-profil' },
    ],
  },
  {
    title: 'Légal',
    links: [
      { label: 'Mentions légales', to: '/mentions-legales' },
      { label: 'Confidentialité', to: '/confidentialite' },
      { label: 'Accessibilité', to: '/accessibilite' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-pt-neutral text-white/70">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <img src="/images/86dde5ac8_Logo.png" alt="PlanTrip" className="h-11 w-auto" />
            <p className="mt-4 text-sm leading-relaxed max-w-sm">
              Itinéraire, budget, lieux, documents et checklists réunis dans un seul espace —
              adapté à votre véhicule et à vos envies. Vos voyages restent consultables hors
              connexion.
            </p>
            <p className="mt-5 text-xs text-white/70">
              Gratuit, sans carte bancaire. Vos données restent sur votre appareil.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="font-display font-semibold text-white text-sm mb-3">{col.title}</h3>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm hover:text-pt-orange transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-white/70">
          <p>© 2026 PlanTrip — plantrip.fr · Fait en France</p>
          <div className="flex items-center gap-5">
            <Link to="/contact" className="hover:text-white transition-colors">
              Nous écrire
            </Link>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="shield" size={14} />
              Données locales
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
