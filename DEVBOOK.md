# Vision

Projet Atlas n'est pas un simple projet logiciel.

C'est un écosystème.

PlanTrip est sa première application.

D'autres applications pourront voir le jour dans le futur tout en partageant la même architecture, les mêmes valeurs et la même identité.

Le but n'est pas d'accumuler des fonctionnalités.

Le but est de construire un ensemble cohérent d'outils qui servent réellement leurs utilisateurs.

---

# Vision de PlanTrip

PlanTrip est une plateforme de préparation de voyage.

Son objectif est de permettre à chacun d'organiser ses vacances simplement, quel que soit :

- son véhicule ;
- son budget ;
- son niveau d'expérience ;
- sa destination.

Le projet ne cherche pas à privilégier une façon de voyager.

Toutes les formes de mobilité sont les bienvenues.

---

# Objectifs du projet

PlanTrip poursuit plusieurs objectifs.

## Accessibilité

Le service doit rester accessible au plus grand nombre.

Le choix du véhicule ne doit jamais être une limitation.

---

## Simplicité

Chaque fonctionnalité doit pouvoir être comprise rapidement.

L'interface doit accompagner l'utilisateur sans le submerger.

---

## Gratuité

Le projet est conçu avec la volonté de rester le plus accessible possible.

Les décisions techniques et fonctionnelles devront toujours respecter cette philosophie.

---

## Pérennité

L'architecture doit pouvoir évoluer pendant de nombreuses années.

Aucun choix technique ne doit enfermer durablement le projet.

---

## Modularité

Chaque composant doit avoir une responsabilité claire.

Le couplage entre les modules doit être limité autant que possible.

---

# Ce que PlanTrip n'est pas

PlanTrip n'a pas vocation à devenir :

- un réseau social ;
- une plateforme publicitaire ;
- un comparateur commercial ;
- une application surchargée de fonctionnalités inutiles.

Chaque nouvelle fonctionnalité devra répondre à un besoin réel identifié.

---

# Les valeurs du développement

Avant d'écrire du code, nous écrivons de la documentation.

Avant de choisir une technologie, nous définissons le besoin.

Avant d'optimiser, nous validons le fonctionnement.

Avant d'ajouter une fonctionnalité, nous nous demandons si elle apporte une réelle valeur.

Le développement suit toujours cet ordre :

Vision

↓

Architecture

↓

Documentation

↓

Prototype

↓

Développement

↓

Tests

↓

Validation

↓

Publication

---

# Les piliers de Projet Atlas

Projet Atlas repose sur quatre piliers.

## Une architecture robuste

Le projet doit rester compréhensible.

Chaque composant possède une responsabilité claire.

---

## Une documentation vivante

La documentation fait partie intégrante du projet.

Elle évolue avec lui.

Un code sans documentation est considéré comme incomplet.

---

## Une identité forte

Projet Atlas ne construit pas seulement des logiciels.

Il construit une identité.

Cette identité se retrouve :

- dans la documentation ;
- dans les illustrations ;
- dans les applications ;
- dans le site web ;
- dans les outils internes.

---

## Une évolution maîtrisée

Chaque évolution doit améliorer le projet sans remettre en cause ses fondations.

L'architecture évolue.

Les principes restent.

# Architecture générale

L'architecture de Projet Atlas repose sur un principe simple :

**Chaque couche possède une responsabilité unique.**

Une couche ne doit jamais connaître les détails d'implémentation des autres couches.

Cette séparation garantit :

- une meilleure maintenabilité ;
- une meilleure évolutivité ;
- des tests plus simples ;
- un code plus lisible.

---

# Principes architecturaux

L'architecture repose sur plusieurs principes.

## Séparation des responsabilités

Chaque module possède une responsabilité clairement définie.

Aucun composant ne doit effectuer plusieurs rôles simultanément.

---

## Couplage faible

Les dépendances entre les modules doivent rester limitées.

Chaque module doit pouvoir évoluer indépendamment.

