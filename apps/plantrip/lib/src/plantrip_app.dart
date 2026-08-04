import 'package:flutter/material.dart';

/// Widget racine de PlanTrip.
///
/// Ne contient aucune logique métier ni aucun câblage de dépendances :
/// uniquement la configuration Material (thème, titre, écran initial).
class PlanTripApp extends StatelessWidget {
  const PlanTripApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PlanTrip',
      home: const _PlaceholderHome(),
    );
  }
}

/// Écran temporaire, en attendant que `NewTripScreen` (package
/// `presentation`) soit implémenté et branché ici.
class _PlaceholderHome extends StatelessWidget {
  const _PlaceholderHome();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('PlanTrip')),
      body: const Center(child: Text('Squelette du projet en place.')),
    );
  }
}
