# AT-MEC_HM_4.16A_APP_JS_SPLIT - Mappa moduli renderer

Questa revisione non aggiunge funzioni operative: separa parti append-only del vecchio `app.js` in moduli classici caricati dopo `app.js`.

## File core mantenuto

- `src/renderer/js/app.js`
  - Core legacy
  - Startup/UI principale
  - Login, utenti, ruoli, permessi, produzione, ricette base, storico base
  - Compatibilità globale `window.*`

## Moduli estratti

- `src/renderer/js/modules/device-manager/device-manager-core.js`
  - Device Manager unificato 4.13O

- `src/renderer/js/modules/collaborators/collaborator-profile-roles.js`
  - Profilo collaboratore
  - UI ruoli/collaboratori
  - refinement autorizzazioni

- `src/renderer/js/modules/device-manager/device-manager-enterprise.js`
  - Heartbeat, reconnect, pre-check, emergency, config center, diagnostic center, enterprise panel

- `src/renderer/js/modules/recipe/recipe-enterprise-pro.js`
  - Recipe Logic Pro
  - Recipe Flow Pro
  - Recipe Enterprise Pro
  - Test Engine Pro

- `src/renderer/js/modules/traceability/traceability-repair-pro.js`
  - Traceability & Repair Pro
  - Genealogia estesa
  - Repair Center rapido

## Regola di compatibilità

I moduli sono caricati come script classici, non `type="module"`, per mantenere la compatibilità con funzioni globali e handler `onclick` presenti in `index.html`.

## Test regressione obbligatori

1. Login admin.
2. Utenti/ruoli/permessi realtime.
3. Profilo collaboratore.
4. Device Manager Enterprise.
5. Recipe Editor + Recipe Pro panels.
6. Test Mode.
7. Storico Seriali / Scheda Unità / Repair Pro.
