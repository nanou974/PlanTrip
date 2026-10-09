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
          <h2 className="font-display font-semibold text-lg text-pt-green-ink">Le principe</h2>
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
              <strong>OpenRouteService</strong> (HeiGIT) — calcul d’itinéraire routier. Les coordonnées des points
              de votre trajet, votre type de véhicule et vos options d’évitement sont envoyés au serveur PlanTrip,
              qui les transmet à ce service pour obtenir le tracé. Le serveur PlanTrip n’enregistre pas le trajet
              (simple mémoire temporaire pour éviter de recalculer deux fois le même).
            </li>
            <li>
              <strong>OSRM</strong> — calcul d’itinéraire de secours, appelé depuis votre navigateur si le service
              principal est indisponible. Les coordonnées des points de votre trajet sont envoyées pour obtenir le tracé.
            </li>
            <li>
              <strong>OpenStreetMap</strong> — affichage des tuiles cartographiques.
            </li>
            <li>
              <strong>Overpass (OpenStreetMap)</strong> - recherche d'hébergements le long de votre trajet, dont les aires de
              camping-car avec leur tarif et leurs services quand ils sont indiqués. La demande passe par le serveur de PlanTrip,
              qui interroge Overpass par zones géographiques d'environ 50 km de côté : ni votre adresse IP ni votre identité ne
              sont transmises à Overpass, et les points de votre itinéraire ne sont pas conservés. Les résultats par zone restent
              en mémoire du serveur quelques jours. Si le serveur est indisponible, votre navigateur interroge Overpass
              directement avec un échantillon de points de votre itinéraire. Données © contributeurs OpenStreetMap, licence
              ODbL.
            </li>
            <li>
              <strong>DATAtourisme</strong> — tarifs d’hébergement relevés près de votre destination et de vos étapes de nuit.
              La demande est faite par le serveur de PlanTrip : seules des coordonnées arrondies (environ 10 km) et le type
              d’hébergement sont transmises, jamais votre adresse IP ni votre identité. Données publiées sous Licence Ouverte
              Etalab 2.0 par les offices de tourisme et les hébergeurs. PlanTrip n’est ni affilié à DATAtourisme ni à ses
              producteurs, et ces derniers n’endossent pas le service.
            </li>
            <li>
              <strong>Stay22</strong> (optionnel) — carte d’hébergements « Meilleures offres ». Elle n’est chargée qu’après
              votre clic et peut déposer des cookies de suivi de réservation propres à ce partenaire. PlanTrip peut
              percevoir une commission si vous réservez.
            </li>
            <li>
              <strong>Liens vers Booking.com, Hotels.com, Airbnb, Campings.com, Park4night, Campercontact</strong> — de
              simples liens : votre destination, vos dates et le nombre de voyageurs figurent dans l’adresse ouverte. Aucune
              donnée n’est échangée avant que vous cliquiez.
            </li>
            <li>
              <strong>Google Fonts</strong> — polices Inter et Space Grotesk.
            </li>
          </ul>
          <p className="mt-3 text-sm">
            Aucun traceur d’analytics n’est utilisé. Les seuls cookies tiers possibles sont ceux de la carte Stay22,
            uniquement si vous choisissez de l’afficher.
          </p>
        </section>

        <section data-testid="sync-privacy">
          <h2 className="font-display font-semibold text-lg text-pt-neutral">Synchronisation et partage</h2>
          <p className="mt-2">
            Par défaut, vos voyages restent <strong>uniquement sur votre appareil</strong>. Si vous activez la
            synchronisation (avec votre compte, ou sans compte), une copie de vos voyages est enregistrée sur le serveur de
            PlanTrip pour que vous les retrouviez sur un autre appareil.
          </p>
          <ul className="mt-3 list-disc pl-5 space-y-1.5">
            <li>
              <strong>Sans compte</strong> : un espace anonyme est créé, protégé par une clé secrète longue et aléatoire
              que seul votre appareil connaît (le serveur n’en garde que l’empreinte). Le lien de reprise contient cette
              clé dans son fragment (après le <code>#</code>), que votre navigateur n’envoie jamais au serveur. Qui détient
              ce lien accède à vos voyages : ne le publiez pas. Sans lui, vos voyages ne sont pas récupérables.
            </li>
            <li>
              <strong>Contenu enregistré</strong> : les voyages tels que vous les avez saisis (lieux, dates, budget, notes,
              documents et listes de contrôle). Aucune adresse IP n’est associée à votre espace.
            </li>
            <li>
              <strong>Durée</strong> : un espace sans aucune synchronisation depuis 12 mois est supprimé automatiquement,
              avec ses voyages. Un voyage supprimé est retiré du serveur après avoir été signalé à vos appareils (au plus
              90 jours).
            </li>
            <li>
              <strong>Suppression</strong> : « Désactiver et effacer du serveur » (dans « Synchronisation et partage »)
              supprime immédiatement vos voyages et partages du serveur. Ils restent sur votre appareil.
            </li>
          </ul>
          <p className="mt-3">
            <strong>Liens de partage</strong> : un lien en lecture seule affiche un voyage à toute personne qui le possède.
            Notes, documents, listes de contrôle, dépenses et lieux de type « adresse personnelle » ne sont jamais
            partagés. Votre point de départ exact et le début du tracé sont masqués, sauf si vous cochez « Montrer mon
            point de départ exact ». Vous arrêtez un partage à tout moment ; le lien cesse alors de fonctionner. Ces pages
            ne sont pas référencées par les moteurs de recherche.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-lg text-pt-neutral">Cookies</h2>
          <p className="mt-2">
            PlanTrip ne dépose aucun cookie de mesure d’audience ni de publicité. Le stockage local du navigateur
            mémorise vos voyages (et, si vous activez la synchronisation sans compte, la clé de votre espace) ; il est
            supprimé lorsque vous effacez vos données depuis <strong>Mon profil</strong> ou les réglages de votre
            navigateur. Un cookie de session, nécessaire au fonctionnement, n’est déposé que si vous vous connectez.
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
