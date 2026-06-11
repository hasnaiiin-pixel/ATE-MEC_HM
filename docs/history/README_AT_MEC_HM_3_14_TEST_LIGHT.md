# AT-MEC_HM_3.14_TEST_LIGHT

Versione LIGHT di test, senza `node_modules`.

## Modifiche principali

- Storico seriali e riparazioni migliorato nella pagina Database/KPI.
- Ricerca per seriale con lista test precedenti e note riparazione.
- Salvataggio manuale note riparazione da HMI.
- KPI produzione ampliati:
  - trend giornaliero,
  - top guasti / step FAIL,
  - KPI per ricetta,
  - ultimi dati dal database locale.
- Database locale AT-MEC potenziato per test report, ricette versionate e riparazioni.
- Recipe Builder ampliato:
  - template avanzati per variabili,
  - IF FAIL -> step,
  - loop base,
  - campi “salva variabile” e “usa variabile” sugli step manuali/misure.
- Multi-alimentatore NON incluso in questa release, come richiesto.

## Avvio

```bash
npm install
npm start
```

## Nota

Questa è una versione TEST_LIGHT per collaudo. Dopo conferma funzionale può diventare release stabile `AT-MEC_HM_3.14.zip`.
