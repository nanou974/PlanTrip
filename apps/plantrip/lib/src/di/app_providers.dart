import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Câblage des dépendances de l'application.
///
/// C'est ici, et uniquement ici, que les implémentations concrètes
/// du package `infrastructure` seront reliées aux contrats attendus
/// par `presentation`, via des overrides de providers Riverpod.
///
/// Volontairement vide à ce stade : le domaine, les cas d'usage et
/// leurs implémentations n'existent pas encore. Cette liste sera
/// complétée lors de l'implémentation du domaine métier, sans que
/// `bootstrap.dart` n'ait besoin d'être modifié.
const List<Override> appProviderOverrides = <Override>[];