---

## Forte cohésion

Les éléments appartenant au même module doivent travailler ensemble autour d'un objectif commun.

---

## Évolutivité

L'architecture doit permettre l'ajout de nouvelles fonctionnalités sans remise en cause des fondations existantes.

---

## Testabilité

Chaque composant doit pouvoir être testé de manière indépendante.

Les dépendances seront injectées afin de faciliter les tests.

---

# Architecture globale

Projet Atlas est organisé autour de plusieurs grandes briques.

```text
Utilisateur

↓

Frontend

↓

API

↓

Services Métier

↓

Persistance

↓

Base de données
```

Chaque couche ne dialogue qu'avec la couche immédiatement inférieure.

Aucune couche ne doit contourner cette règle.

---

# Architecture modulaire

Le projet est conçu sous forme de modules.

Chaque module doit être :

- autonome ;
- documenté ;
- testable ;
- réutilisable.

L'objectif est de limiter les dépendances entre les différentes parties du projet.

---

# Architecture orientée domaine

Le domaine métier constitue le cœur du projet.

Les choix techniques gravitent autour de lui.

Jamais l'inverse.

Une technologie pourra être remplacée.

Le métier, lui, doit rester stable.

---

# Offline First

PlanTrip doit être pensé dès le départ pour fonctionner même avec une connexion limitée.

Le fonctionnement local est privilégié.

La synchronisation avec le serveur intervient lorsque cela est nécessaire.

Cette approche améliore :

- la résilience ;
- les performances perçues ;
- le confort d'utilisation en voyage.

---

# API First

Toutes les fonctionnalités importantes transitent par une API clairement définie.

Les applications clientes ne doivent jamais accéder directement aux données.

Cette règle garantit :

- une meilleure sécurité ;
- une meilleure évolutivité ;
- la possibilité de développer plusieurs applications clientes.

---

# Documentation First

Une fonctionnalité importante commence toujours par une documentation.

Avant toute implémentation, il convient de définir :

- le besoin ;
- les contraintes ;
- les impacts ;
- les choix retenus.

Le code devient alors la conséquence naturelle d'une réflexion déjà menée.

---

# Convention générale

Avant toute évolution importante, le développeur doit pouvoir répondre clairement aux questions suivantes :

- Quel problème résolvons-nous ?
- Pourquoi cette solution est-elle retenue ?
- Existe-t-il une solution plus simple ?
- Quels sont les impacts sur l'architecture ?
- Cette décision restera-t-elle pertinente dans cinq ou dix ans ?

Si une réponse n'est pas claire, la conception doit être poursuivie avant d'écrire la moindre ligne de code.

# Structure du dépôt

L'organisation du dépôt fait partie intégrante de l'architecture.

Chaque dossier possède une responsabilité clairement définie.

Aucun dossier ne doit devenir un espace fourre-tout.

La structure doit rester compréhensible, même pour une personne découvrant le projet plusieurs années après sa création.

---

# Arborescence générale

```text
PlanTrip/

├── START_HERE.md
├── README.md
├── MANIFESTO.md
├── FOUNDING_PRINCIPLES.md
├── ARCHITECTURAL_VALUES.md
├── DevBook.md
├── PROJECT_CHRONICLES.md
├── ROADMAP.md
├── CONTRIBUTING.md
├── GOVERNANCE.md
├── LICENSE
│
├── apps/
├── packages/
├── docs/
├── assets/
├── workshop/
├── scripts/
├── tests/
└── tools/
```

Chaque élément de cette structure répond à une mission précise.

---

# Les documents racine

Les documents situés à la racine du dépôt constituent la **Bibliothèque Atlas**.

Ils représentent la porte d'entrée du projet.

Chaque document répond à une seule question.

