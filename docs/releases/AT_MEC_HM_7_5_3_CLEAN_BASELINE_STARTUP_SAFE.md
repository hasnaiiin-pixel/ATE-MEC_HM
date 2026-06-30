# AT-MEC_HM_7.5.3_CLEAN_BASELINE_STARTUP_SAFE

Release di fix avvio su base 7.5.2.

## Correzioni

- Startup doctor 7.5.3.
- BAT con cartella corrente forzata.
- Installazione dipendenze controllata.
- IotServer robusto su porta 8080 occupata.
- Nessun modulo duplicato aggiunto.

## Test obbligatori

- `npm run startup:doctor`
- `npm run runtime:validate`
- `npm run cleanup:audit`
- Avvio applicazione con BAT AVVIA.
