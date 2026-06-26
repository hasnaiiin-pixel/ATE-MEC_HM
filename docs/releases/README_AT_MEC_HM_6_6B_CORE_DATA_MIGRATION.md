# AT-MEC_HM_6.6B_CORE_DATA_MIGRATION

Baseline: AT-MEC_HM_6.6A_SQLITE_FOUNDATION stabile.

## Obiettivo
Consolidare i dati principali in una struttura SQLite Enterprise non distruttiva, mantenendo JSON/localStorage come compatibilità, backup ed export.

## Incluso
- Migrazione core data verso modello SQLite-ready.
- Utenti/Ruoli.
- Ricette.
- Test Results.
- Repair Center: ticket/interventi/allegati.
- Work Orders.
- Repository & Distribution.
- Configurazioni principali.
- Backup automatico pre-migrazione.
- Report migrazione.
- Script SQL generato.

## File generati
- `database/sqlite_enterprise_66b_migration.json`
- `database/sqlite_migration_66b.sql`
- `database/sqlite/enterprise_schema_66b.sql`
- `docs/database/AT_MEC_HM_6_6B_MIGRATION_REPORT.json`
- `backups/pre_migration/ATMEC_PRE_MIGRATION_66B_*`

## Script
```bash
npm run db:migrate
npm run db:migration-report
npm run db:backup-pre-migration
```

## Test consigliati
1. Avvio app.
2. Login utenti/ruoli.
3. Ricette visibili.
4. Test Mode PASS/FAIL.
5. Repair Center ticket/interventi.
6. Production Execution.
7. Repository & Distribution.
8. Backup/Restore.
9. Riavvio app e verifica persistenza.

## Note
In questa fase SQLite non forza ancora la rimozione dei JSON. La 6.6C renderà SQLite la sorgente principale stabile dopo validazione.
