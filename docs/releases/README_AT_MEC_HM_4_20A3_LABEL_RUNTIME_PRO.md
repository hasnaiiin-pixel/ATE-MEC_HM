# AT-MEC_HM_4.20A3_LABEL_RUNTIME_PRO

Base: AT-MEC_HM_4.20A2_LABEL_DESIGNER

## Obiettivo
Evoluzione Label Manager da semplice designer grafico a flusso industriale di stampa etichette collegato a ricette e test.

## Implementato
- caricamento ricette disponibili dal runtime/localStorage;
- selezione ricetta e revisione;
- binding template per ricetta;
- auto stampa configurabile PASS / FAIL / ERRORE;
- QR payload personalizzabile;
- DataMatrix payload personalizzabile;
- campi dinamici aggiunti: cliente, revisione ricetta, esito, QR payload, DataMatrix payload;
- funzione runtime `label420PrintFromTestResult(result)` predisposta per integrazione Test Mode;
- ristampa etichetta da seriale/commessa;
- log locale ristampe/stampe;
- gestione stampanti predisposta;
- fix leggibilità liste su tema scuro.

## Non toccato
- Login;
- ruoli/permessi;
- Test Mode engine;
- Device Manager;
- Factory;
- Analytics;
- Database backend.

## Test consigliato
1. Aprire Label Manager.
2. Cliccare Carica ricette.
3. Selezionare ricetta/revisione.
4. Personalizzare QR/DataMatrix.
5. Legare template a ricetta.
6. Provare ristampa da seriale/commessa.
7. Verificare F12.
