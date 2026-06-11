@echo off
setlocal enabledelayedexpansion
title AT-MEC HM 4.01 - Installazione automatica
cd /d "%~dp0"
echo ======================================================
echo  AT-MEC HM 4.01 - Setup Windows
echo ======================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [INFO] Node.js non trovato. Provo installazione con winget...
  where winget >nul 2>nul
  if errorlevel 1 (
    echo [ERRORE] winget non disponibile. Installa Node.js LTS manualmente e rilancia questo file.
    pause
    exit /b 1
  )
  winget install OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
) else (
  echo [OK] Node.js trovato.
)
echo.
echo [INFO] Installazione dipendenze npm...
call npm install
if errorlevel 1 (
  echo [ERRORE] npm install fallito.
  pause
  exit /b 1
)
echo.
echo [INFO] Compilazione TypeScript...
call npm run build
if errorlevel 1 (
  echo [ERRORE] Build fallita.
  pause
  exit /b 1
)
echo.
echo [INFO] Creo collegamento Desktop...
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\create_shortcut.ps1

echo.
echo [OK] Installazione completata.
echo Avvia con AVVIA_AT_MEC_HM_4.01.bat oppure dal collegamento Desktop.
pause
