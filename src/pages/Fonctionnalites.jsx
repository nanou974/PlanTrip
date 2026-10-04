const feats=[
  {title:"Adaptation véhicule",desc:"Chaque itinéraire est calculé selon hauteur, poids, vitesse, routes autorisées.",icon:"🚗"},
  {title:"Calcul d'itinéraire",desc:"Moteur puissant qui arbitre budget, envies et contraintes.",icon:"🧭"},
  {title:"Mode touristique",desc:"Routes pittoresques, villages, points de vue.",icon:"📸"},
  {title:"Mode économique",desc:"Réduit conso, péages, usure.",icon:"💸"},
  {title:"Mode rapide",desc:"Le plus rapide selon ton véhicule.",icon:"⚡"},
  {title:"Mode découverte",desc:"Détours et trésors cachés.",icon:"🧩"},
  {title:"Budget temps réel",desc:"Carburant, péages, hébergement, repas.",icon:"💰"},
  {title:"Navigation GPS",desc:"Vocale, 3D, alertes contextuelles.",icon:"📡"},
  {title:"Hors connexion",desc:"Vos voyages restent consultables et modifiables sans réseau.",icon:"📴"},
  {title:"Carnet de voyage",desc:"Photos, notes, souvenirs.",icon:"📖"},
  {title:"Export GPX/KML/PDF",desc:"Compatible GPS externes.",icon:"💾"},
  {title:"Collaboratif",desc:"Prépare à plusieurs en temps réel.",icon:"👥"},
]
export default function Fonctionnalites(){
  return (
    <div>
      <section className="py-16 bg-pt-cream text-center">
        <h1 className="hero-heading">Tout pour <span className="text-pt-orange-ink">voyager mieux</span></h1>
        <p className="text-pt-neutral/60 mt-4">12 fonctionnalités, 1 moteur : ton budget et ton véhicule décident.</p>
      </section>
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {feats.map(f=> (
            <div key={f.title} className="p-6 rounded-2xl border border-pt-line bg-pt-cream">
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="font-bold">{f.title}</h3>
              <p className="text-sm text-pt-neutral/60 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
