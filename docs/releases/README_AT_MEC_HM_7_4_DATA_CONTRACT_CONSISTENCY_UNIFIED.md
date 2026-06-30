# AT-MEC_HM_7.4_DATA_CONTRACT_CONSISTENCY_UNIFIED

Base stabile: AT-MEC_HM_7.3_ENTERPRISE_BACKBONE_UNIFIED.

Questa release unifica gli step 7.4A e 7.4B in una sola versione.

## 7.4A Enterprise Data Model Contract

- Data Contract enterprise per WO, Commessa, Serial Number, Cliente, Prodotto, Codice scheda, Ricetta, Revisione, Firmware, Operatore, Stazione, Esito Test e Repair.
- Contesto unificato `atmec74_unified_context`.
- Contract esportabile `atmec74_enterprise_data_contract`.
- Pannello integrato nel Backbone esistente.

## 7.4B Consistency & Safe Migration

- Report `atmec74_consistency_report`.
- Scansione e classificazione chiavi legacy.
- Rilevazione mismatch tra sorgenti dati.
- Normalizzazione non distruttiva con backup `atmec74_last_migration_backup`.
- Compatibilità verso chiavi WO legacy.

## Vincoli rispettati

- Nessun nuovo modulo duplicato di Traceability, MES, Factory, Analytics o Repair.
- Nessuna modifica a Test Engine, Device Manager, PL303, multimetro, strumenti o ricette.
- Release maintenance: package, package-lock, BAT, README e UI label aggiornati.
