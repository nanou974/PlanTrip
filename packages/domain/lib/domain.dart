/// Point d'entrée public du package `domain`.
///
/// Tout ce qui se trouve sous `src/` est un détail d'implémentation :
/// seul ce fichier doit être importé par les autres packages.
library domain;

export 'src/place/place.dart';
export 'src/place/location_search_service.dart';
export 'src/place/reverse_geocoding_service.dart';
export 'src/trip/trip.dart';
export 'src/trip/trip_repository.dart';
