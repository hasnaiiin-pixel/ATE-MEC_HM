# AT-MEC HM 3.0 - Distribuzione Windows

Questa release contiene due modalità:

## 1. Sviluppo
Usare `AT-MEC_HM_3.0_DEV.zip`.

Comandi:
```bat
npm install
npm run build
npm start
```

## 2. Esecuzione su altro PC
Usare `AT-MEC_HM_3.0_DISTRIBUZIONE.zip`.

Sul PC target:
1. Estrai lo ZIP in una cartella locale, per esempio `C:\AT-MEC_HM_3.0`.
2. Esegui `INSTALLA_AT_MEC_HM_3.0.bat`.
3. Avvia con `AVVIA_AT_MEC_HM_3.0.bat`.

## Installer vero Windows
Per creare un `.exe` installer:
```bat
CREA_INSTALLER_WINDOWS.bat
```
Il file verrà creato in `dist_installer`.

## Driver
La cartella `drivers/` è predisposta per file `.inf`. Se aggiungi i driver reali, lo script `scripts/install_drivers_assistito.ps1` può installarli con `pnputil`.

## Nota importante
Questo pacchetto non include driver proprietari di terze parti se non sono stati forniti nel progetto.