| Document | Question |
|----------|----------|
| START_HERE.md | Comment découvrir le projet ? |
| README.md | Qu'est-ce que PlanTrip ? |
| MANIFESTO.md | Pourquoi ce projet existe-t-il ? |
| FOUNDING_PRINCIPLES.md | Quelles sont nos convictions ? |
| ARCHITECTURAL_VALUES.md | Comment prenons-nous nos décisions ? |
| DevBook.md | Comment le projet est-il construit ? |
| PROJECT_CHRONICLES.md | Comment le projet a-t-il évolué ? |
| ROADMAP.md | Où allons-nous ? |
| CONTRIBUTING.md | Comment contribuer ? |
| GOVERNANCE.md | Comment les décisions sont-elles prises ? |

Aucun de ces documents ne doit faire doublon avec un autre.

---

# Le dossier apps

Le dossier **apps** contient les applications développées dans le cadre de Projet Atlas.

Chaque application reste indépendante.

Exemples futurs :

- PlanTrip
- Atlas Drive
- autres applications de l'écosystème

Les applications partagent les mêmes principes architecturaux.

---

# Le dossier packages

Le dossier **packages** contient les bibliothèques réutilisables.

Le code partagé doit être placé ici plutôt que dupliqué dans plusieurs applications.

Chaque package possède :

- une responsabilité unique ;
- sa documentation ;
- ses tests.

---

# Le dossier docs

Le dossier **docs** contient toute la documentation complémentaire.

On y trouve notamment :

- ADR ;
- documentation API ;
- architecture ;
- recherches ;
- guides de développement ;
- tutoriels.

Le DevBook reste toutefois la référence principale.

---

# Le dossier assets

Le dossier **assets** regroupe toutes les ressources graphiques.

Exemples :

- logos ;
- illustrations ;
- mockups ;
- captures d'écran ;
- diagrammes ;
- ressources GitHub.

Toutes les ressources doivent être organisées de manière cohérente.

---

# Le Workshop

Le dossier **workshop** constitue l'atelier de réflexion de Projet Atlas.

Il ne fait pas partie de la documentation officielle.

On y trouve :

- les idées ;
- les concepts ;
- les recherches ;
- les expérimentations ;
- les réflexions sur le branding.

Une idée présente dans le Workshop n'est jamais considérée comme validée.

Elle devient officielle uniquement lorsqu'elle est intégrée :

- au DevBook ;
- à un ADR ;
- ou à la documentation officielle.

---

# Les scripts

Le dossier **scripts** contient les scripts utilitaires.

Ils permettent notamment :

- l'automatisation ;
- la maintenance ;
- certaines opérations de développement.

Les scripts doivent rester indépendants des applications.

---

# Les tests

Le dossier **tests** rassemble les outils et ressources liés aux tests.

Les tests constituent une partie intégrante du projet.

Une fonctionnalité importante ne peut être considérée comme terminée sans stratégie de test.

---

# Les outils

Le dossier **tools** contient les outils développés pour Projet Atlas.

Par exemple :

- générateurs ;
- initialiseurs ;
- assistants ;
- outils internes.

Ces outils participent au confort de développement mais ne doivent jamais devenir des dépendances critiques pour le fonctionnement des applications.

---

# Une structure qui raconte une histoire

L'organisation du dépôt ne doit jamais être arbitraire.

Elle reflète la philosophie du projet.

Le visiteur découvre progressivement :

1. la vision ;
2. les principes ;
3. l'architecture ;
4. les idées ;
5. le code.

Ainsi, la structure du dépôt devient elle-même un outil de compréhension.

# Technologies retenues

Les technologies utilisées dans Projet Atlas sont choisies pour leur maturité, leur pérennité et leur capacité à évoluer.

Le choix d'une technologie n'est jamais une finalité.

Il doit toujours répondre à un besoin clairement identifié.

Une technologie pourra être remplacée.

L'architecture devra permettre cette évolution sans remise en cause du domaine métier.

---

# Frontend

Le frontend constitue la partie visible de l'application.

Il est responsable de :

- l'interface utilisateur ;
- l'expérience utilisateur ;
- la navigation ;
- les interactions ;
- la gestion des états de présentation.

