# AT-MEC_HM_3.16_TEST_LIGHT

Release LIGHT senza node_modules. Dopo estrazione eseguire:

```bash
npm install
npm start
```

## Modifiche principali 3.16

- Gestione lotti/commesse nel pannello Database/KPI.
- Riepilogo lotto con test totali, seriali unici, PASS, FAIL e yield.
- Export CSV lotto.
- Report lotto stampabile/PDF tramite finestra browser.
- Ricerca avanzata per lotto, seriale ed esito.
- Firma operatore base salvata localmente e inserita nel report lotto.
- Validazione ricette con controllo step mancanti, tolleranze, IF FAIL e loop.

## Sospeso intenzionalmente

- Multi-alimentatore e driver alimentatori futuri: non sviluppati in questa revisione.
