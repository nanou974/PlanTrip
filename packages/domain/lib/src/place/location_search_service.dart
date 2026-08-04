import 'place.dart';

/// Recherche de lieux à partir d'un texte libre (ville, pays, région...).
///
/// Contrat métier pur : aucune référence à un fournisseur de
/// géocodage particulier (OpenStreetMap, Nominatim, ou autre). Les
/// implémentations concrètes vivent exclusivement dans le package
/// `infrastructure`.
abstract interface class LocationSearchService {
  /// Recherche les lieux correspondant à [query].
  ///
  /// Renvoie une liste vide si aucun lieu ne correspond — ce n'est
  /// pas un cas d'échec, seulement une recherche sans résultat.
  ///
  /// Peut lever une exception en cas d'échec technique (ex. réseau
  /// indisponible). Ce n'est pas une erreur métier : c'est à
  /// l'appelant de la traduire en échec explicite avant qu'elle
  /// n'atteigne l'interface utilisateur.
  Future<List<Place>> search(String query);
}
