@echo off
cd /d "%~dp0\.."
title AT-MEC HM 10.0 - Installazione Driver Hardware
echo ============================================================
echo AT-MEC HM 10.0 - Installazione Driver Hardware
echo ============================================================
if not exist "logs" mkdir logs
powershell -NoProfile -ExecutionPolicy Bypass -File "drivers\driver_install_10_0.ps1"
echo.
echo Controllo driver...
call "drivers\CHECK_DRIVER_HARDWARE_10.0.bat"
pause
