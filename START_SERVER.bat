@echo off
cd /d "%~dp0"
title AT-MEC_HM_8.0_AI_READY_ENTERPRISE_STABLE
echo Avvio AT-MEC_HM_8.0_AI_READY_ENTERPRISE_STABLE...
call npm run startup:doctor
if errorlevel 2 (
  echo ERRORE critico: file runtime mancanti.
  pause
  exit /b 1
)
if errorlevel 3 (
  echo ERRORE: Electron non disponibile. Eseguire INSTALLA_AT_MEC_HM_8.0_AI_READY_ENTERPRISE_STABLE.bat.
  pause
  exit /b 1
)
call npm start
pause
