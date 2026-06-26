# AT-MEC_HM_4.23B_BACKUP_SCHEDULER_INTEGRITY

Baseline stabile precedente: **AT-MEC_HM_4.23A_BACKUP_RESTORE_BASE**.

## Obiettivo

Estendere il Backup & Restore base con scheduler, retention e verifica integrità, mantenendo stabile tutto il resto del progetto.

## Funzioni aggiunte

- Scheduler backup ON/OFF.
- Frequenza backup: giornaliero, settimanale, mensile.
- Orario configurabile.
- Retention configurabile dei backup ZIP.
- Manifest backup con lista file e SHA256.
- Verifica integrità da interfaccia HMI.
- Script `npm run backup:integrity`.
- Script `npm run backup:run-scheduled`.
- BAT aggiornati a versione 4.23B.
- README vecchi archiviati in `docs/releases`.

## Comandi

```bat
npm run backup:full
npm run backup:list
npm run backup:integrity
npm run backup:run-scheduled
node scripts\backup_restore_423b.js schedule on daily 02:00 20
node scripts\backup_restore_423b.js restore backups\NOME_BACKUP.zip
```

## Note

La schedulazione 4.23B salva la configurazione e prepara l'esecuzione controllata. Per l'esecuzione automatica Windows si può collegare `npm run backup:run-scheduled` a Utilità di Pianificazione di Windows.

## Compatibilità

Non modifica Test Mode, Ricette, Hardware, Label, Print Engine, Audio/Voice o Manufacturing.
