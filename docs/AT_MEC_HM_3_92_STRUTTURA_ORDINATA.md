# AT-MEC_HM_3.92 - Struttura ordinata

Base: AT-MEC_HM_3.91 stabile.

## Obiettivo
Continuare la pulizia tecnica senza cambiare la logica operativa stabile.

## Interventi
- Versione progetto aggiornata a 3.92.
- File versione UI rinominato da `version-391.js` a `version.js` per evitare rinomini a ogni release.
- Riferimenti renderer aggiornati a `js/version.js`.
- Aggiunto controllo qualità statico `scripts/project_audit.js`.
- Aggiunto report leggibile in `docs/quality/PROJECT_AUDIT_3.92.md`.
- Mantenuta compatibilità con CSS/JS separati introdotti nelle versioni 3.90/3.91.

## Scelta tecnica
Non è stato diviso ulteriormente `app.js` in questa release per non rischiare regressioni sul Test Mode, ricette, ESP32, PL303, report e utenti.
La divisione modulare profonda è consigliata per 3.93/3.94 dopo test pratico della 3.92.
