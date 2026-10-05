import { Link } from 'react-router-dom'
import vehicles from '../data/vehicles.json'

export default function Home(){
  return (
    <div>
      <section className="py-20 lg:py-28 bg-pt-cream topo-bg">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-pt-green-soft border border-pt-green/20 rounded-full mb-6">
            <span className="text-xs font-semibold text-pt-orange-ink uppercase tracking-wider">6 véhicules supportés</span>
          </div>
          <h1 className="hero-heading text-pt-neutral mb-6">Le GPS qui s'adapte<br/><span className="text-pt-orange-ink">à votre véhicule,</span><br/>pas l'inverse.</h1>
          <p className="text-lg text-pt-neutral/80 max-w-2xl mx-auto mb-8 leading-relaxed">
            Camping-car, moto, vélo, VSP, camion, van, randonnée... PlanTrip calcule votre itinéraire selon votre gabarit réel, votre budget et vos envies. Fini les ponts trop bas et les péages surprises.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/preparer-son-voyage" className="px-8 py-4 bg-pt-green text-white font-semibold rounded-xl hover:bg-pt-green-dark transition-all hover:shadow-xl">Préparer mon voyage</Link>
            <Link to="/vehicules" className="px-8 py-4 bg-white border border-pt-line font-semibold rounded-xl hover:bg-pt-neutral/5">Voir les véhicules</Link>
          </div>
          <div className="mt-12 grid grid-cols-3 lg:grid-cols-6 gap-3 max-w-4xl mx-auto">
            {vehicles.slice(0,6).map(v=> (
              <div key={v.slug} className="p-4 bg-white rounded-2xl border border-pt-line text-center">
                <div className="text-2xl mb-1">{v.icon}</div>
                <div className="text-xs font-medium">{v.name}</div>
                <div className="text-[10px] text-pt-neutral/70">{v.routing.realisticSpeed}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-5 lg:px-8">
          <h2 className="section-heading text-center mb-10">Pourquoi PlanTrip est différent ?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {title:"Gabarit réel", desc:"Hauteur, poids, PTAC vérifiés à chaque pont et tunnel. Fini les demi-tours.", icon:"📏"},
              {title:"Budget temps réel", desc:"Carburant selon ta conso, péages majorés, campings. Tu sais avant de partir.", icon:"💰"},
              {title:"4 modes", desc:"Touristique, économique, rapide, découverte. Le même trajet, 4 voyages.", icon:"🗺️"},
            ].map(c=> (
              <div key={c.title} className="p-6 bg-pt-cream rounded-2xl border border-pt-line">
                <div className="text-3xl mb-3">{c.icon}</div>
                <h3 className="font-bold mb-2">{c.title}</h3>
                <p className="text-sm text-pt-neutral/80">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-pt-neutral text-white">
        <div className="max-w-4xl mx-auto px-5 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Prêt à construire votre voyage ?</h2>
          <p className="text-white/60 mb-8">Budget, véhicule, envies : PlanTrip arbitre et construit le meilleur itinéraire sous contrainte.</p>
          <Link to="/preparer-son-voyage" className="inline-flex px-8 py-4 bg-pt-green font-semibold rounded-xl hover:bg-pt-green-dark">Démarrer — gratuit</Link>
          <p className="text-xs text-white/70 mt-4">Hébergé chez vous, plus de limite Base44 • Contrôle total</p>
        </div>
      </section>
    </div>
  )
}
