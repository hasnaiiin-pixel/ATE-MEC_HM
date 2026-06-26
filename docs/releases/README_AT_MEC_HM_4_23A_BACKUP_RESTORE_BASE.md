# AT-MEC_HM_4.23A_BACKUP_RESTORE_BASE

Baseline precedente stabile: **AT-MEC_HM_4.22A_UI_NAVIGATION_CLEANUP**.

## Obiettivo
Prima release base del sistema Backup & Restore Enterprise.

## Incluso
- Pagina **Backup & Restore** sotto **Impostazioni**.
- Backup rapido HMI in JSON dal renderer.
- Script Node per backup completo filesystem.
- Script Node per restore protetto con backup pre-restore.
- Checklist contenuti backup.
- Log locale Backup & Restore.
- Versioning coerente 4.23A.
- BAT aggiornati a 4.23A.
- README storici spostati in `docs/releases/`.

## Comandi
```bat
npm run backup:full
npm run backup:list
npm run backup:check
node scripts/backup_restore_423a.js restore backups\NOME_BACKUP.zip
```

## Contenuto backup completo
- database
- config
- recipes
- data
- assets/audio
- src/renderer/partials
- src/renderer/js/modules
- src/renderer/css/modules
- hardware_calibration.json
- remote_dashboard.html
- package.json

## Note
La 4.23A è volutamente base. Scheduler, retention e clone station restano per 4.23B/4.23C.