Le frontend ne contient aucune logique métier complexe.

Il consomme les services mis à disposition par les couches applicatives.

---

## Flutter

Flutter est retenu comme technologie principale pour le développement des applications clientes.

Les raisons de ce choix sont les suivantes :

- développement multiplateforme ;
- excellente expérience utilisateur ;
- performances élevées ;
- communauté importante ;
- maintenance simplifiée.

Flutter permet également de partager une grande partie du code entre :

- Android ;
- iOS ;
- Linux ;
- Windows ;
- macOS ;
- Web (dans certaines limites).

---

## Architecture du frontend

Le frontend devra respecter une architecture modulaire.

Chaque fonctionnalité possède :

- ses vues ;
- ses composants ;
- sa logique de présentation ;
- ses tests.

La logique métier ne doit jamais être directement intégrée aux widgets.

---

# Backend

Le backend centralise :

- l'authentification ;
- la synchronisation ;
- les traitements métier ;
- les API ;
- la persistance distante.

Il constitue le point de référence des données synchronisées.

---

## API

Toutes les communications passent par une API clairement définie.

Les applications clientes ne dialoguent jamais directement avec la base de données.

Cette séparation permet :

- une meilleure sécurité ;
- une meilleure évolutivité ;
- une maintenance facilitée.

---

## Authentification

Le projet privilégie une authentification simple pour l'utilisateur.

Le Magic Link constitue aujourd'hui la solution privilégiée.

Cette approche permet :

- d'éviter les mots de passe ;
- de limiter les risques liés à leur stockage ;
- d'améliorer l'expérience utilisateur.

Le choix définitif pourra évoluer en fonction des besoins futurs.

---

# Base de données

La persistance repose sur deux niveaux.

## Base locale

Chaque appareil possède sa propre base locale.

Elle permet :

- le fonctionnement hors connexion ;
- des performances élevées ;
- une excellente réactivité.

Le principe **Offline First** repose principalement sur cette base locale.

---

## Base distante

Le serveur conserve une copie synchronisée des données.

Cette base permet :

- la sauvegarde ;
- la synchronisation multi-appareils ;
- la restauration.

Le serveur ne doit jamais devenir une dépendance permanente au fonctionnement de l'application.

---

# Synchronisation

La synchronisation est asynchrone.

Le fonctionnement local reste prioritaire.

Lorsque le réseau est disponible :

1. les modifications sont détectées ;
2. elles sont synchronisées ;
3. les conflits éventuels sont résolus.

L'utilisateur ne doit jamais avoir l'impression d'attendre le serveur.

---

# Sécurité

La sécurité ne constitue pas une fonctionnalité.

Elle fait partie intégrante de l'architecture.

Chaque composant doit être conçu selon le principe du moindre privilège.

Les données personnelles doivent être limitées au strict nécessaire.

Les traitements sensibles doivent être réalisés côté serveur lorsque cela est pertinent.

---

# Dépendances

Chaque nouvelle dépendance introduit :

- une maintenance supplémentaire ;
- un risque de sécurité ;
- une complexité supplémentaire.

Avant d'ajouter une bibliothèque externe, il convient de se poser les questions suivantes :

- Résout-elle un véritable problème ?
- Est-elle maintenue activement ?
- Peut-on obtenir le même résultat avec les outils existants ?
- Quel sera son impact dans cinq ans ?

Une dépendance inutile est une dette technique.

---

# Pérennité

Aucune technologie utilisée aujourd'hui ne doit empêcher le projet d'évoluer demain.

L'architecture doit toujours permettre :

- le remplacement d'une bibliothèque ;
- l'évolution d'un framework ;
- la migration d'une base de données ;
- le remplacement d'un fournisseur de services.

Le domaine métier ne doit jamais dépendre directement d'une technologie particulière.

# Conventions de développement

L'objectif de ces conventions n'est pas de contraindre les développeurs.

