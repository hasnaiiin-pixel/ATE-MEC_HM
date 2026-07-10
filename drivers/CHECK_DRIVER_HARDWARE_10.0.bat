@echo off
cd /d "%~dp0\.."
title AT-MEC HM 10.0 - Check Driver Hardware
echo ============================================================
echo AT-MEC HM 10.0 - Check Driver Hardware
echo ============================================================
if not exist "logs" mkdir logs
powershell -NoProfile -ExecutionPolicy Bypass -File "drivers\driver_check_10_0.ps1"
pause
