# AT-MEC_HM_3.95 - Release notes

Base: AT-MEC_HM_3.94 stabile.

## Obiettivo
Pulizia tecnica controllata della UI senza modificare il comportamento stabile del Layout Editor.

## Modifiche integrate
- Versione progetto aggiornata a 3.95.
- Aggiunto `src/renderer/js/ui-events.js`: registro eventi UI sicuro per evitare doppi bind nelle prossime funzioni.
- Collegato `ui-events.js` prima di `app.js`.
- Ridotta duplicazione dei log globali `error` / `unhandledrejection` in `app.js`.
- Mantenuto lo sblocco UI in caso di errore senza generare doppi messaggi nel log.
- Conservata la logica funzionante di Layout Editor 3.94: selezione, multi-selezione, allineamento, riferimento, dimensionamento, pannello mobile, ricerca a scomparsa e handle.

## Non modificato
- Ricette.
- Test Mode.
- ESP32 / PL303.
- Firmware.
- Database/config utente.
- Layout Editor funzionante della 3.94.

## Nota tecnica
La nuova utility `window.AT_MEC_UI_EVENTS` espone:
- `on(target, type, handler, options, key)`
- `off(target, type, key)`
- `report()`

Serve come base per centralizzare eventi nelle prossime revisioni senza rompere codice esistente.
