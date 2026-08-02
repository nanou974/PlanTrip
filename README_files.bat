@echo off
title Projet Atlas - Initialisation des README

echo.
echo ==========================================
echo     Projet Atlas - README Initializer
echo ==========================================
echo.

REM ============================================================
REM DOCUMENTS RACINE
REM ============================================================

(
echo # PlanTrip
echo.
echo A chacun son vehicule, a tous l'evasion.
echo.
echo Le README principal constitue la vitrine du projet.
echo.
echo Il presente PlanTrip, sa philosophie, ses fonctionnalites
echo et oriente le lecteur vers le reste de la documentation.
) > README.md

(
echo # Bienvenue dans Projet Atlas
echo.
echo Ce document constitue le point d'entree du projet.
echo.
echo Il explique dans quel ordre lire la documentation afin
echo de comprendre progressivement la philosophie,
echo l'architecture et l'organisation du projet.
) > START_HERE.md

(
echo # Manifesto
echo.
echo Ce document explique pourquoi Projet Atlas existe.
echo.
echo Il presente la vision du projet,
echo les problemes auxquels il souhaite repondre
echo ainsi que ses ambitions a long terme.
) > MANIFESTO.md

(
echo # Founding Principles
echo.
echo Ce document rassemble les convictions fondamentales
echo de Projet Atlas.
echo.
echo Ces principes ne sont pas lies a une technologie
echo et ne devraient jamais changer.
) > FOUNDING_PRINCIPLES.md

(
echo # Architectural Values
echo.
echo Ce document presente les valeurs qui guident
echo chaque decision technique.
echo.
echo Il constitue la boussole architecturale du projet.
) > ARCHITECTURAL_VALUES.md

(
echo # DevBook
echo.
echo Le DevBook est la reference architecturale
echo officielle de Projet Atlas.
echo.
echo Toute evolution importante doit etre coherente
echo avec les principes definis dans ce document.
) > DevBook.md

(
echo # Project Chronicles
echo.
echo Ce document raconte l'histoire du projet.
echo.
echo Il conserve les grandes etapes,
echo les decisions majeures
echo et les moments importants de son evolution.
) > PROJECT_CHRONICLES.md

(
echo # Roadmap
echo.
echo Ce document presente la vision des futures versions.
echo.
echo Il indique les grandes orientations
echo sans constituer un planning rigide.
) > ROADMAP.md

(
echo # Contributing
echo.
echo Ce document explique comment contribuer
echo efficacement au projet.
echo.
echo Toute contribution importante doit respecter
echo le DevBook ainsi que les valeurs architecturales.
) > CONTRIBUTING.md

(
echo # Governance
echo.
echo Ce document explique comment les decisions
echo importantes sont prises.
echo.
echo Il definit les roles,
echo les responsabilites
echo et les processus de validation.
) > GOVERNANCE.md

REM ============================================================
REM APPS
REM ============================================================

(
echo # Apps
echo.
echo Ce dossier contient les applications
echo developpees dans le cadre de Projet Atlas.
echo.
echo Exemples futurs :
echo.
echo - PlanTrip
echo - Atlas Drive
echo - autres applications de l'ecosysteme
) > apps\README.md

REM ============================================================
REM PACKAGES
REM ============================================================

(
echo # Packages
echo.
echo Ce dossier contient les bibliotheques partagees
echo entre les differentes applications.
echo.
echo Les packages favorisent la reutilisation
echo et limitent la duplication du code.
) > packages\README.md

REM ============================================================
REM SCRIPTS
REM ============================================================

(
echo # Scripts
echo.
echo Ce dossier contient les scripts utilitaires.
echo.
echo Ils permettent notamment
echo l'automatisation,
echo la maintenance
echo et certaines taches de developpement.
) > scripts\README.md

REM ============================================================
REM TESTS
REM ============================================================

(
echo # Tests
echo.
echo Ce dossier rassemble les tests
echo du projet.
echo.
echo Les tests garantissent la stabilite
echo et la qualite de l'architecture.
) > tests\README.md

REM ============================================================
REM TOOLS
REM ============================================================

(
echo # Tools
echo.
echo Ce dossier contient les outils internes
echo utilises par Projet Atlas.
echo.
echo Ces outils facilitent
echo le developpement,
echo la generation de fichiers
echo ou certaines operations recurrentes.
) > tools\README.md

REM ============================================================
REM DOCS
REM ============================================================

(
echo # Documentation
echo.
echo Ce dossier rassemble toute la documentation
echo officielle de Projet Atlas.
echo.
echo Chaque sous-dossier correspond
echo a un domaine precis de connaissances.
) > docs\README.md

REM ============================================================
REM ADR
REM ============================================================

(
echo # ADR
echo.
echo Les Architecture Decision Records
echo documentent toutes les decisions
echo importantes prises pendant la vie du projet.
echo.
echo Une decision importante ne doit jamais
echo exister uniquement dans un commit Git.
) > docs\adr\README.md