Elles existent afin de garantir la cohérence du projet sur le long terme.

Une convention correctement appliquée évite des centaines de décisions inutiles.

---

# Lisibilité

Le code est écrit avant tout pour être lu.

Un développeur passera toujours davantage de temps à lire du code qu'à en écrire.

La lisibilité est donc prioritaire sur la concision.

Nous privilégions :

- des noms explicites ;
- des fonctions courtes ;
- des classes ayant une responsabilité unique ;
- un découpage logique des fichiers.

---

# Simplicité

Chaque solution doit être la plus simple possible.

Une architecture complexe n'est acceptable que lorsqu'une solution simple ne permet plus de répondre au besoin.

La simplicité est une qualité.

---

# Responsabilité unique

Chaque composant possède une responsabilité clairement définie.

Lorsqu'une classe commence à gérer plusieurs préoccupations différentes, elle doit être découpée.

Cette règle s'applique :

- aux classes ;
- aux widgets ;
- aux services ;
- aux packages ;
- aux modules.

---

# Documentation

Toute décision importante doit être documentée.

Le code explique **comment**.

La documentation explique **pourquoi**.

Ces deux aspects sont complémentaires.

---

# Commentaires

Les commentaires ne doivent jamais expliquer un code évident.

Ils servent uniquement à apporter un contexte qu'il serait impossible de comprendre en lisant uniquement le code.

Un commentaire est justifié lorsqu'il répond à une question telle que :

- Pourquoi cette approche ?
- Quelle contrainte impose ce comportement ?
- Quelle décision historique explique ce choix ?

---

# Nommage

Les noms doivent être explicites.

Un nom légèrement plus long est préférable à une abréviation ambiguë.

Les noms doivent refléter le métier.

Les termes techniques ne doivent être utilisés que lorsqu'ils apportent une réelle précision.

---

# Duplication

Toute duplication importante doit être considérée comme un signal d'alerte.

Avant de copier du code, il convient de se demander :

- cette logique peut-elle être factorisée ?
- appartient-elle à un package partagé ?
- cette duplication est-elle réellement justifiée ?

---

# Dépendances

Chaque dépendance doit être justifiée.

Une bibliothèque n'est jamais ajoutée uniquement parce qu'elle est populaire.

Avant son intégration, il convient d'évaluer :

- sa maintenance ;
- sa communauté ;
- sa stabilité ;
- son impact sur l'architecture.

---

# Tests

Le développement est accompagné de tests adaptés.

Les composants critiques doivent être couverts.

Les tests doivent rester :

- simples ;
- rapides ;
- fiables.

Des tests difficiles à maintenir perdent rapidement leur valeur.

---

# Journal des décisions

Les décisions importantes doivent être conservées.

Le projet utilise pour cela :

- le DevBook ;
- les ADR ;
- PROJECT_CHRONICLES.md.

L'objectif est qu'un nouveau développeur puisse comprendre non seulement ce qui a été décidé, mais également pourquoi.

---

# Évolution de l'architecture

Une architecture n'est jamais figée.

Elle évolue avec le projet.

Cependant, toute évolution importante doit respecter les principes fondateurs.

Une amélioration locale ne doit jamais dégrader la cohérence globale.

---

# La règle du "Pourquoi ?"

Avant toute décision importante, chaque développeur doit être capable de répondre à une question simple :

> Pourquoi faisons-nous ce choix ?

Si cette réponse n'est pas clairement formulée, la réflexion doit se poursuivre avant toute implémentation.

Cette règle s'applique :

- au code ;
- à l'architecture ;
- à l'interface ;
- à la documentation ;
- à la direction artistique.

Projet Atlas privilégie toujours les décisions comprises aux décisions simplement reproduites.

---

# Conclusion

Le DevBook n'a pas vocation à figer définitivement Projet Atlas.

Au contraire.

Il constitue un cadre permettant au projet d'évoluer sans perdre son identité.

Les technologies évolueront.

