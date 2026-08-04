import 'package:application/application.dart';
import 'package:domain/domain.dart';
import 'package:test/test.dart';

/// Faux repository en mémoire, utilisé uniquement pour ces tests.
///
/// Permet de vérifier que le use case appelle bien la persistance
/// (ou ne l'appelle pas, en cas d'échec de validation) sans dépendre
/// d'une implémentation technique réelle (Drift).
class _InMemoryTripRepository implements TripRepository {
  final List<Trip> savedTrips = [];

  /// Si renseignée, `save` lève cette erreur au lieu de persister —
  /// simule un échec technique (ex. disque plein).
  Object? errorToThrow;

  @override
  Future<void> save(Trip trip) async {
    final error = errorToThrow;
    if (error != null) {
      throw error;
    }
    savedTrips.add(trip);
  }
}

Place _lisbonne() =>
    Place(name: 'Lisbonne', latitude: 38.7223, longitude: -9.1393);

void main() {
  late _InMemoryTripRepository repository;
  late CreateTripUseCase useCase;
  final fixedNow = DateTime(2026, 8, 4);

  setUp(() {
    repository = _InMemoryTripRepository();
    useCase = CreateTripUseCase(
      tripRepository: repository,
      generateId: () => 'trip-fixe',
      now: () => fixedNow,
    );
  });

  group('CreateTripUseCase', () {
    test('crée et persiste un voyage sans dates', () async {
      final result = await useCase(name: 'Lisbonne', destination: _lisbonne());

      expect(result.isSuccess(), isTrue);
      final trip = result.getOrNull()!;
      expect(trip.id, 'trip-fixe');
      expect(trip.name, 'Lisbonne');
      expect(trip.createdAt, fixedNow);
      expect(trip.startDate, isNull);
      expect(trip.endDate, isNull);
      expect(repository.savedTrips, [trip]);
    });

    test('crée et persiste un voyage avec des dates cohérentes', () async {
      final start = DateTime(2026, 9, 1);
      final end = DateTime(2026, 9, 10);

      final result = await useCase(
        name: 'Lisbonne',
        destination: _lisbonne(),
        startDate: start,
        endDate: end,
      );

      expect(result.isSuccess(), isTrue);
      expect(repository.savedTrips.single.startDate, start);
      expect(repository.savedTrips.single.endDate, end);
    });

    test(
      'renvoie InvalidDateRangeFailure si le départ suit le retour, '
      'sans appeler le repository',
      () async {
        final start = DateTime(2026, 9, 10);
        final end = DateTime(2026, 9, 1);

        final result = await useCase(
          name: 'Lisbonne',
          destination: _lisbonne(),
          startDate: start,
          endDate: end,
        );

        expect(result.isFailure(), isTrue);
        expect(result.exceptionOrNull(), isA<InvalidDateRangeFailure>());
        expect(repository.savedTrips, isEmpty);
      },
    );

    test(
      'renvoie TripPersistenceFailure si le repository échoue, '
      "sans laisser fuir l'exception d'origine",
      () async {
        final technicalError = Exception('disque plein');
        repository.errorToThrow = technicalError;

        final result =
            await useCase(name: 'Lisbonne', destination: _lisbonne());

        expect(result.isFailure(), isTrue);
        final failure = result.exceptionOrNull();
        expect(failure, isA<TripPersistenceFailure>());
        expect(
          (failure! as TripPersistenceFailure).cause,
          same(technicalError),
        );
      },
    );
  });
}
