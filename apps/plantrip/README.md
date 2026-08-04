# plantrip

Application PlanTrip — composition root du projet.

## A le droit de connaître

- Toutes les couches (`domain`, `application`, `infrastructure`,
  `presentation`, `design_system`).

## N'a pas le droit de connaître

- Aucune couche ne dépend de `plantrip` en retour : c'est une
  extrémité du graphe de dépendances, jamais une origine.

C'est le seul module autorisé à relier `infrastructure` à
`presentation`, via le câblage Riverpod situé dans `lib/src/di/`.
