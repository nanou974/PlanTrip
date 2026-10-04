import { Link } from 'react-router-dom'
import vehicles from '../data/vehicles.json'

export default function Vehicules(){
  return (
    <div>
      <section className="py-16 bg-pt-cream topo-bg">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 text-center">
          <h1 className="hero-heading mb-4">6 véhicules.<br/><span className="text-pt-orange-ink">6 GPS différents.</span></h1>
          <p className="text-pt-neutral/60 max-w-2xl mx-auto">Chaque véhicule a ses contraintes. PlanTrip applique les bonnes règles à chaque itinéraire.</p>
        </div>
      </section>
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map(v=> (
            <Link key={v.slug} to={`/vehicules/${v.slug}`} className="p-6 bg-pt-cream rounded-2xl border border-pt-line hover:border-pt-green/30 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{v.icon}</span>
                <span className="text-xs px-2 py-1 bg-white rounded-full border border-pt-line">{v.routing.realisticSpeed}</span>
              </div>
              <h3 className="font-bold group-hover:text-pt-orange-ink">{v.name}</h3>
              <p className="text-sm text-pt-neutral/60 mt-1 line-clamp-2">{v.tagline}</p>
              <p className="text-xs text-pt-neutral/40 mt-3">{v.budget.items.slice(0,3).join(" • ")}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
