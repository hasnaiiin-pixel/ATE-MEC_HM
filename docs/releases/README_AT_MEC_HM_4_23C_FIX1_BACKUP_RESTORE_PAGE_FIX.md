# AT-MEC_HM_4.23C_FIX1_BACKUP_RESTORE_PAGE_FIX

## Scopo
Fix mirato per pagina **Backup & Restore** vuota nella release 4.23C.

## Correzioni
- Allineato ID tab: `backup-restore-423c-tab` tra menu, mount partial e JS.
- Aggiunto fallback renderer se il partial non viene caricato o risulta vuoto.
- Mantenute funzioni 4.23C: backup rapido HMI, scheduler, integrity check, clone station.
- Nessuna modifica a Test Mode, Ricette, Label, Print, Audio/Voice o Dashboard.

## Verifica
Aprire: **Impostazioni → Backup & Restore**.
La pagina deve mostrare:
- Backup rapido HMI
- Backup completo filesystem
- Restore protetto
- Integrità
- Clone Station
- Scheduler backup
- Checklist
- Log Backup & Restore
