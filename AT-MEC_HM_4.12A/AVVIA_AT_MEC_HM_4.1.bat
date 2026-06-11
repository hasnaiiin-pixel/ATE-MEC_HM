@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js non trovato. Esegui prima INSTALLA_AT_MEC_HM_4.1.bat
  pause
  exit /b 1
)
if not exist node_modules (
  echo Dipendenze non installate. Esegui prima INSTALLA_AT_MEC_HM_4.1.bat
  pause
  exit /b 1
)
if not exist dist\main\main.js (
  echo Build non trovata. Compilo...
  call npm run build
)
call npm start
