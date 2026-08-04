import 'src/bootstrap.dart';

/// Point d'entrée unique de l'application. Toute la configuration
/// (Riverpod, câblage des dépendances, widget racine) vit dans
/// `src/`, afin que ce fichier reste stable quel que soit le nombre
/// de fonctionnalités ajoutées par la suite.
void main() => bootstrap();
