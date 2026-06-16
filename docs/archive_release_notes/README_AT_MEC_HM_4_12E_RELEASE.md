# AT-MEC_HM_4.12E

Base stabile: AT-MEC_HM_4.12D_FIX1.

## Implementato

- Preparazione Data Provider Layer.
- Backend attivo invariato: JSON locale (`database/ate_mec_local_db.json`).
- Modalità LOCAL FIRST: il sistema salva sempre prima in locale.
- Nuova coda sync locale: `database/sync_queue.json`.
- Predisposizione server sync: se il server non è configurato o offline, il test non si blocca e i dati restano pending.
- Nuovo schema futuro SQLite: `docs/sqlite_schema_draft.sql`.
- Sezione stato sync in Archivio Dati.

## Non modificato

- Test Mode.
- Motore ricette.
- Hardware/ESP32/PL303/multimetro.
- Layout Editor.
- Recipe Editor.
- Report PDF 4.12D_FIX1.
- Storico Seriali, Scheda Unità, Analisi Produzione, Archivio Dati esistenti.

## Test consigliati

1. `npm install`
2. `npm run build`
3. `npm start`
4. Verificare Test Mode e ricette.
5. Generare un report PDF.
6. Aprire Archivio Dati e controllare Data Provider & Sync.
7. Verificare creazione/aggiornamento di `database/sync_queue.json` dopo un test.
