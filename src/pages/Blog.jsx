import { Link } from 'react-router-dom'
import SimplePage from './SimplePage.jsx'

const ARTICLES = [
  {
    tag: 'Préparation',
    title: 'Van, camping-car ou voiture : ce que le gabarit change vraiment',
    lead: "Une hauteur sous 2 m ne roule pas partout. Avant de choisir un itinéraire, le gabarit décide de ce qui est possible.",
    body: [
      "Ponts bas, passages étroits, routes interdites aux poids lourds : la contrainte n'est pas anecdotique, elle supprime des tracés entiers. PlanTrip prend hauteur, largeur, poids et vitesse de votre véhicule pour écarter les routes incompatibles avant de calculer.",
      "Concrètement : renseignez votre véhicule une seule fois, puis cochez les options qui comptent pour vous (péages, autoroutes, voies étroites). Le résultat affiche toujours ce qui a été filtré — et pourquoi.",
    ],
    link: { label: 'Choisir mon véhicule', to: '/vehicules' },
  },
  {
    tag: 'Calcul d’itinéraire',
    title: 'Touristique, économique, rapide ou découverte : quel mode choisir',
    lead: "Quatre mots sur les boutons, un seul moteur derrière : votre budget et votre véhicule tranchent.",
    body: [
      "Le mode touristique cherche les routes pittoresques, les villages et les points de vue. L'économique réduit conso, péages et usure. Le rapide s'appuie sur les temps de parcours. La découverte autorise les détours qui ne figurent sur aucune liste.",
      "Aucun mode ne promet l'impossible : si le budget indique 400 € pour 2 000 km, le calcul le rappelle. Les quatre modes restent modifiables à tout moment depuis l'écran de résultat.",
    ],
    link: { label: 'Voir les fonctionnalités', to: '/fonctionnalites' },
  },
  {
    tag: 'Hors connexion',
    title: 'Partir sans réseau : ce qui marche, ce qui attend le retour du réseau',
    lead: "Le mode hors connexion est réel, mais il a des limites — mieux vaut les connaître avant de monter dans le van.",
    body: [
      "Après une première visite, PlanTrip s'ouvre sans réseau : voyages, dates, budget, documents, checklists restent consultables et modifiables, et l'export GPX fonctionne depuis l'appareil.",
      "En revanche, la recherche d'adresses, le calcul d'itinéraire, les hébergements et le téléchargement des fonds de carte nécessitent Internet. L'application l'affiche dans l'écran quand c'est le cas. Astuce : préparez votre itinéraire et vos lieux avant de partir — tout est ensuite conservé localement.",
    ],
    link: { label: 'Préparer mon voyage', to: '/preparer-son-voyage' },
  },
]

export default function Blog() {
  return (
    <SimplePage
      title="Blog"
      subtitle="Guides pratiques, astuces d'itinéraire et idées de séjour."
      icon="note"
      eyebrow="Ressources"
    >
      <div className="space-y-8">
        <p className="text-pt-neutral/70">
          Des articles courts, écrits autour de ce que PlanTrip fait vraiment : gabarit,
          budget, modes de calcul et préparation hors connexion.
        </p>

        {ARTICLES.map((article) => (
          <article key={article.title} className="rounded-2xl border border-pt-line bg-pt-cream p-5 sm:p-6">
            <span className="eyebrow">{article.tag}</span>
            <h2 className="mt-3 font-display text-xl font-bold text-pt-neutral">{article.title}</h2>
            <p className="mt-2 font-medium text-pt-neutral/80">{article.lead}</p>
            {article.body.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-pt-neutral/80">
                {paragraph}
              </p>
            ))}
            <Link
              to={article.link.to}
              className="mt-4 inline-flex items-center gap-1.5 font-semibold text-pt-orange-ink hover:underline"
            >
              {article.link.label} →
            </Link>
          </article>
        ))}
      </div>
    </SimplePage>
  )
}
