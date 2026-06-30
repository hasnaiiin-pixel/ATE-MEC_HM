# AT-MEC_HM_7.3_ENTERPRISE_BACKBONE_UNIFIED

Release unica di consolidamento dalla base stabile 6.9B.

## Scopo

Il progetto contiene gia moduli avanzati per Traceability, Repair, MES Ready, Production Execution, Factory Enterprise e Analytics. Questa versione non crea pagine duplicate: aggiunge un livello Backbone che legge i moduli esistenti, li audita e crea un contesto dati comune.

## Incluso

- Enterprise Backbone Center dentro Enterprise Stable.
- Audit moduli esistenti: Test Mode, WO/MES, Traceability, Repair, Production Execution, Factory, Analytics, Database, Sync.
- Contesto unificato in localStorage: `atmec73_enterprise_backbone`.
- Audit esportabile in localStorage: `atmec73_enterprise_audit`.
- Lettura normalizzata Work Orders da:
  - `atmec67b_mes_ready`
  - `atmec_active_work_order`
  - `atmec_selected_work_order_for_test`
  - `atmec_current_work_order`
  - `atmec60_workorders`
- Sincronizzazione compatibile delle chiavi WO attive per i moduli esistenti.
- Rilevazione gap senza duplicare funzionalita.

## Cosa non fa

- Non riscrive Test Mode.
- Non crea un nuovo Traceability.
- Non crea un nuovo MES.
- Non crea una nuova dashboard Factory.
- Non crea una nuova pagina Analytics.
- Non connette un MES reale se endpoint/SQL/Access non sono configurati.

## Test consigliati

1. Avviare `AVVIA_AT_MEC_HM_7.3_ENTERPRISE_BACKBONE_UNIFIED.bat`.
2. Aprire Impostazioni -> Enterprise Backbone 7.3.
3. Premere `Aggiorna backbone`.
4. Verificare score, moduli ready/local/check e gap rilevati.
5. Selezionare una WO in Test Mode o Work Orders / MES Ready.
6. Tornare in Enterprise Backbone 7.3 e premere `Sincronizza contesto`.
7. Verificare che Work Orders normalizzati mostrino WO, cliente, scheda, ricetta, TOT/PASS/FAIL/RES.
8. Esportare JSON e verificare presenza di `version`, `activeWorkOrder`, `modules`, `issues`.
