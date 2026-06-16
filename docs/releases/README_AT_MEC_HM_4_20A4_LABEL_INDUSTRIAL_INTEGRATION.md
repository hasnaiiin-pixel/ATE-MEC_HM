# AT-MEC_HM_4.20A4_LABEL_INDUSTRIAL_INTEGRATION

Base: AT-MEC_HM_4.20A3_LABEL_RUNTIME_PRO.

## Modifiche principali
- Payload QR/DataMatrix tramite builder a flag: seriale, commessa, lotto, cliente, ricetta, revisione, firmware, operatore, stazione, esito, data/ora, report ID.
- Menu separatori e simboli speciali per payload.
- Ricette caricate da runtime, localStorage, API list/loadRecipe e ricetta corrente.
- Parametri ricetta importati: nome, revisione, cliente, firmware, prodotto/part number dove disponibili.
- Associazione ricetta -> template PASS/FAIL/ERROR/REPAIR.
- Flag auto-stampa PASS/FAIL/ERRORE e conferma prima stampa.
- Integrazione Test Mode su run-completed e fail finalize con log auto-stampa.
- Formato etichetta custom W/H in mm.
- Import/Export template etichette.
- Sezione Label Configuration nel Recipe Editor.
- Storico stampe/ristampe predisposto.

## Non modificato
- Login, ruoli, permessi.
- Device Manager backend.
- Test engine backend.
- Database backend.

## Test suggeriti
1. Aprire Label Manager.
2. Premere Carica ricette reali.
3. Selezionare una ricetta e verificare revisione, cliente, firmware.
4. Scegliere flag payload QR/DataMatrix e generare.
5. Configurare template PASS/FAIL/ERROR e auto-stampa.
6. Salvare binding ricetta.
7. Eseguire Test Mode e verificare log auto-stampa.
8. Testare Export/Import template.
