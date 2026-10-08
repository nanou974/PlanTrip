import { Link } from 'react-router-dom'
import SimplePage from './SimplePage.jsx'

const QUESTIONS = [
  {
    q: 'Pourquoi éviter les ponts ?',
    a: (
      <>
        Le gabarit de votre véhicule impose des hauteurs et des poids maximaux. Pour un
        camping-car ou un van, le calcul d’itinéraire applique la hauteur et le poids de la fiche
        véhicule ; si le service principal est indisponible, le tracé de secours ne les applique
        pas et PlanTrip vous le signale.
      </>
    ),
  },
  {
    q: 'Comment le budget est-il calculé ?',
    a: (
      <>
        Carburant (consommation réelle × distance), péages, stationnement, hébergement et activités.
        Les repas ne sont pas budgétés. Le total se met à jour quand vous choisissez ou saisissez un hébergement.
      </>
    ),
  },
  {
    q: 'Quel mode de calcul choisir ?',
    a: (
      <>
        Quatre modes sont disponibles : <strong>touristique</strong> (routes pittoresques,
        villages, points de vue), <strong>économique</strong> (conso, péages, usure),
        <strong> rapide</strong> et <strong>découverte</strong> (détours et trésors cachés).
        Chaque mode repose sur le même calculateur : c'est votre véhicule et votre budget qui
        arbitrent.
      </>
    ),
  },
  {
    q: 'Ça fonctionne hors connexion ?',
    a: (
      <>
        Oui : après une première visite, PlanTrip s'ouvre sans réseau. Voyages, documents et
        checklists restent consultables, modifiables et exportables en GPX depuis votre
        appareil. La recherche d'adresses, le calcul d'itinéraire, les hébergements et les
        fonds de carte nécessitent Internet — l'application le signale alors dans l'écran.
      </>
    ),
  },
  {
    q: 'Faut-il un compte pour préparer un voyage ?',
    a: (
      <>
        Non. Le planificateur, les voyages, le budget et les checklists fonctionnent sans
        compte : tout reste dans le navigateur de votre appareil. Le compte local sert
        seulement à mémoriser votre profil (nom, e-mail, préférences) sur cet appareil.
      </>
    ),
  },
  {
    q: 'Mon mot de passe est-il protégé ?',
    a: (
      <>
        Il n'est jamais écrit en clair : il est dérivé par PBKDF2-SHA256 avec un sel propre à
        votre compte, dans le stockage local de l'appareil. Cela protège un vol de la base du
        navigateur, pas un appareil déjà ouvert — l'authentification vérifiée côté serveur
        (lien magique envoyé par e-mail) est prévue avec le backend.
      </>
    ),
  },
  {
    q: 'Où sont mes données, puis-je les exporter ?',
    a: (
      <>
        Voyages, budget, documents et profil sont enregistrés dans le stockage local du
        navigateur : le serveur PlanTrip ne les enregistre pas. Depuis <strong>Mon profil</strong>,
        vous exportez tout en JSON, vous réimportez une sauvegarde ou vous effacez
        définitivement. Le calcul d'itinéraire transite par le serveur PlanTrip jusqu'à
        OpenRouteService (secours : OSRM) ; la recherche d'adresses et les cartes appellent Photon et
        OpenStreetMap, uniquement quand vous les utilisez — voir la{' '}
        <Link to="/confidentialite" className="text-pt-orange-ink font-semibold hover:underline">
          politique de confidentialité
        </Link>
        .
      </>
    ),
  },
  {
    q: 'PlanTrip est-il gratuit ?',
    a: (
      <>
        Oui, entièrement. Pas de carte bancaire, pas de version premium cachée.
      </>
    ),
  },
  {
    q: 'PlanTrip est-il accessible ?',
    a: (
      <>
        L'objectif est le niveau WCAG 2.1 AA : navigation au clavier, contrastes vérifiés,
        libellés de formulaire explicites et alternative textuelle à la carte. L'état
        détaillé et les limites connues sont dans la page{' '}
        <Link to="/accessibilite" className="text-pt-orange-ink font-semibold hover:underline">
          Accessibilité
        </Link>
        .
      </>
    ),
  },
  {
    q: 'J’ai trouvé un bug ou une idée : où l’envoyer ?',
    a: (
      <>
        Écrivez-nous depuis la page{' '}
        <Link to="/contact" className="text-pt-orange-ink font-semibold hover:underline">
          Contact
        </Link>
        , avec la page concernée et votre navigateur. Un problème d'accessibilité est traité
        comme un bug bloquant.
      </>
    ),
  },
]

export default function Faq() {
  return (
    <SimplePage
      title="Questions fréquentes"
      subtitle="Tout ce qu'il faut savoir avant de construire votre voyage."
      icon="help"
      eyebrow="Aide"
    >
      <ul className="space-y-5">
        {QUESTIONS.map((item) => (
          <li key={item.q} className="rounded-2xl border border-pt-line bg-pt-cream p-4 sm:p-5">
            <h2 className="font-display font-semibold text-pt-neutral">{item.q}</h2>
            <p className="text-pt-neutral/80 mt-1.5 text-[15px] leading-relaxed">{item.a}</p>
          </li>
        ))}
      </ul>
    </SimplePage>
  )
}
