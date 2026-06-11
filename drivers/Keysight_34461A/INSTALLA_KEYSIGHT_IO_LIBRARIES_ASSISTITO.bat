@echo off
echo AT-MEC HM - Installazione assistita Keysight IO Libraries Suite
echo.
echo Inserire nella cartella installers l'installer ufficiale Keysight IO Libraries Suite.
echo Esempio: IOLibSuite_*.exe
echo.
for %%f in (installers\*.exe) do (
  echo Avvio installer %%f
  start /wait "" "%%f"
  goto done
)
echo Nessun installer trovato in drivers\Keysight_34461A\installers
echo Scaricare Keysight IO Libraries Suite dal sito ufficiale Keysight.
:done
pause
