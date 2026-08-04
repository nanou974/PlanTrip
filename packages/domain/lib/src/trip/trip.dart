import '../place/place.dart';

/// Un voyage : le point d'entrée de toute la préparation.
///
/// [Trip] est une entité, pas une valeur : son identité est portée
/// par [id]. Deux voyages partageant le même identifiant représentent
/// le même voyage, même si leur nom, leurs dates ou leur destination
/// évoluent ensuite — c'est pourquoi l'égalité ne porte que sur [id],
/// à la différence de [Place] qui est un Value Object.
final class Trip {
  /// Crée un voyage.
  ///
  /// Lève une [ArgumentError] si [startDate] et [endDate] sont tous
  /// deux renseignés et que [startDate] est postérieure à [endDate].
  /// Cette invariant protège l'entité elle-même : un [Trip] ne doit
  /// jamais pouvoir exister dans un état incohérent, quel que soit
  /// son point de construction. `CreateTripUseCase` vérifiera cette
  /// même règle en amont pour renvoyer un échec métier explicite —
  /// cette exception reste un filet de sécurité, pas le chemin
  /// attendu.
  Trip({
    required this.id,
    required this.name,
    required this.destination,
    required this.createdAt,
    this.startDate,
    this.endDate,
  }) {
    final start = startDate;
    final end = endDate;
    if (start != null && end != null && start.isAfter(end)) {
      throw ArgumentError(
        'La date de départ ($start) ne peut pas être postérieure '
        'à la date de retour ($end).',
      );
    }
  }

  /// Identifiant unique du voyage. Porte l'identité de l'entité.
  final String id;

  /// Nom du voyage, initialisé à partir de la destination puis
  /// librement modifiable par l'utilisateur.
  final String name;

  /// Destination du voyage.
  final Place destination;

  /// Date de départ, optionnelle : un voyage peut être créé avant
  /// que ses dates ne soient arrêtées.
  final DateTime? startDate;

  /// Date de retour, optionnelle pour la même raison.
  final DateTime? endDate;

  /// Date de création du voyage.
  final DateTime createdAt;

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Trip && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'Trip($id, $name)';
}
