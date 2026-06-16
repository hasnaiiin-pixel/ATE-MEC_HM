# AT-MEC_HM_4.15B_TRACEABILITY_REPAIR_PRO

Baseline: AT-MEC_HM_4.15A_TEST_ENGINE_PRO.

## Implementato

- Traceability & Repair Pro su Storico Seriali.
- Genealogia unità estesa su Scheda Unità.
- KPI: test, PASS, FAIL, FPY, riparazioni, tempo medio.
- Timeline completa seriale con test e interventi.
- Repair Center rapido con salvataggio tramite API esistente `addRepairRecord` e fallback locale.
- Top difetti/cause, firmware/versioni, operatori e ricette coinvolte.
- Versione interna aggiornata a 4.15B.

## Non modificato

Login, utenti, ruoli, permessi, Device Manager backend, Test Mode engine, ricette, report e hardware backend.

## Test consigliati

1. Login admin.
2. Apri Storico Seriali.
3. Cerca un seriale.
4. Verifica pannello Traceability & Repair Pro.
5. Salva un intervento repair.
6. Apri Scheda Unità e verifica Genealogia & Repair Pro.
7. Avvia Test Mode per controllare regressioni.
