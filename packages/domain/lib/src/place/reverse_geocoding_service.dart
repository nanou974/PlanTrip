import 'place.dart';

/// Résolution d'un lieu à partir de coordonnées géographiques.
///
/// Utilisé lorsque l'utilisateur désigne une destination en touchant
/// directement la carte plutôt qu'en la recherchant par texte.
///
/// Contrat métier pur : aucune référence à un fournisseur de
/// géocodage particulier (OpenStreetMap, Nominatim, ou autre). Les
/// implémentations concrètes vivent exclusivement dans le package
/// `infrastructure`.
abstract interface class ReverseGeocodingService {
  /// Résout le lieu situé aux coordonnées ([latitude], [longitude]).
  ///
  /// Renvoie `null` si aucun lieu nommé n'est trouvé à ces
  /// coordonnées (ex. en pleine mer) — ce n'est pas un cas d'échec,
  /// seulement une résolution sans résultat.
  ///
  /// Peut lever une exception en cas d'échec technique (ex. réseau
  /// indisponible). Comme pour les autres services du domaine, cette
  /// exception ne doit jamais atteindre la couche Presentation : le
  /// use case appelant est responsable de l'intercepter et de la
  /// transformer en échec explicite (`Result`/`Failure`).
  Future<Place?> resolve({
    required double latitude,
    required double longitude,
  });
}
