import SimplePage from '../SimplePage.jsx'

export default function MentionsLegales() {
  return (
    <SimplePage
      title="Mentions légales"
      subtitle="Ce qu’il faut savoir sur l’éditeur, l’hébergement et la licence du service."
      icon="shield"
      eyebrow="Informations légales"
    >
      <div className="space-y-8 text-pt-neutral/75">
        <section>
          <h2 className="font-display font-semibold text-lg text-pt-neutral">Éditeur du site</h2>
          <p className="mt-2">
            PlanTrip est un projet open source édité dans le cadre de <strong>Projet Atlas</strong>. Il est
            diffusé publiquement et gratuitement, sans publicité, sans abonnement et sans carte bancaire.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li>
              Contact :{' '}
              <a href="mailto:contact@plantrip.fr" className="text-pt-orange-ink font-semibold hover:underline">
                contact@plantrip.fr
              </a>
            </li>
            <li>Dépôt de code : github.com/nanou974/PlanTrip</li>
            <li>Langue du service : français</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display font-semibold text-lg text-pt-neutral">Hébergement</h2>
          <p className="mt-2">
            PlanTrip est une application web statique : elle n’héberge aucune base de données. Le code compilé est
            servi depuis le dépôt public du projet. Aucune donnée de voyage n’est transmise à cet hébergement.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-lg text-pt-neutral">Licence et propriété intellectuelle</h2>
          <p className="mt-2">
            L’ensemble du code source est distribué sous licence <strong>MIT</strong>. Vous êtes libre de copier,
            modifier et rediffuser le projet, à condition de conserver la notice de licence et l’attribution
            d’origine.
          </p>
          <p className="mt-2">
            Le logo, les visuels et la charte graphique restent la propriété de leurs auteurs respectifs. Les
            données cartographiques proviennent d’<strong>OpenStreetMap</strong> et sont distribuées sous licence
            ODbL.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-lg text-pt-neutral">Responsabilité</h2>
          <p className="mt-2">
            Les distances, durées et coûts affichés sont des <strong>estimations</strong> calculées à partir de
            données publiques et de tarifs indicatifs. Ils ne remplacent ni un devis, ni un itinéraire de
            navigation, ni un conseil professionnel. La vérification des documents, assurances et autorisations de
            voyage reste à la charge de l’utilisateur.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-lg text-pt-neutral">Droit applicable</h2>
          <p className="mt-2">
            Le service est proposé selon le droit français. En cas de différend, une résolution amiable sera
            recherchée en priorité avant toute action contentieuse.
          </p>
        </section>
      </div>
    </SimplePage>
  )
}
