# AT-MEC_HM_10.1.12_STABLE_ACTION_UNIQUE_FAST_START_FIX

## Obiettivo
Correzione mirata su Test Mode e StableMeasurement senza modificare il flusso manuale già funzionante della 10.1.11.

## Modifiche implementate
- Eliminato il secondo pannello legacy a destra dopo FAIL StableMeasurement.
- Il fallback manuale StableMeasurement resta gestito da un unico popup Action live.
- Soppressi `manual-step-modal`, `fault-panel`, `fail-decision-modal` e `atmec66d-action-strip` quando è attivo il popup live StableMeasurement.
- Migliorata reattività START/F1: se seriale e commessa/WO sono già presenti, il gate operatore viene saltato e il test parte subito.
- Evitato doppio auto-connect da dashboard: la connessione strumenti viene controllata una sola volta da `startTest()`.
- Ridotto blocco iniziale: `recoverFault()` viene atteso solo se lo stato precedente è FAULT/ERROR; negli altri casi è non bloccante.
- Aggiunta protezione anti doppio F1/START durante avvio o gate già aperto.
- Feedback immediato in log e stato `STARTING` / `AVVIO TEST` al primo click.

## File modificati
- `src/renderer/js/modules/ui/action-live-measurement-1012.js`
- `src/renderer/js/modules/traceability/app-legacy-05-traceability-unit.js`
- `src/renderer/js/modules/ui/test-mode-ux-66d.js`
- `src/renderer/js/modules/ui/test-mode-start-workflow-66e-fix1e.js`
- `src/renderer/js/modules/ui/app-legacy-02-dashboard-reports-ui.js`
- `src/renderer/js/modules/recipes/app-legacy-04-recipes-runtime.js`
- `src/renderer/css/modules/45-action-live-measurement-1012.css`

## Verifica operatore
1. Avvia Test Mode con ricetta StableMeasurement.
2. Forza FAIL/multimetro non valido.
3. Deve rimanere solo il popup Action centrale/live, senza pannello azione laterale a destra.
4. Inserisci valore fallback e conferma: il test deve avanzare come in 10.1.11.
5. Con seriale e commessa già presenti, premi START o F1 una sola volta: deve comparire subito stato avvio e partire senza doppio click.
