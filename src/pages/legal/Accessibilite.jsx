import SimplePage from '../SimplePage.jsx'
import { Icon } from '../../design/Icon.jsx'

const COMMITMENTS = [
  {
    title: 'Navigation au clavier',
    icon: 'checklist',
    text: 'Tous les éléments interactifs sont atteignables à la Tabulation, avec un anneau de focus visible en vert PlanTrip. Un lien d’évitement mène directement au contenu principal.',
  },
  {
    title: 'Structure et repères',
    icon: 'grid',
    text: 'Chaque page possède un unique titre principal, des régions ARIA (navigation, contenu principal) et des libellés explicites sur les formulaires et les boutons d’icônes.',
  },
  {
    title: 'Couleurs et contrastes',
    icon: 'eye',
    text: 'Le texte courant vise un rapport de contraste d’au moins 4,5:1 sur fond blanc ou crème. L’information n’est jamais portée par la couleur seule : les états sont doublés d’un libellé ou d’une icône.',
  },
  {
    title: 'Mouvement et animation',
    icon: 'refresh',
    text: 'Les transitions restent courtes (moins de 500 ms) et non indispensables à la compréhension. La préférence système « réduire les animations » est respectée.',
  },
  {
    title: 'Texte redimensionnable',
    icon: 'note',
    text: 'La mise en page supporte un zoom navigateur à 200 % sans perte de contenu ni de défilement horizontal, y compris sur mobile.',
  },
  {
    title: 'Contenus alternatifs',
    icon: 'map',
    text: 'Les cartes sont accompagnées d’une liste textuelle des étapes et de leur distance, pour être parcourues sans affichage graphique.',
  },
]

export default function Accessibilite() {
  return (
    <SimplePage
      title="Accessibilité"
      subtitle="Rendre PlanTrip utilisable par le plus grand nombre est un objectif de conception, pas une option."
      icon="users"
      eyebrow="Inclusion"
    >
      <div className="space-y-8 text-pt-neutral/75">
        <section>
          <h2 className="font-display font-semibold text-lg text-pt-neutral">Notre engagement</h2>
          <p className="mt-2">
            PlanTrip vise le niveau <strong>WCAG 2.1 niveau AA</strong> sur ses écrans publics et son espace
            voyageur. Le travail d’amélioration est continu : chaque nouvelle fonctionnalité est passée en revue
            avant d’être intégrée.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-lg text-pt-neutral">Ce qui est en place</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {COMMITMENTS.map((item) => (
              <li key={item.title} className="card p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pt-green-soft text-pt-green-ink">
                  <Icon name={item.icon} size={20} />
                </span>
                <h3 className="mt-3 font-display font-semibold text-pt-neutral">{item.title}</h3>
                <p className="mt-1.5 text-sm">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display font-semibold text-lg text-pt-neutral">Limites connues</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
            <li>
              La carte interactive Leaflet repose sur le survol et le glisser-déposer ; l’équivalent textuel est
              fourni sous forme de liste d’étapes, mais le zoom au clavier reste limité.
            </li>
            <li>
              Les graphiques de répartition budgétaire sont décrits en texte à côté du visuel, sans alternative
              data-table complète.
            </li>
            <li>La vérification automatique du contraste porte sur les composants du design system.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-pt-line bg-pt-cream p-5">
          <h2 className="font-display font-semibold text-lg text-pt-neutral">Signaler un obstacle</h2>
          <p className="mt-2">
            Un élément vous empêche d’avancer ? Décrivez la page, votre navigateur et votre technologie
            d’assistance à{' '}
            <a href="mailto:contact@plantrip.fr" className="text-pt-orange-ink font-semibold hover:underline">
              contact@plantrip.fr
            </a>
            . Chaque retour est traité comme un bug bloquant.
          </p>
        </section>
      </div>
    </SimplePage>
  )
}
