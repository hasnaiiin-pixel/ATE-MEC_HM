@echo off
cd /d "%~dp0"
title INSTALLA AT-MEC_HM_8.0_AI_READY_ENTERPRISE_STABLE
echo Installazione dipendenze AT-MEC_HM_8.0_AI_READY_ENTERPRISE_STABLE...
if not exist "package.json" (
  echo ERRORE: package.json non trovato. Estrarre lo ZIP completo prima di avviare.
  pause
  exit /b 1
)
call npm install
if errorlevel 1 (
  echo ERRORE: npm install non riuscito.
  pause
  exit /b 1
)
call npm run runtime:validate
if errorlevel 1 (
  echo ATTENZIONE: validazione runtime non riuscita. Controllare messaggi sopra.
  pause
  exit /b 1
)
echo Installazione completata.
pause
