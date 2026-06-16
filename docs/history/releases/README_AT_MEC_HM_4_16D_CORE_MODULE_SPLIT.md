# AT-MEC_HM_4.16D_CORE_MODULE_SPLIT

Baseline: AT-MEC_HM_4.16C confermata funzionante.

## Obiettivo
Core Module Split reale: il file `app-legacy-core.js` non contiene più il monolite completo, ma solo un marker di compatibilità. Il codice legacy è stato diviso in 5 moduli ordinati e caricati da `index.html`.

## Moduli creati
- `src/renderer/js/modules/core/app-legacy-01-state-navigation.js`
- `src/renderer/js/modules/ui/app-legacy-02-dashboard-reports-ui.js`
- `src/renderer/js/modules/hardware/app-legacy-03-hardware-production.js`
- `src/renderer/js/modules/recipes/app-legacy-04-recipes-runtime.js`
- `src/renderer/js/modules/traceability/app-legacy-05-traceability-unit.js`

## Risultato
- `app.js`: bootstrap leggero.
- `app-legacy-core.js`: marker compatibilità.
- codice ordinato per aree funzionali senza cambiare comportamento.

## Non toccato
Login, ruoli, permessi, Device Manager, Test Mode engine, ricette, report e backend.

## Test consigliati
Login, utenti/ruoli, Device Manager, Recipe Editor, Test Mode, Report PDF, Storico Seriali, Scheda Unità.
