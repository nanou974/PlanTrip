# domain

Le domaine contient exclusivement les concepts métier de PlanTrip
(entités, valeurs, contrats).

## A le droit de connaître

- Le langage Dart pur.

## N'a pas le droit de connaître

- Flutter, Drift, HTTP, Riverpod, ou toute autre technologie.
- Les autres packages du projet (`application`, `infrastructure`,
  `presentation`, `design_system`).

Toute dépendance technique doit être introduite dans `infrastructure`.
