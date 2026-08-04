import 'trip.dart';

/// Accès à la persistance des voyages.
///
/// Contrat métier pur : aucune référence à une technologie de
/// persistance (Drift, SQLite, ou toute autre). Les implémentations
/// concrètes vivent exclusivement dans le package `infrastructure`,
/// qui est seul autorisé à connaître comment un [Trip] est
/// réellement stocké.
abstract interface class TripRepository {
  /// Persiste [trip].
  ///
  /// Si un voyage portant le même [Trip.id] existe déjà, il est
  /// remplacé : la persistance n'a pas à distinguer création et
  /// mise à jour, ce n'est pas sa responsabilité.
  ///
  /// Peut lever une exception en cas d'échec technique (ex. espace
  /// disque insuffisant). Ce n'est pas une erreur métier : c'est au
  /// use case appelant de la traduire en échec explicite avant
  /// qu'elle n'atteigne l'interface utilisateur.
  Future<void> save(Trip trip);
}
