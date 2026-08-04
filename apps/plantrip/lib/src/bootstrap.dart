import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'di/app_providers.dart';
import 'plantrip_app.dart';

/// Démarre l'application.
///
/// Isolé de `main.dart` pour que le point d'entrée reste minimal et
/// que cette fonction puisse évoluer (initialisation de services,
/// gestion d'erreurs globale, etc.) sans toucher au fichier d'entrée.
void bootstrap() {
  WidgetsFlutterBinding.ensureInitialized();

  runApp(
    const ProviderScope(
      overrides: appProviderOverrides,
      child: PlanTripApp(),
    ),
  );
}
