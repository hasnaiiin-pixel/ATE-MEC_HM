# AT-MEC_HM_4.16F_INDEX_HTML_FINAL_SPLIT

Base: AT-MEC_HM_4.16E_INDEX_HTML_SPLIT_SAFE.

## Modifiche
- Secondo step di split HTML.
- Estratte in `src/renderer/partials/` le sezioni ancora presenti in `index.html`: Test Mode, Multimetro, PL303, Serial Terminal, QR, Flash, Database, Analisi Produzione, Archivio Dati, Recipe Editor, ESP32, Branding e Settings.
- `index.html` ridotto a shell HMI + loader partials + modal condivisi.
- Versione interna aggiornata a 4.16F.

## Non modificato
- Login, utenti, ruoli, permessi.
- Backend Electron, preload, UserManager.
- Test Mode engine, hardware backend, report backend.

## Test consigliati
1. Login admin.
2. Apertura tutte le tab principali.
3. Recipe Editor e Test Mode.
4. Device Manager.
5. Report PDF, Storico Seriali, Scheda Unità.
