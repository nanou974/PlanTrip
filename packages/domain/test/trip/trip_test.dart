import 'package:domain/domain.dart';
import 'package:test/test.dart';

Place _lisbonne() =>
    Place(name: 'Lisbonne', latitude: 38.7223, longitude: -9.1393);

void main() {
  group('Trip', () {
    test('se crée avec des dates nulles', () {
      final trip = Trip(
        id: 'trip-1',
        name: 'Lisbonne',
        destination: _lisbonne(),
        createdAt: DateTime(2026, 8, 4),
      );

      expect(trip.startDate, isNull);
      expect(trip.endDate, isNull);
    });

    test('se crée avec une seule date renseignée', () {
      final tripDepartSeul = Trip(
        id: 'trip-1',
        name: 'Lisbonne',
        destination: _lisbonne(),
        createdAt: DateTime(2026, 8, 4),
        startDate: DateTime(2026, 9, 1),
      );
      final tripRetourSeul = Trip(
        id: 'trip-2',
        name: 'Lisbonne',
        destination: _lisbonne(),
        createdAt: DateTime(2026, 8, 4),
        endDate: DateTime(2026, 9, 10),
      );

      expect(tripDepartSeul.startDate, DateTime(2026, 9, 1));
      expect(tripRetourSeul.endDate, DateTime(2026, 9, 10));
    });

    test('se crée quand la date de départ précède la date de retour', () {
      expect(
        () => Trip(
          id: 'trip-1',
          name: 'Lisbonne',
          destination: _lisbonne(),
          createdAt: DateTime(2026, 8, 4),
          startDate: DateTime(2026, 9, 1),
          endDate: DateTime(2026, 9, 10),
        ),
        returnsNormally,
      );
    });

    test('lève une ArgumentError si la date de départ suit la date de retour', () {
      expect(
        () => Trip(
          id: 'trip-1',
          name: 'Lisbonne',
          destination: _lisbonne(),
          createdAt: DateTime(2026, 8, 4),
          startDate: DateTime(2026, 9, 10),
          endDate: DateTime(2026, 9, 1),
        ),
        throwsArgumentError,
      );
    });

    test('deux voyages avec le même id sont égaux, même si le reste diffère', () {
      final a = Trip(
        id: 'trip-1',
        name: 'Lisbonne',
        destination: _lisbonne(),
        createdAt: DateTime(2026, 8, 4),
      );
      final b = Trip(
        id: 'trip-1',
        name: 'Lisbonne renommée',
        destination: Place(name: 'Porto', latitude: 41.1579, longitude: -8.6291),
        createdAt: DateTime(2026, 8, 5),
        startDate: DateTime(2026, 9, 1),
      );

      expect(a, equals(b));
      expect(a.hashCode, equals(b.hashCode));
    });

    test('deux voyages avec des id différents ne sont pas égaux, même identiques par ailleurs', () {
      final createdAt = DateTime(2026, 8, 4);
      final a = Trip(
        id: 'trip-1',
        name: 'Lisbonne',
        destination: _lisbonne(),
        createdAt: createdAt,
      );
      final b = Trip(
        id: 'trip-2',
        name: 'Lisbonne',
        destination: _lisbonne(),
        createdAt: createdAt,
      );

      expect(a, isNot(equals(b)));
    });
  });
}
