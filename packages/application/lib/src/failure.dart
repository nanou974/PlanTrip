/// Échec métier ou technique renvoyé par un cas d'usage de PlanTrip.
///
/// Type scellé : la couche Presentation peut traiter chaque variante
/// de façon exhaustive (`switch`), sans jamais manipuler une
/// exception technique brute — conformément à la règle validée :
/// aucune exception technique ne doit atteindre la Presentation.
sealed class Failure {
  const Failure(this.message);

  /// Message par défaut, destiné à être adapté par l'interface : ce
  /// n'est pas nécessairement le texte affiché à l'utilisateur.
  final String message;
}

/// La date de départ est postérieure à la date de retour.
final class InvalidDateRangeFailure extends Failure {
  const InvalidDateRangeFailure({
    required this.startDate,
    required this.endDate,
  }) : super(
          'La date de départ ne peut pas être postérieure '
          'à la date de retour.',
        );

  final DateTime startDate;
  final DateTime endDate;
}

/// La persistance du voyage a échoué pour une raison technique.
///
/// [cause] conserve l'exception d'origine pour le diagnostic
/// (journalisation) ; elle ne doit jamais être affichée telle quelle
/// à l'utilisateur.
final class TripPersistenceFailure extends Failure {
  const TripPersistenceFailure([this.cause])
      : super("Le voyage n'a pas pu être enregistré.");

  final Object? cause;
}
