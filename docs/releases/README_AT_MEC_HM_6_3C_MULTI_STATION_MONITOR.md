# AT-MEC_HM_6.3C_MULTI_STATION_MONITOR

Baseline: AT-MEC_HM_6.3B_WORK_ORDER_RUNTIME.

## Obiettivo
Aggiunge il monitor multi-postazione alla pagina Production Execution, usando dati reali già presenti nel sistema.

## Incluso
- Multi Station Monitor nella pagina Production Execution.
- Elenco postazioni da Station Manager/Repository 4.24B oppure da `station_id` salvato nei report.
- Stato postazioni: Online / Offline / Testing / Error.
- Ultima attività, operatore, commessa, ricetta e KPI per postazione.
- Aggiunta postazione automatica ATE-01, ATE-02, ecc.
- Export JSON aggiornato a 6.3C.
- BAT aggiornati a 6.3C.
- README vecchi archiviati in `docs/releases`.

## Cosa provare
1. Aprire **Produzione → Production Execution**.
2. Premere **Aggiorna dati reali**.
3. Verificare pannello **Multi Station Monitor**.
4. Premere **Aggiungi postazione** e controllare creazione ATE-01/ATE-02.
5. Verificare tabella: Postazione, Stato, Ultima attività, Operatore, Commessa, Ricetta, PASS/FAIL/ERROR/Yield.
6. Verificare che Work Order Runtime 6.3B continui a funzionare.

## Non modificato
- Test Mode.
- Recipe runtime.
- Hardware/Device Manager.
- Repository & Distribution.
- Backup & Restore.
- Print Engine.
- Audio & Voice.
