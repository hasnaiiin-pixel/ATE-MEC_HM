@echo off
echo Installazione dipendenza Python PyVISA per AT-MEC_HM Keysight USB/VISA...
py -3 -m pip install --upgrade pip
py -3 -m pip install pyvisa
if errorlevel 1 (
  echo ERRORE: installazione PyVISA fallita. Verificare Python 3 installato.
  pause
  exit /b 1
)
echo OK. Aprire Keysight Connection Expert e verificare USB0::...::INSTR.
pause