REM ============================================================
REM API
REM ============================================================

(
echo # API
echo.
echo Ce dossier documente les API publiques
echo du projet.
echo.
echo Chaque service,
echo endpoint
echo ou interface publique
echo devra y etre reference.
) > docs\api\README.md

REM ============================================================
REM ARCHITECTURE
REM ============================================================

(
echo # Architecture
echo.
echo Ce dossier contient les schemas
echo et les documents complementaires
echo decrivant l'architecture globale.
echo.
echo Le DevBook reste toutefois
echo la reference principale.
) > docs\architecture\README.md

REM ============================================================
REM DESIGN
REM ============================================================

(
echo # Design
echo.
echo Ce dossier rassemble les documents
echo concernant l'experience utilisateur,
echo les interfaces
echo ainsi que le design system.
echo.
echo L'objectif est de garantir
echo une experience coherente.
) > docs\design\README.md

REM ============================================================
REM DEVELOPMENT
REM ============================================================

(
echo # Development
echo.
echo Ce dossier contient les conventions
echo de developpement,
echo les guides techniques
echo ainsi que les bonnes pratiques.
echo.
echo Il facilite l'integration
echo de nouveaux contributeurs.
) > docs\development\README.md

REM ============================================================
REM RESEARCH
REM ============================================================

(
echo # Research
echo.
echo Ce dossier rassemble les recherches,
echo comparatifs
echo et analyses ayant servi
echo a orienter certaines decisions.
echo.
echo Ces documents permettent
echo de conserver le contexte
echo des choix effectues.
) > docs\research\README.md

REM ============================================================
REM TUTORIALS
REM ============================================================

(
echo # Tutorials
echo.
echo Ce dossier contient des tutoriels
echo destines aux utilisateurs
echo et aux developpeurs.
echo.
echo Chaque tutoriel doit etre
echo autonome
echo et progressif.
) > docs\tutorials\README.md

REM ============================================================
REM DECISIONS
REM ============================================================

(
echo # Decisions
echo.
echo Ce dossier conserve
echo les notes de decision
echo qui ne constituent pas encore
echo un ADR officiel.
echo.
echo Une fois validees,
echo elles pourront etre promues
echo en ADR.
) > docs\decisions\README.md

REM ============================================================
REM ASSETS
REM ============================================================

(
echo # Assets
echo.
echo Ce dossier contient toutes les ressources graphiques
echo utilisees par Projet Atlas.
echo.
echo Logos,
echo illustrations,
echo mockups,
echo captures d'ecran,
echo diagrammes
echo et supports de communication
echo sont centralises ici.
) > assets\README.md

REM ============================================================
REM BRANDING
REM ============================================================

(
echo # Branding
echo.
echo Ce dossier contient l'identite visuelle
echo officielle de Projet Atlas.
echo.
echo Toute evolution graphique
echo doit etre documentee ici.
) > assets\branding\README.md

REM ============================================================
REM COLORS
REM ============================================================

(
echo # Colors
echo.
echo Ce dossier contient la palette officielle
echo de Projet Atlas.
echo.
echo Chaque couleur doit etre documentee
echo avec son nom,
echo son code
echo et son utilisation.
) > assets\branding\colors\README.md

REM ============================================================
REM FONTS
REM ============================================================

(
echo # Fonts
echo.
echo Ce dossier contient les polices
echo utilisees dans le projet.
echo.
echo Chaque police devra etre accompagnee
echo de sa licence
echo et de son usage recommande.
) > assets\branding\fonts\README.md

REM ============================================================
REM LOGOS
REM ============================================================

(
echo # Logos
echo.
echo Ce dossier contient les logos officiels
echo de Projet Atlas
echo et de ses applications.
echo.
echo Les formats SVG sont privilegies.
) > assets\branding\logos\README.md

REM ============================================================
REM FAVICON
REM ============================================================

(
echo # Favicon
echo.
echo Ce dossier contient les favicons
echo utilises par les sites web
echo et applications web
echo du projet.
) > assets\branding\favicon\README.md

REM ============================================================
REM GITHUB
REM ============================================================

(
echo # GitHub Assets
echo.
echo Ce dossier contient toutes les ressources
echo specifiquement destinees
echo a GitHub.
echo.
echo Banniere,
echo hero,
echo apercu social,
echo illustrations du README...
) > assets\github\README.md

REM ============================================================
REM HERO
REM ============================================================

(
echo # Hero
echo.
echo Ce dossier contient les illustrations
echo principales utilisees
echo dans le README
echo et la page d'accueil GitHub.
) > assets\github\hero\README.md

REM ============================================================
REM SOCIAL
REM ============================================================

(
echo # Social
echo.
echo Ce dossier contient les images
echo destinees aux apercus
echo sur les reseaux sociaux.
) > assets\github\social\README.md

