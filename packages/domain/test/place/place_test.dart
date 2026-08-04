import 'package:domain/domain.dart';
import 'package:test/test.dart';

void main() {
  group('Place', () {
    test('deux lieux avec les mêmes valeurs sont égaux', () {
      final a = Place(name: 'Lisbonne', latitude: 38.7223, longitude: -9.1393);
      final b = Place(name: 'Lisbonne', latitude: 38.7223, longitude: -9.1393);

      expect(a, equals(b));
      expect(a.hashCode, equals(b.hashCode));
    });

    test('deux lieux avec des coordonnées différentes ne sont pas égaux', () {
      final a = Place(name: 'Lisbonne', latitude: 38.7223, longitude: -9.1393);
      final b = Place(name: 'Lisbonne', latitude: 41.1579, longitude: -8.6291);

      expect(a, isNot(equals(b)));
    });

    test('deux lieux avec le même nom mais des pays différents ne sont pas égaux', () {
      final a = Place(
        name: 'Lisbonne',
        latitude: 38.7223,
        longitude: -9.1393,
        country: 'Portugal',
      );
      final b = Place(
        name: 'Lisbonne',
        latitude: 38.7223,
        longitude: -9.1393,
        country: null,
      );

      expect(a, isNot(equals(b)));
    });

    test('une latitude hors bornes lève une ArgumentError', () {
      expect(
        () => Place(name: 'Invalide', latitude: 91, longitude: 0),
        throwsArgumentError,
      );
      expect(
        () => Place(name: 'Invalide', latitude: -91, longitude: 0),
        throwsArgumentError,
      );
    });

    test('une longitude hors bornes lève une ArgumentError', () {
      expect(
        () => Place(name: 'Invalide', latitude: 0, longitude: 181),
        throwsArgumentError,
      );
      expect(
        () => Place(name: 'Invalide', latitude: 0, longitude: -181),
        throwsArgumentError,
      );
    });
  });
}
