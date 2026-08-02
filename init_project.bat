@echo off
title Projet Atlas - Initialisation de l'arborescence

echo.
echo ============================================
echo      Projet Atlas - Initialisation
echo ============================================
echo.

REM ====================================================
REM Dossiers principaux
REM ====================================================

mkdir apps 2>nul
mkdir packages 2>nul
mkdir scripts 2>nul
mkdir tests 2>nul
mkdir tools 2>nul
mkdir workshop 2>nul
mkdir docs 2>nul
mkdir assets 2>nul

REM ====================================================
REM Documentation
REM ====================================================

mkdir docs\adr 2>nul
mkdir docs\api 2>nul
mkdir docs\architecture 2>nul
mkdir docs\design 2>nul
mkdir docs\development 2>nul
mkdir docs\research 2>nul
mkdir docs\tutorials 2>nul
mkdir docs\decisions 2>nul

REM ====================================================
REM Assets
REM ====================================================

mkdir assets\branding 2>nul
mkdir assets\branding\colors 2>nul
mkdir assets\branding\fonts 2>nul
mkdir assets\branding\logos 2>nul
mkdir assets\branding\favicon 2>nul

mkdir assets\github 2>nul
mkdir assets\github\hero 2>nul
mkdir assets\github\social 2>nul
mkdir assets\github\banners 2>nul

mkdir assets\diagrams 2>nul
mkdir assets\illustrations 2>nul
mkdir assets\mockups 2>nul
mkdir assets\screenshots 2>nul

REM ====================================================
REM Workshop
REM ====================================================

mkdir workshop\ideas 2>nul
mkdir workshop\concepts 2>nul
mkdir workshop\branding 2>nul
mkdir workshop\experiments 2>nul
mkdir workshop\research 2>nul
mkdir workshop\archive 2>nul

REM ====================================================
REM Création des documents principaux
REM ====================================================

type nul > README.md
type nul > START_HERE.md
type nul > MANIFESTO.md
type nul > FOUNDING_PRINCIPLES.md
type nul > ARCHITECTURAL_VALUES.md
type nul > DevBook.md
type nul > PROJECT_CHRONICLES.md
type nul > ROADMAP.md
type nul > CONTRIBUTING.md
type nul > GOVERNANCE.md

REM ====================================================
REM README Workshop
REM ====================================================

type nul > workshop\README.md

echo.
echo Arborescence creee avec succes.
echo.

pause