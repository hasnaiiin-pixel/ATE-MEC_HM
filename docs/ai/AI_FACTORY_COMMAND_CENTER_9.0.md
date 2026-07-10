# AI Factory Command Center 9.0

Release: `AT-MEC_HM_9.0_AI_FACTORY_COMMAND_CENTER`

Questa release aggiunge una vista centrale AI sopra i moduli esistenti. Non crea nuovi moduli Traceability, Repair, Analytics, MES, Factory, Work Orders o Data Contract.

## Funzioni

- Supervisione read-only produzione / WO.
- Rischio AI Factory con stato GREEN / YELLOW / RED.
- Lettura stato AI Ready 8.0.
- Lettura provider AI e coda approvazioni.
- Lettura segnali locali di Analytics, Repair, Traceability, Factory, Device Manager e Ricette.
- Lista anomalie e azioni consigliate.
- Export JSON `AT_MEC_HM_9_0_AI_FACTORY_COMMAND_REPORT_*.json`.

## Regole sicurezza

- Nessuna modifica automatica a ricette.
- Nessuna modifica automatica a WO / Commessa.
- Nessuna modifica automatica a utenti.
- Nessuna modifica automatica a test o hardware.
- Approvazioni solo come registro decisione.
- API key non esportata.