Les outils évolueront.

Les méthodes évolueront.

Les applications évolueront.

Mais les principes qui fondent Projet Atlas ont vocation à accompagner le projet pendant de nombreuses années.

Chaque contribution, chaque fonctionnalité, chaque ligne de code doit pouvoir être relue à la lumière d'une question unique :

> **Cette décision rend-elle Projet Atlas plus simple, plus durable et plus utile pour ses utilisateurs ?**

Si la réponse est oui, alors elle va probablement dans la bonne direction.

---

# Annexe A — Philosophie documentaire

Projet Atlas considère la documentation comme une composante essentielle du projet.

La documentation n'est pas une conséquence du développement.

Elle fait partie du développement.

Chaque document possède une mission précise.

Aucun document ne doit faire doublon avec un autre.

---

## La Bibliothèque Atlas

La documentation officielle est organisée comme une bibliothèque.

Chaque document répond à une question.

| Document | Répond à la question |
|----------|----------------------|
| START_HERE.md | Par où commencer ? |
| README.md | Qu'est-ce que PlanTrip ? |
| MANIFESTO.md | Pourquoi ce projet existe-t-il ? |
| FOUNDING_PRINCIPLES.md | Quelles sont nos convictions ? |
| ARCHITECTURAL_VALUES.md | Comment prenons-nous nos décisions ? |
| DevBook.md | Comment le projet est-il construit ? |
| CONTRIBUTING.md | Comment contribuer ? |
| GOVERNANCE.md | Comment les décisions sont-elles prises ? |
| PROJECT_CHRONICLES.md | Quelle est l'histoire du projet ? |
| ROADMAP.md | Où allons-nous ? |

Cette organisation permet à chaque lecteur de trouver rapidement la réponse à sa question sans parcourir l'ensemble de la documentation.

---

# Annexe B — Le Workshop

Le Workshop constitue l'atelier de Projet Atlas.

Il ne fait pas partie de la documentation officielle.

Il accueille :

- les idées ;
- les recherches ;
- les expérimentations ;
- les concepts ;
- les réflexions de branding ;
- les prototypes.

Le Workshop est volontairement libre.

Le DevBook est volontairement rigoureux.

Les deux sont complémentaires.

Une idée présente dans le Workshop n'est jamais considérée comme officielle.

Elle devient officielle uniquement lorsqu'elle est intégrée :

- au DevBook ;
- à un ADR ;
- ou à la documentation officielle.

---

# Annexe C — Direction artistique

L'identité visuelle de Projet Atlas est documentée indépendamment de son architecture.

Les choix graphiques ne doivent jamais être arbitraires.

Chaque couleur.

Chaque illustration.

Chaque animation.

Chaque typographie.

Chaque icône.

Doit répondre à une intention clairement identifiée.

Les documents de référence sont notamment :

- ARTISTIC_DIRECTION.md
- VISUAL_IDENTITY_GUIDELINES.md
- DESIGN_SYSTEM.md

La direction artistique est considérée comme une composante de l'architecture globale du projet.

---

# Annexe D — La règle de cohérence

Avant toute décision importante, une dernière question doit toujours être posée.

> Cette décision est-elle cohérente avec la vision de Projet Atlas ?

Si la réponse est non.

La décision doit être reconsidérée.

Cette règle prévaut sur :

- les préférences personnelles ;
- les effets de mode ;
- les choix purement techniques.

La cohérence constitue l'une des principales qualités recherchées dans Projet Atlas.

---

# Mot de clôture

Projet Atlas n'a pas été imaginé comme une simple application.

Il a été pensé comme un projet capable de durer.

Chaque ligne de documentation.

Chaque ligne de code.

Chaque illustration.

Chaque décision.

Participe à cette ambition.

Nous espérons que ce DevBook permettra à chaque contributeur de comprendre non seulement **comment** construire Projet Atlas, mais surtout **pourquoi** il est construit ainsi.

Bienvenue dans Projet Atlas.
