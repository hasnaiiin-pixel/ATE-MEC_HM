# AT-MEC_HM_3.90 TEST LIGHT

Base: AT-MEC_HM_3.79_TEST_LIGHT stabile.

## Obiettivo
Pulizia controllata del progetto senza cambiare la logica funzionale stabile.

## Modifiche integrate
- Aggiornato package.json a 3.90.0-test-light.
- Separato renderer monolitico in:
  - src/renderer/index.html
  - src/renderer/css/*.css
  - src/renderer/js/*.js
- Mantenuto ordine di caricamento originale di CSS e script.
- Spostati README storici in docs/history.
- Rimossi file temporanei di controllo renderer dalla root.
- Aggiornata configurazione electron-builder per includere src/renderer/**/* nel pacchetto.

## Nota importante
Questa versione è una base di pulizia tecnica: conserva il comportamento della 3.79 e prepara il progetto per pulizia funzioni duplicate nelle versioni 3.91+.
