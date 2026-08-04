# infrastructure

`infrastructure` fournit les implémentations techniques des contrats
définis par `domain` : persistance locale (Drift) et résolution de
lieux (OpenStreetMap / Nominatim / Photon).

## A le droit de connaître

- `domain` (les contrats qu'elle implémente).
- Les bibliothèques techniques nécessaires (Drift, http, etc.).

## N'a pas le droit de connaître

- `application` (les cas d'usage).
- `presentation` (les écrans et widgets).

C'est le seul endroit du projet où les noms « Drift » ou
« OpenStreetMap » doivent apparaître dans le code.
