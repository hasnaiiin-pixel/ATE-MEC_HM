# AT-MEC_HM_4.17B_DATABASE_ENTERPRISE_STABILE

Versione basata su AT-MEC_HM_4.16H stabile.

## Obiettivo
Integrare 4.17A + 4.17B in un unico passaggio: Database Enterprise Foundation + consolidamento Enterprise.

## Implementato
- Nuovo `src/main/core/EnterpriseDatabase.ts`.
- Mirror enterprise per ricette, test report, step, serial history e riparazioni.
- Tabelle enterprise: users, roles, permissions, recipes, recipe_versions, test_results, test_steps, serial_history, firmware_history, repairs, devices, device_events, device_configs, production_stats, quality_stats.
- Dashboard Database Enterprise nella pagina Database.
- Migrazione manuale 4.17A+B da utenti/ruoli JSON e LocalDatabase.
- Verifica integrità.
- Backup Enterprise.
- Export Enterprise.
- Schema SQLite enterprise in `docs/sqlite_schema_enterprise.sql`.
- Supporto SQLite opzionale tramite `better-sqlite3` se installato; fallback automatico JSON Enterprise se non presente.

## Nota tecnica importante
Per non rompere la build stabile, il runtime resta local-first e non forza il modulo nativo SQLite. Se `better-sqlite3` è installato, viene creato anche `database/ate_mec_enterprise.db`; altrimenti l'app continua con `database/ate_mec_enterprise_db.json`.

## Test consigliati
1. Login admin.
2. Pagina Database → Stato Enterprise.
3. Database → Migra 4.17A+B.
4. Database → Verifica integrità.
5. Database → Backup Enterprise.
6. Salva una ricetta e verifica che il conteggio recipe_versions aumenti.
7. Esegui un test e verifica che il conteggio test_results aumenti.
8. Repair Center → salva riparazione e verifica repairs.
