# AT-MEC_HM_4.16C_APP_JS_FINAL_SPLIT

Baseline: AT-MEC_HM_4.16B_APP_JS_DEEP_SPLIT.

## Obiettivo
Ridurre drasticamente `src/renderer/js/app.js` senza cambiare comportamento runtime.

## Modifiche
- Estratto il core legacy completo in `src/renderer/js/modules/core/app-legacy-core.js`.
- `app.js` ora è solo bootstrap leggero.
- `index.html` carica prima `app-legacy-core.js`, poi `app.js`, poi i moduli già esistenti.
- Versione interna aggiornata a 4.16C in `package.json`, `index.html` e `version.js`.

## Nota tecnica
Questa è una fase di isolamento sicura: mantiene l'ordine di esecuzione e le funzioni globali esistenti.
Il prossimo passaggio professionale è dividere `app-legacy-core.js` in moduli funzionali veri, a piccoli blocchi testabili.

## Test consigliati
1. Login admin.
2. Utenti/Ruoli/Permessi.
3. Recipe Editor.
4. Test Mode.
5. Device Manager.
6. Traceability/Repair.
7. Report PDF.
