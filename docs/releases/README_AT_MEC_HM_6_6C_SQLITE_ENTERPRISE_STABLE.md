# AT-MEC_HM_6.6C_SQLITE_ENTERPRISE_STABLE

Baseline: AT-MEC_HM_6.6B_CORE_DATA_MIGRATION stabile.

## Obiettivo
Consolidamento finale blocco SQLite Enterprise senza rimuovere la compatibilità JSON/local-first.

## Incluso
- Database Status Enterprise
- Integrity Check
- Audit Trail centralizzato/report
- Backup SQLite Enterprise
- Performance Check
- Cleanup report legacy/duplicati
- Report diagnostici in `docs/database/`
- Script database 6.6C
- BAT aggiornati a 6.6C
- README storici archiviati in `docs/releases/`

## Script
- `npm run db:enterprise-status`
- `npm run db:integrity`
- `npm run db:audit-trail`
- `npm run db:backup-sqlite`
- `npm run db:performance`
- `npm run db:cleanup-report`

## Test consigliato
1. Avvia con `AVVIA_AT_MEC_HM_6.6C.bat`.
2. Vai in Impostazioni → Database Status.
3. Premi Aggiorna stato.
4. Premi Integrity Check.
5. Verifica Audit Trail e Performance.
6. Esegui `npm run db:enterprise-status`.
7. Esegui `npm run db:backup-sqlite`.
8. Verifica che Test Mode, Ricette, Repair Center e Production Execution funzionino ancora.
