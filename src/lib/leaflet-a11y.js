/**
 * Donne un nom accessible à un marqueur Leaflet.
 *
 * Une icône `divIcon` rendue par Leaflet reçoit `role="button"` (option
 * `keyboard`) mais aucun texte : axe-core signale alors `aria-command-name`.
 * L'élément n'existe qu'à l'événement `add` (la carte n'est « prête » qu'après
 * `fitBounds`), d'où l'abonnement avant l'ajout + une application immédiate.
 *
 * @param {import('leaflet').Marker} marker
 * @param {string} label nom lisible par un lecteur d'écran
 */
export function labelMarker(marker, label) {
  const apply = () => marker.getElement()?.setAttribute('aria-label', label)
  marker.on('add', apply)
  apply()
}
