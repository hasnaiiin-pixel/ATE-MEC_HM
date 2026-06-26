# AT-MEC_HM_6.3C_FIX1_PRODUCTION_MENU_REFACTOR

Fix mirato su 6.3C.

## Correzioni
- Production Execution separata dalla Dashboard principale.
- Menu Produzione con voci dedicate: Production Execution, Work Order Runtime, Multi Station Monitor.
- Pulsante globale Dashboard/Home sempre visibile in alto.
- Rimossi valori placeholder derivati da qtyCompleted demo: le prodotte PASS vengono calcolate solo dagli esiti reali.
- Server IIoT/WebSocket su porta 8080 reso non bloccante: se la porta è occupata, l'HMI parte comunque.
- README storici archiviati in docs/releases.
- BAT aggiornati a 6.3C_FIX1.

## Test richiesti
1. Avvio app senza blocco EADDRINUSE su 8080.
2. Pulsante Dashboard torna sempre alla Factory Command Center.
3. Produzione -> Production Execution apre solo la pagina produzione, senza sovrapporre la Dashboard.
4. Produzione -> Work Order Runtime mostra solo runtime commessa.
5. Produzione -> Multi Station Monitor mostra solo monitor postazioni.
6. Verificare che Test Mode, Repository, Backup, Print e Audio non siano cambiati.
