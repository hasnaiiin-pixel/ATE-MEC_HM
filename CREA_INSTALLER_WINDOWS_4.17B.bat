@echo off
cd /d "%~dp0"
echo Creazione installer AT-MEC HM 4.17B...
npm run package:portable
pause
