# AT-MEC_HM_6.6A_SQLITE_FOUNDATION

Release di fondazione per SQLite Enterprise Consolidation.

## Obiettivo
Preparare la migrazione verso SQLite senza cambiare ancora la sorgente dati principale.

## Incluso
- Nuova pagina **Impostazioni → Database Status**.
- Audit sorgenti dati attuali: JSON, config, localStorage runtime, API Test Mode.
- Schema iniziale SQLite Enterprise in `database/sqlite/enterprise_schema_66a.sql`.
- Script `npm run db:audit`.
- Script `npm run db:backup-pre-migration`.
- Backup pre-migrazione in `backups/pre_migration/`.
- Report audit in `docs/database/AT_MEC_HM_6_6A_DATABASE_AUDIT.json`.

## Cosa NON cambia
- Test Mode invariato.
- Ricette invariato.
- Repair Center invariato.
- Repository/Distribution invariato.
- Backup/Restore invariato.
- JSON/localStorage rimangono attivi.

## Test consigliato
1. Avvia app con `AVVIA_AT_MEC_HM_6.6A.bat`.
2. Apri **Impostazioni → Database Status**.
3. Premi **Aggiorna stato**.
4. Verifica che ricette, utenti e report vengano rilevati.
5. Esegui da terminale `npm run db:audit`.
6. Esegui `npm run db:backup-pre-migration`.
7. Verifica che Test Mode, Ricette, Repair Center e Production Execution funzionino ancora.

## Prossima release
`AT-MEC_HM_6.6B_CORE_DATA_MIGRATION`
