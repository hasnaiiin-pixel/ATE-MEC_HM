@echo off
cd /d "%~dp0"
title BUILD AT-MEC_HM_8.0_AI_READY_ENTERPRISE_STABLE
echo Creazione installer Windows AT-MEC_HM_8.0_AI_READY_ENTERPRISE_STABLE...
call npm run runtime:validate
if errorlevel 1 (
  echo ERRORE: runtime validation fallita. Build annullata.
  pause
  exit /b 1
)
call npm run package:all
pause
