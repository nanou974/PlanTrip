# presentation

`presentation` contient les écrans, controllers et widgets de
PlanTrip.

## A le droit de connaître

- `domain`.
- `application` (les cas d'usage qu'elle invoque).
- `design_system` (les tokens visuels qu'elle utilise).

## N'a pas le droit de connaître

- `infrastructure` : la présentation ne connaît jamais une
  implémentation technique concrète, seulement les contrats exposés
  par `domain` et les cas d'usage exposés par `application`. Le
  câblage entre `presentation` et `infrastructure` se fait uniquement
  dans `apps/plantrip`.
