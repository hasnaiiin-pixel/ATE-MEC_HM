# AT-MEC_HM_6.3A_FIX1_LAUNCH_MAIN_FIX

Fix mirato per errore avvio Electron: `Cannot find module dist/main/main.js` / `main.js`.

## Correzioni
- Inclusa cartella `dist/main/` compilata nel pacchetto.
- `package.json` mantiene `main: dist/main/main.js`.
- Script `npm start` allineato a `electron dist/main/main.js`.
- Titolo applicazione aggiornato a 6.3A_FIX1.
- Nessuna modifica funzionale a Test Mode, Repository, Backup, Print, Audio o Hardware.

## Verifica
1. Estrarre ZIP.
2. Eseguire `npm install` se necessario.
3. Avviare con BAT o `npm start`.
4. Aprire Produzione → Production Execution.
