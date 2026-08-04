import 'package:domain/domain.dart';
// `Failure` est masqué : result_dart définit sa propre classe du même
// nom pour représenter un résultat en échec. On garde volontairement
// le nom `Failure` pour notre modèle métier (c'est le terme demandé
// et le plus lisible dans ce contexte) et on utilise les extensions
// `toSuccess()` / `toFailure()` de result_dart, qui ne nécessitent
// jamais de référencer sa classe `Failure` directement.
import 'package:result_dart/result_dart.dart' hide Failure;

import '../failure.dart';

/// Génère un identifiant unique pour un nouveau voyage.
///
/// Injecté plutôt qu'appelé en dur : `CreateTripUseCase` reste
/// testable sans dépendre d'une bibliothèque de génération
/// d'identifiants, et la stratégie de génération reste remplaçable
/// sans modifier le use case.
typedef TripIdGenerator = String Function();

/// Fournit l'instant courant.
///
/// Injecté pour la même raison qu'[TripIdGenerator] : un use case ne
/// doit jamais appeler `DateTime.now()` directement, sous peine de
/// devenir impossible à tester de façon déterministe.
typedef Clock = DateTime Function();

/// Crée un voyage et le persiste.
///
/// Chemin normal de création d'un voyage : valide les règles
/// métier, construit l'entité et la persiste via [TripRepository].
/// Toute exception technique levée par les dépendances injectées est
/// interceptée ici et transformée en [Failure] — la Presentation ne
/// manipule donc jamais d'exception technique.
class CreateTripUseCase {
  const CreateTripUseCase({
    required TripRepository tripRepository,
    required TripIdGenerator generateId,
    required Clock now,
  })  : _tripRepository = tripRepository,
        _generateId = generateId,
        _now = now;

  final TripRepository _tripRepository;
  final TripIdGenerator _generateId;
  final Clock _now;

  /// Exécute le cas d'usage.
  ///
  /// [name] est déjà le nom final voulu par l'utilisateur (pré-rempli
  /// puis éventuellement modifié côté Presentation) : ce use case ne
  /// connaît pas la notion de pré-remplissage, qui relève de
  /// l'expérience utilisateur et non du métier.
  ///
  /// La validation de la cohérence des dates est faite ici, avant de
  /// construire l'entité, afin de renvoyer un [InvalidDateRangeFailure]
  /// explicite plutôt que de laisser l'exception de garde de [Trip]
  /// remonter jusqu'à l'appelant. Cette exception reste néanmoins en
  /// place dans [Trip] comme filet de sécurité, conformément au
  /// principe validé : les entités protègent leurs propres invariants.
  Future<Result<Trip, Failure>> call({
    required String name,
    required Place destination,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
      return InvalidDateRangeFailure(
        startDate: startDate,
        endDate: endDate,
      ).toFailure();
    }

    final trip = Trip(
      id: _generateId(),
      name: name,
      destination: destination,
      createdAt: _now(),
      startDate: startDate,
      endDate: endDate,
    );

    try {
      await _tripRepository.save(trip);
    } catch (error) {
      return TripPersistenceFailure(error).toFailure();
    }

    return trip.toSuccess();
  }
}
