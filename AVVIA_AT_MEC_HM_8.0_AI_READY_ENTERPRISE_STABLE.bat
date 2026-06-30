@echo off
cd /d "%~dp0"
title AT-MEC_HM_8.0_AI_READY_ENTERPRISE_STABLE
echo Avvio AT-MEC_HM_8.0_AI_READY_ENTERPRISE_STABLE...
if not exist "package.json" (
  echo ERRORE: package.json non trovato. Avviare il BAT dalla cartella del progetto.
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo Dipendenze mancanti. Avvio installazione automatica...
  call npm install
  if errorlevel 1 (
    echo ERRORE: installazione dipendenze non riuscita.
    pause
    exit /b 1
  )
)
if not exist "node_modules\electron\dist\electron.exe" (
  echo Electron non installato correttamente. Tento riparazione...
  if exist "node_modules\electron\install.js" call node "node_modules\electron\install.js"
)
call npm run startup:doctor
if errorlevel 2 (
  echo ERRORE critico: file runtime mancanti.
  pause
  exit /b 1
)
if errorlevel 3 (
  echo ERRORE: Electron non disponibile. Eseguire INSTALLA_AT_MEC_HM_8.0_AI_READY_ENTERPRISE_STABLE.bat e controllare rete/proxy.
  pause
  exit /b 1
)
REM Avvio normale sicuro diretto. NON esegue build.
call npm start
pause
