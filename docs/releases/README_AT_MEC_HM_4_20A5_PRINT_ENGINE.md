# AT-MEC_HM_4.20A5_PRINT_ENGINE

Baseline: `AT-MEC_HM_4.20A4_LABEL_INDUSTRIAL_INTEGRATION_FIX2`

## Obiettivo
Completare il layer industriale di stampa sopra la Label Platform esistente, senza riscrivere Label Designer, Runtime, QR/DataMatrix Builder o Test Mode.

## Nuove funzionalità
- Nuova pagina `Print Engine`
- Printer Manager con elenco stampanti installate / fallback demo
- Stampante predefinita
- Configurazione formato, orientamento, copie e ritardo
- Flag: Abilita stampante, Simula stampa, Auto PASS, Auto FAIL, Auto ERROR
- Print Queue Monitor
- Print History con ristampa
- Diagnostica base: default, driver, spooler, modalità
- Nuovo pulsante `Stampa` nel pannello etichetta del Test Mode
- Layer future-ready per Windows Printer, Zebra/ZPL, TSC/TSPL, PDF e network printer

## File principali aggiunti
- `src/renderer/partials/print-engine.html`
- `src/renderer/js/modules/printers/print-engine-420a5.js`
- `src/renderer/css/modules/14-print-engine.css`

## File modificati
- `src/renderer/index.html`
- `src/renderer/css/app.css`
- `src/renderer/js/version.js`
- `src/main/main.ts`
- `src/main/preload.ts`
- `package.json`

## Note stabilità
La 4.20A5 lavora come layer separato. Non sono stati riscritti i moduli stabili:
- Test Mode Engine
- Recipe Engine
- Device Manager
- Analytics
- Factory Dashboard
- Label Designer
- Label Runtime
