@echo off
cd /d "%~dp0"
echo Creo installer Windows NSIS + Portable...
call npm install
if errorlevel 1 pause & exit /b 1
call npm run package:all
if errorlevel 1 pause & exit /b 1
echo Installer creati in dist_installer\
pause
