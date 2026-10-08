import { useState } from 'react'
import { Button, Card, SectionHeader } from '../design/ui.jsx'
import { offerLinks, stay22Url } from '../domain/offers.js'

/** Identifiant partenaire Stay22, fourni au moment de la compilation (VITE_STAY22_AID). */
const STAY22_AID = import.meta.env.VITE_STAY22_AID || ''

/**
 * « Meilleures offres » : recherches déjà remplies chez les partenaires et, si un identifiant Stay22
 * est configuré, carte interactive des hébergements. La carte n'est chargée qu'après un clic :
 * elle dépose des cookies tiers.
 */
export default function OffersPanel({ trip, travelers, vehicleSlug }) {
  const [mapOpen, setMapOpen] = useState(false)
  const args = {
    destinationName: trip?.destination?.name,
    start: trip?.dates?.start,
    end: trip?.dates?.end,
    travelers,
    vehicleSlug,
  }
  const links = offerLinks(args)
  const mapUrl = stay22Url({ aid: STAY22_AID, ...args })
  if (!links.length) return null

  return (
    <Card>
      <SectionHeader
        title="Meilleures offres"
        subtitle="Comparez les prix en direct chez nos partenaires, puis saisissez celui que vous retenez"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        {links.map((l) => (
          <Button
            key={l.id}
            variant="secondary"
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            iconRight="external"
            block
            aria-label={`${l.label} (${l.hint}) — s’ouvre dans un nouvel onglet`}
          >
            {l.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-pt-neutral/75 mt-2">
        Ces liens ouvrent le site du partenaire avec votre destination et vos dates. PlanTrip ne voit ni ne
        stocke les prix affichés chez eux.
      </p>
      {mapUrl && (
        <div className="mt-4">
          {mapOpen ? (
            <iframe
              title="Carte des hébergements disponibles (Stay22)"
              src={mapUrl}
              loading="lazy"
              className="w-full h-96 rounded-xl border border-pt-line"
            />
          ) : (
            <>
              <Button variant="primary" icon="map" onClick={() => setMapOpen(true)}>
                Afficher la carte des offres
              </Button>
              <p className="text-xs text-pt-neutral/75 mt-2">
                Cette carte est fournie par Stay22 et peut déposer des cookies. Elle ne se charge qu’après votre clic.
              </p>
            </>
          )}
        </div>
      )}
    </Card>
  )
}
