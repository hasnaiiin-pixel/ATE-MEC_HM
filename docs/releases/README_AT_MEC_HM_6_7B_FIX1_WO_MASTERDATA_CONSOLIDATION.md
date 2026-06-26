# AT-MEC_HM_6.7B_FIX1_WO_MASTERDATA_CONSOLIDATION

Fix di consolidamento 6.7B.

## Correzioni
- Rimossi dal menu i doppioni legacy: `Work Orders / Product Master` e `Firmware / Revisioni`.
- Sorgente dati ufficiale: `Master Data Enterprise` per clienti/prodotti/schede/revisioni/firmware.
- Sorgente WO ufficiale: `Work Orders / MES Ready`.
- `Work Order Runtime` resta solo monitor runtime produzione, non anagrafica.
- Aggiunta funzione `IMPOSTA ATTIVA` su Work Orders.
- Aggiunto pannello `Work Order attiva`.
- La WO attiva viene salvata in `atmec_active_work_order` e in `atmec67b_mes_ready.activeWorkOrderId`.

## Test consigliati
1. Aprire Master Data e verificare anagrafiche.
2. Aprire Work Orders / MES Ready.
3. Creare o aprire una WO.
4. Premere `IMPOSTA ATTIVA`.
5. Verificare pannello `Work Order attiva`.
6. Verificare che i menu legacy doppi non siano più visibili.
