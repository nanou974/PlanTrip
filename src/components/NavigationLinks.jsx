import { useMemo } from 'react'
import { Button } from '../design/ui.jsx'
import { intermediatePoints, navigationLinks } from '../domain/navigation.js'

/**
 * Ouvre le trajet dans Google Maps (avec les étapes), Waze ou Apple Plans.
 * `constrained` : véhicule à gabarit (hauteur / poids) que les applications grand public ignorent.
 */
export default function NavigationLinks({
  departure,
  destination,
  places = [],
  nightStops = [],
  coordinates = [],
  returnTrip = false,
  constrained = false,
}) {
  const waypoints = useMemo(
    () => intermediatePoints({ places, nightStops, coordinates }),
    [places, nightStops, coordinates],
  )
  const outbound = useMemo(() => navigationLinks({ departure, destination, waypoints }), [departure, destination, waypoints])
  const back = useMemo(
    () => (returnTrip ? navigationLinks({ departure, destination, waypoints, reverse: true }) : null),
    [returnTrip, departure, destination, waypoints],
  )

  if (!outbound.google) {
    return <p className="text-sm text-pt-neutral/75">Coordonnées manquantes : navigation GPS indisponible.</p>
  }

  const link = { target: '_blank', rel: 'noreferrer' }
  const group = (label, links, testId) => (
    <div className="grid gap-2" data-testid={testId}>
      {returnTrip && <p className="text-sm font-semibold text-pt-neutral">{label}</p>}
      <Button href={links.google} {...link} variant="primary" icon="navigation" block>
        Ouvrir dans Google Maps
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button href={links.waze} {...link} variant="secondary" icon="navigation" block>
          Waze
        </Button>
        <Button href={links.apple} {...link} variant="secondary" icon="navigation" block>
          Apple Plans
        </Button>
      </div>
    </div>
  )

  return (
    <div className="grid gap-3" data-testid="navigation-links">
      {group('Aller', outbound, 'nav-outbound')}
      {back && group('Retour', back, 'nav-return')}
      <p className="text-xs text-pt-neutral/75" data-testid="navigation-note">
        {outbound.waypointCount > 0
          ? `Google Maps reprend vos étapes (${outbound.waypointCount})${outbound.truncated ? ', réduites à 9 au maximum' : ''}. `
          : ''}
        Waze et Apple Plans n’acceptent que la destination et guident depuis votre position. Chaque application recalcule
        son propre itinéraire : il peut différer de celui de PlanTrip.
        {constrained && ' Elles ignorent la hauteur et le poids de votre véhicule : vérifiez les ponts et limitations sur le trajet.'}
      </p>
    </div>
  )
}
