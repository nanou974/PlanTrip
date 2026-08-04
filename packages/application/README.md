# application

`application` contient les cas d'usage de PlanTrip : l'orchestration
de la logique métier (validation, appels au domaine, persistance via
les contrats du domaine).

## A le droit de connaître

- `domain`.

## N'a pas le droit de connaître

- Flutter, Drift, HTTP, Riverpod.
- `infrastructure` (les implémentations concrètes des contrats).
- `presentation` (les écrans et widgets).

Un cas d'usage ne sait jamais *comment* une donnée est persistée ou
récupérée, seulement *que* le contrat du domaine le permet.
