# AT-MEC_HM_6.3B_WORK_ORDER_RUNTIME

Baseline: AT-MEC_HM_6.3A_FIX2 stabile + 4.24B_FIX6 stabile.

## Novità
- Production Execution collegata ai Work Orders reali.
- Runtime commessa con Target / Prodotte PASS / Residuo.
- Sincronizzazione avanzamento Work Order da esiti reali salvati in AuditSystem / LocalDatabase.
- Stati Work Order: Running, Hold, Completed.
- Audit runtime Work Order.
- Export JSON produzione + runtime.

## Cosa provare
1. Apri **Production Execution**.
2. Premi **Aggiorna dati reali**.
3. Seleziona una commessa dal filtro.
4. Verifica Target / Prodotte / Residuo.
5. Premi **Sincronizza avanzamento WO**.
6. Verifica che Work Order Manager mostri la quantità prodotta aggiornata.
7. Prova Running / Hold / Completed.

## Note
La release non modifica Test Mode, Hardware, Repository, Backup, Print o Audio.

Avvio: `AVVIA_AT_MEC_HM_6.3B.bat`
