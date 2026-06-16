# AT-MEC_HM_4.16B_APP_JS_DEEP_SPLIT

Baseline: 4.16A confermata funzionante.

## Obiettivo
Seconda fase di modularizzazione controllata di `src/renderer/js/app.js`.

## Modifiche
- Estratto blocco PL303 UI/control in `src/renderer/js/modules/hardware/pl303-control.js`.
- Estratto blocco report/layout/topbar/branding legacy in `src/renderer/js/modules/reports/reports-layout-sync.js`.
- Aggiornato `index.html` con i nuovi script.
- Aggiornata versione interna a 4.16B.

## Non modificato
Login, utenti, ruoli, permessi, Device Manager backend, Test Mode backend, ricette, report backend e hardware backend.

## Verifiche consigliate
1. Login admin.
2. Utenti/Ruoli/Permessi.
3. PL303 page e OFF sicuro.
4. Test Mode.
5. Report PDF.
6. Device Manager.
