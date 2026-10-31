@echo off
rem Double-cliquez sur ce fichier après avoir ajouté ou modifié un meuble dans le dossier "meubles".
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0outils\assembler-meubles.ps1"
pause
