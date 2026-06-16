# AT-MEC_HM_4.16E_INDEX_HTML_SPLIT_SAFE

Baseline: AT-MEC_HM_4.16D_CORE_MODULE_SPLIT.

Intervento safe in due step: questa è la prima metà dello split HTML.

## Modifiche
- Creato `src/renderer/partials/`.
- Estratti da `index.html`:
  - Device Manager
  - Test Report
  - Storico Seriali
  - Scheda Unità
  - Utenti & Ruoli
  - Profilo Collaboratore
- Aggiunto loader sincrono locale dei partials prima degli script applicativi.
- Versione interna aggiornata a 4.16E.

## Non toccato
- Login, utenti, ruoli, permessi.
- Test Mode engine.
- Recipe Editor.
- Layout Editor.
- Backend, hardware, report generator.

## Test consigliato
Login, utenti/ruoli, profilo collaboratore, Device Manager, report, storico seriali, scheda unità, Test Mode.
