import { useParams, Link } from 'react-router-dom'
import vehicles from '../data/vehicles.json'

export default function VehiculeDetail(){
  const {slug}=useParams()
  const v = vehicles.find(x=>x.slug===slug)
  if(!v) return <div className="pt-28 text-center">Véhicule introuvable. <Link to="/vehicules" className="text-pt-orange-ink">Retour</Link></div>
  return (
    <div>
      <section className="py-12 bg-pt-cream">
        <div className="max-w-4xl mx-auto px-5 lg:px-8">
          <Link to="/vehicules" className="text-sm text-pt-neutral/75 hover:text-pt-orange-ink">← Tous les véhicules</Link>
          <div className="flex items-center gap-4 mt-6">
            <span className="text-5xl">{v.icon}</span>
            <div>
              <h1 className="text-3xl font-extrabold">{v.name}</h1>
              <p className="text-pt-neutral/80">{v.tagline}</p>
            </div>
          </div>
          <p className="mt-6 text-pt-neutral/70 leading-relaxed">{v.description}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-white rounded-full border text-xs">{v.routing.realisticSpeed}</span>
            {v.constraints.map(c=> <span key={c.label} className="px-3 py-1 bg-pt-green-soft rounded-full text-xs">{c.label}: {c.value}</span>)}
          </div>
          <Link to="/preparer-son-voyage" className="inline-flex mt-8 px-6 py-3 bg-pt-green text-white font-semibold rounded-xl">Préparer en {v.name}</Link>
        </div>
      </section>
      <section className="py-10 bg-white">
        <div className="max-w-4xl mx-auto px-5 lg:px-8 grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-bold mb-3">Itinéraire</h3>
            <p className="text-sm text-pt-neutral/80 mb-2">Autorisé: {v.routing.allowed.join(", ")}</p>
            <p className="text-sm text-pt-danger">Évité: {v.routing.forbidden.join(", ") || "—"}</p>
            <p className="text-xs text-pt-neutral/70 mt-2">{v.routing.speedNote}</p>
          </div>
          <div>
            <h3 className="font-bold mb-3">Budget</h3>
            <ul className="text-sm text-pt-neutral/80 list-disc pl-5">{v.budget.items.map(i=> <li key={i}>{i}</li>)}</ul>
            <p className="text-xs text-pt-neutral/70 mt-2">{v.budget.note}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