REM ============================================================
REM BANNERS
REM ============================================================

(
echo # Banners
echo.
echo Ce dossier contient les bannieres
echo utilisees sur GitHub,
echo le site web
echo ou les presentations.
) > assets\github\banners\README.md

REM ============================================================
REM DIAGRAMS
REM ============================================================

(
echo # Diagrams
echo.
echo Ce dossier rassemble tous les schemas
echo d'architecture,
echo diagrammes UML,
echo Mermaid
echo et illustrations techniques.
) > assets\diagrams\README.md

REM ============================================================
REM ILLUSTRATIONS
REM ============================================================

(
echo # Illustrations
echo.
echo Ce dossier contient les illustrations
echo originales du projet.
echo.
echo Elles sont utilisees
echo dans la documentation,
echo le site web
echo et les presentations.
) > assets\illustrations\README.md

REM ============================================================
REM MOCKUPS
REM ============================================================

(
echo # Mockups
echo.
echo Ce dossier contient les maquettes
echo des futures interfaces.
echo.
echo Les mockups servent
echo a communiquer la vision
echo avant le developpement.
) > assets\mockups\README.md

REM ============================================================
REM SCREENSHOTS
REM ============================================================

(
echo # Screenshots
echo.
echo Ce dossier contient
echo les captures d'ecran
echo des applications
echo au fil de leur evolution.
) > assets\screenshots\README.md

REM ============================================================
REM WORKSHOP
REM ============================================================

(
echo # Workshop
echo.
echo Bienvenue dans le Workshop de Projet Atlas.
echo.
echo Le Workshop est l'atelier du projet.
echo.
echo C'est ici que naissent les idees.
echo.
echo Certaines deviendront des fonctionnalites.
echo D'autres resteront de simples experimentations.
echo D'autres encore seront abandonnees.
echo.
echo Et c'est parfaitement normal.
echo.
echo Le Workshop n'est pas une documentation.
echo Ce n'est pas une roadmap.
echo Ce n'est pas un cahier des charges.
echo.
echo C'est un espace de reflexion.
echo.
echo Une idee presente ici n'est jamais consideree
echo comme officielle.
echo.
echo Une idee devient officielle uniquement lorsqu'elle
echo est integree au DevBook,
echo validee par un ADR
echo ou integree a la documentation officielle.
echo.
echo Le Workshop est volontairement libre.
echo Le DevBook est volontairement rigoureux.
echo.
echo Les deux sont complementaires.
echo.
echo Bienvenue dans l'atelier.
) > workshop\README.md

REM ============================================================
REM IDEAS
REM ============================================================

(
echo # Ideas
echo.
echo Ce dossier contient toutes les idees
echo imaginees pour Projet Atlas.
echo.
echo Une idee n'est pas un engagement.
echo Elle constitue simplement une piste
echo qui pourra etre etudiee plus tard.
echo.
echo Chaque idee devrait disposer
echo de son propre document.
) > workshop\ideas\README.md

REM ============================================================
REM CONCEPTS
REM ============================================================

(
echo # Concepts
echo.
echo Ce dossier rassemble
echo les concepts architecturaux
echo et fonctionnels.
echo.
echo Ces documents permettent
echo d'explorer de nouvelles approches
echo avant toute decision.
) > workshop\concepts\README.md

REM ============================================================
REM BRANDING
REM ============================================================

(
echo # Branding
echo.
echo Ce dossier contient
echo les reflexions concernant
echo l'identite de Projet Atlas.
echo.
echo Noms,
echo slogans,
echo devises,
echo logos,
echo couleurs,
echo typographies
echo et direction artistique
echo y sont documentes.
) > workshop\branding\README.md

REM ============================================================
REM EXPERIMENTS
REM ============================================================

(
echo # Experiments
echo.
echo Ce dossier contient
echo les experimentations.
echo.
echo Les prototypes,
echo preuves de concept
echo et essais techniques
echo y trouvent naturellement leur place.
echo.
echo Un experiment peut reussir...
echo ou etre abandonne.
) > workshop\experiments\README.md

REM ============================================================
REM RESEARCH
REM ============================================================

(
echo # Research
echo.
echo Ce dossier rassemble
echo les recherches preparatoires.
echo.
echo Comparatifs,
echo benchmarks,
echo analyses,
echo lectures
echo et veille technologique
echo peuvent y etre conserves.
) > workshop\research\README.md

REM ============================================================
REM ARCHIVE
REM ============================================================

(
echo # Archive
echo.
echo Ce dossier conserve
echo les idees abandonnees,
echo les anciennes versions
echo ainsi que les documents
echo devenus obsoletes.
echo.
echo Rien ne disparait.
echo Tout reste consultable.
echo.
echo L'histoire du projet
echo fait partie de sa richesse.
) > workshop\archive\README.md

echo.
echo ==========================================
echo Tous les README ont ete initialises.
echo ==========================================
echo.

pause

