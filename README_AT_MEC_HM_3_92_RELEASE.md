# AT-MEC_HM_3.92 TEST LIGHT

Base stabile: AT-MEC_HM_3.91.

## Obiettivo
Pulizia strutturale controllata dopo la 3.91, senza cambiare logica operativa di Test Mode, ricette, ESP32, PL303, report o utenti.

## Modifiche integrate
- Consolidati i file patch del Layout Editor in:
  - `src/renderer/css/layout-editor.css`
  - `src/renderer/js/layout-editor.js`
- Mantenuto il Layout Editor consolidato e aggiunto controllo qualità statico del progetto.
- Aggiornata versione visibile UI a 3.92.
- Rinominato il file versione UI in `src/renderer/js/version.js`, così nelle prossime release non serve cambiare nome file.
- Aggiornato `package.json` a `3.92.0-test-light`.
- Aggiornati file batch di installazione/avvio a 3.92.
- Aggiunto `scripts/project_audit.js` e report `docs/quality/PROJECT_AUDIT_3.92.md`.
- Mantenuta la separazione CSS/JS introdotta in 3.90/3.91.

## Note importanti
Questa release non rimuove funzioni applicative e non rifattorizza ancora `app.js`, così la stabilità della 3.91 resta protetta.
La pulizia più profonda delle funzioni duplicate può partire dalla 3.93.
