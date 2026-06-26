# AT-MEC_HM_4.23C_CLONE_STATION_RECOVERY

Release stabile successiva a 4.23B.

## Obiettivo
Aggiunge la funzione Clone Station sopra Backup & Restore Enterprise.

## Incluso
- Backup completo già presente in 4.23B.
- Scheduler e integrity check già presenti in 4.23B.
- Nuovo Clone Station export.
- Nuovo Clone Station import protetto.
- Checklist post-restore per nuova postazione.
- BAT aggiornati a 4.23C.
- README storici archiviati in `docs/releases`.

## Comandi
```bat
npm run backup:full
npm run backup:integrity
npm run clone:export
npm run clone:import backups\NOME_CLONE.zip
```

## Nota operativa
Dopo un clone su nuovo PC verificare sempre nome postazione, porte COM/USB, stampante predefinita, strumenti collegati e una ricetta campione in Test Mode.
