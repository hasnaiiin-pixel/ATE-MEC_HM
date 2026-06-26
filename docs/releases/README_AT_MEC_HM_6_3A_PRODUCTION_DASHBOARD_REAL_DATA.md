# AT-MEC_HM_6.3A_PRODUCTION_DASHBOARD_REAL_DATA

Baseline: AT-MEC_HM_4.24B_FIX6_STABILE.

## Obiettivo
Aggiunge la prima dashboard Production Execution collegata a dati reali gia presenti nel progetto.

## Sorgenti dati usate
- `api.getAuditHistory()` / `AuditSystem`
- cache runtime `auditCache`, `testReports`, `serialHistory`
- fallback `database/ate_mec_local_db.json`
- Work Orders locali `atmec60_workorders` per target/residuo quando disponibili

## Moduli aggiunti
- Menu Produzione → Production Execution
- Partial `src/renderer/partials/production-execution-63a.html`
- JS `src/renderer/js/modules/factory/production-execution-63a.js`
- CSS `src/renderer/css/modules/21-production-execution.css`

## Cosa provare
1. Apri app e login.
2. Vai in **Produzione → Production Execution**.
3. Premi **Aggiorna dati reali**.
4. Verifica KPI: Test totali, PASS, FAIL, ERROR, Yield, Throughput oggi.
5. Verifica tabelle: Avanzamento per commessa, KPI per ricetta, Ultimi test produzione.
6. Cambia filtro Commessa / Ricetta / Periodo.
7. Verifica console: nessun errore JS bloccante.

## Non modificato
- Test Mode
- Ricette runtime
- Hardware / Device Manager
- Repository & Distribution
- Backup & Restore
- Print Engine
- Audio & Voice

## Nota roadmap
La 6.3A non forza ancora target/prodotte/residuo nel runtime Work Order. Il collegamento pieno Test Mode → Work Order Runtime e completamento quantità è previsto in 6.3B.
