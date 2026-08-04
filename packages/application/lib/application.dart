/// Point d'entrée public du package `application`.
///
/// Tout ce qui se trouve sous `src/` est un détail d'implémentation :
/// seul ce fichier doit être importé par les autres packages.
library application;

export 'package:result_dart/result_dart.dart' hide Failure;

export 'src/failure.dart';
export 'src/trip/create_trip_use_case.dart';
