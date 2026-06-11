# AT-MEC_HM_3.15_TEST_LIGHT

Versione TEST LIGHT basata sulla 3.14, senza `node_modules`.

## Modifiche principali

- Export CSV filtrato dello storico test dalla pagina Database/KPI.
- Backup manuale database locale in `backups/database/`.
- Backup automatico giornaliero all'avvio applicazione.
- Pulsante PDF storico seriale/riparazioni richiamabile anche dalla pagina Database/KPI.
- KPI/storico mantenuti dalla 3.14.
- Multi-alimentatore/futuri alimentatori lasciati sospesi come richiesto.

## Avvio

```bash
npm install
npm start
```

## Note test

Questa non è ancora release stabile. Usarla per collaudare export, backup, storico seriali e KPI prima della stabile 3.15.
