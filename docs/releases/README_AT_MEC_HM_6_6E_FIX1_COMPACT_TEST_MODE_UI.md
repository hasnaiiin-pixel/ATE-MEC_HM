# AT-MEC_HM_6.6E_FIX1_COMPACT_TEST_MODE_UI

Release di correzione layout per Test Mode 6.6E.

## Obiettivo

Ridurre lo scroll verticale e rendere la Misura Manuale Assistita più compatta e chiara per l'operatore.

## Modifiche

- Layout compatto per monitor 1920x1080.
- Card misura manuale ridotta e più leggibile.
- Rinominati concetti Automatico/Manuale in:
  - 📡 Strumento
  - ✍ Operatore
- Range tolleranza compatto.
- KPI sessione compatti.
- Stato strumenti live compatto.
- Log eventi più compatto.

## Non modificato

- Test Engine
- Ricette
- Repair Center
- SQLite
- Repository
- Backup
- Print/Label

## Test consigliati

1. Aprire Test Mode.
2. Verificare che non serva scorrere la pagina in 1920x1080.
3. Provare misura manuale/fallback multimetro.
4. Verificare nomi Fonte misura: Strumento / Operatore.
5. Verificare che S/N non si sposti.
