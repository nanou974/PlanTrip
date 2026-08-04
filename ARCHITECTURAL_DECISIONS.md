# Décisions d'Architecture

> *Chaque projet est le résultat de milliers de lignes de code.*
>
> *PlanTrip est d'abord le résultat de centaines de décisions.*
>
> *Ce document existe pour les expliquer.*

---

# Pourquoi ce document ?

Lorsque l'on découvre un projet Open Source, il est relativement facile de comprendre ce qu'il fait.

Il est beaucoup plus difficile de comprendre pourquoi il a été construit de cette manière.

Pourquoi autant de documentation ?

Pourquoi autant de fichiers Markdown ?

Pourquoi autant de temps consacré à des décisions qui semblent parfois éloignées du développement ?

Pourquoi commencer par écrire avant de programmer ?

Ces questions sont légitimes.

J'ai simplement choisi d'y répondre.

Ce document n'explique pas l'architecture de l'application.

Il explique l'architecture du projet.

---

# Pourquoi autant de documentation ?

Pendant longtemps, j'ai considéré la documentation comme quelque chose que l'on écrivait une fois le projet terminé.

Avec le temps, j'ai compris que c'était exactement l'inverse.

La documentation ne décrit pas uniquement un projet.

Elle aide à le construire.

Écrire oblige à réfléchir.

À remettre en question ses idées.

À simplifier ce qui semblait évident.

À trouver une direction avant de commencer à avancer.

Si certains documents existent avant même que certaines fonctionnalités soient développées, ce n'est pas un hasard.

C'est une manière de construire.

---

# Pourquoi un README aussi travaillé ?

Le README est la première impression.

Beaucoup de personnes décideront en quelques secondes si un projet mérite leur attention.

Je ne voulais pas qu'il ressemble à une simple fiche technique.

Je voulais qu'il raconte ce qu'est PlanTrip avant d'expliquer comment l'installer.

Le code viendra ensuite.

La vision, elle, doit être comprise dès les premières lignes.

---

# Pourquoi FOUNDING_PRINCIPLES.md ?

Pendant plusieurs jours, j'ai essayé d'écrire un document qui expliquerait les principes de PlanTrip.

Je me suis rendu compte que je faisais fausse route.

PlanTrip n'a pas de principes.

Moi, oui.

Les décisions prises dans ce projet ne viennent pas d'une méthode imposée.

Elles viennent de ma manière de réfléchir.

FOUNDING_PRINCIPLES.md n'explique donc pas comment développer PlanTrip.

Il explique simplement comment je prends mes décisions.

Libre à chacun ensuite de les partager... ou non.

---

# Pourquoi DEVBOOK.md ?

Le code répond à une question :

« Comment cela fonctionne ? »

Le DevBook répond à une autre :

« Pourquoi est-ce construit ainsi ? »

Il rassemble les choix techniques importants, les conventions, les orientations générales et les décisions qui ne trouvent pas naturellement leur place dans le code.

Je voulais qu'un nouveau développeur puisse comprendre le projet avant même d'ouvrir son premier fichier source.

---

# Pourquoi VISUAL_IDENTITY_GUIDELINES.md ?

L'identité visuelle est souvent considérée comme une étape finale.

Je pense exactement l'inverse.

Une identité visuelle influence la manière dont un projet est perçu.

Elle influence également la manière dont il est développé.

Le choix d'un logo.

D'une palette de couleurs.

D'une typographie.

D'un ton.

Tout cela participe à construire une identité cohérente.

Je voulais que ces décisions soient documentées avec la même exigence que les décisions techniques.

---

# Pourquoi GOVERNANCE.md ?

Tous les projets ont une gouvernance.

Même ceux qui prétendent ne pas en avoir.

La différence est que certains choisissent de l'expliquer.

Je préfère annoncer clairement comment les décisions sont prises plutôt que laisser chacun l'imaginer.

La transparence évite beaucoup de malentendus.

---

# Pourquoi ROADMAP.md ?

Une feuille de route ne doit pas être une liste de promesses.

Elle doit être une direction.

Je préfère annoncer où je souhaite emmener le projet plutôt que promettre des dates que je ne suis pas certain de pouvoir tenir.

Le logiciel évoluera.

Les priorités aussi.

La direction, elle, restera.

---

# Pourquoi ARCHITECTURAL_DECISIONS.md ?

Parce que Git conserve les modifications.

Pas leurs raisons.

Dans quelques années, certaines décisions paraîtront probablement évidentes.

Elles ne l'étaient pas lorsqu'elles ont été prises.

Je voulais conserver cette mémoire.

Pas pour empêcher le projet d'évoluer.

Au contraire.

Je crois qu'il est plus facile de faire évoluer un projet lorsque l'on comprend pourquoi les décisions précédentes ont été prises.

On ne respecte pas une idée parce qu'elle est ancienne.

On la respecte parce qu'on a pris le temps de la comprendre.

---

# Pourquoi le dépôt est-il aussi structuré ?

Parce que je considère un dépôt Git comme un atelier.

Un atelier bien organisé permet de retrouver rapidement ce dont on a besoin.

Il donne envie de travailler.

Il réduit les erreurs.

Il facilite les contributions.

L'organisation n'est pas une obsession.

C'est une marque de respect envers toutes les personnes qui passeront un jour du temps dans ce projet.

Y compris moi.

---

# Pourquoi tant de soin ?

C'est probablement la question la plus simple.

Parce que j'aime construire des choses qui dureront.

Je ne cherche pas à publier rapidement.

Je préfère avancer plus lentement si cela permet de construire des fondations plus solides.

Je n'ai aucune certitude sur l'avenir de PlanTrip.

Peut-être deviendra-t-il un projet important.

Peut-être restera-t-il un projet confidentiel.

Au fond, cela importe peu.

Ce qui compte pour moi, c'est de pouvoir regarder ce dépôt dans quelques années et me dire que j'ai construit quelque chose avec honnêteté, cohérence et exigence.

Si un jour quelqu'un reprend ce projet, j'espère simplement qu'il prendra autant de temps à comprendre les décisions existantes qu'à imaginer les suivantes.

Parce qu'un projet ne se résume jamais à son code.

Il est aussi le reflet des choix qui lui ont donné naissance.

---

— Gianny Blard
