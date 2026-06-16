# AT-MEC_HM_4.18B_FACTORY_ENTERPRISE_FIX4

Fix mirato:
- la barra superiore ora legge i dati salvati in Factory Enterprise;
- salvataggio postazione aggiorna subito Station ID e Nome postazione in alto;
- persistenza via localStorage keys legacy compatibili con topbar/report;
- fallback a DESKTOP/Postazione locale solo se non esiste configurazione.

File modificati:
- src/renderer/js/modules/factory/factory-enterprise-418b.js
- src/renderer/js/modules/reports/reports-layout-sync.js
- package.json / package-lock.json
