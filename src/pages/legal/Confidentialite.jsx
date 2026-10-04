import SimplePage from '../SimplePage.jsx'

export default function Confidentialite() {
  return (
    <SimplePage
      title="Confidentialité"
      subtitle="Vos voyages ne quittent pas votre appareil. Voici exactement ce qui se passe."
      icon="lock"
      eyebrow="Vos données"
    >
      <div className="space-y-8 text-pt-neutral/75">
        <section className="rounded-2xl border border-pt-green/20 bg-pt-green-soft p-5">
          <h2 className="font-display font-semibold text-lg text-pt-green">Le principe</h2>
          <p className="mt-2 text-pt-neutral/80">
            PlanTrip n’a aucun compte serveur, aucune base de données distante et aucun outil de suivi
            d’audience. Voyages, budgets, documents et checklists sont enregistrés dans le{' '}
            <strong>stockage local de votre navigateur</strong> et n’envoient rien à un serveur applicatif.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-lg text-pt-neutral">Ce qui est conservé localement</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Vos voyages : itinéraire, dates, budget, lieux, documents, checklists, notes.</li>
            <li>Votre profil et vos préférences (véhicule, priorités, rappels).</li>
            <li>Votre session, si vous avez choisi de rester connecté sur cet appareil.</li>
            <li>Vos favoris et vos quelques statistiques d’usage, pour personnaliser les propositions.</li>
          </ul>
          <p className="mt-3 text-sm">
            Tout est réversible : depuis <strong>Mon profil</strong>, vous pouvez exporter l’ensemble de vos
            données en JSON, les réimporter, ou tout effacer définitivement.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-lg text-pt-neutral">Services tiers appelés</h2>
          <p className="mt-2">
            Certaines fonctionnalités ont besoin de données publiques externes. Elles sont appelées uniquement
            lorsque vous les utilisez :
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
            <li>
              <strong>Photon (komoot.io)</strong> — recherche de villes et d’adresses. La requête contient votre
              mot-clé de recherche, rien d’autre.
            </li>
            <li>
              <strong>OSRM</strong> — calcul d’itinéraire routier. Les coordonnées des points de votre trajet sont
              envoyées pour obtenir le tracé.
            </li>
            <li>
              <strong>OpenStreetMap</strong> — affichage des tuiles cartographiques.
            </li>
            <li>
              <strong>Google Fonts</strong> — polices Inter et Space Grotesk.
            </li>
          </ul>
          <p className="mt-3 text-sm">
            Aucun compte, aucun cookie publicitaire, aucun traceur d’analytics n’est utilisé.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-lg text-pt-neutral">Cookies</h2>
          <p className="mt-2">
            PlanTrip ne dépose aucun cookie de mesure d’audience ni de publicité. Seul le stockage local du
            navigateur est utilisé pour mémoriser vos voyages ; il est supprimé lorsque vous effacez vos données
            depuis <strong>Mon profil</strong> ou les réglages de votre navigateur.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-lg text-pt-neutral">Vos droits</h2>
          <p className="mt-2">
            Comme aucune donnée personnelle n’est traitée par un responsable de traitement, il n’existe pas de
            registre à consulter. Concrètement, vous disposez d’un droit d’accès, de rectification et
            d’effacement <strong>direct et immédiat</strong> : tout se passe sur votre appareil.
          </p>
          <p className="mt-2">
            Une question ? Écrivez-nous à{' '}
            <a href="mailto:contact@plantrip.fr" className="text-pt-orange-ink font-semibold hover:underline">
              contact@plantrip.fr
            </a>
            .
          </p>
        </section>
      </div>
    </SimplePage>
  )
}
