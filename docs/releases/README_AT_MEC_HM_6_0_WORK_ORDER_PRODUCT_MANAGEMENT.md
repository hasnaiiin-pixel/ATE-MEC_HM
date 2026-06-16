# AT-MEC_HM_6.0_WORK_ORDER_PRODUCT_MANAGEMENT

Baseline: AT-MEC_HM_4.20A5_PRINT_ENGINE.

## Obiettivo
Prima fase del programma Melexis Integration: gestione clienti, prodotti e commesse con caricamento automatico del contesto nel Test Mode.

## Moduli aggiunti
- Customer Manager
- Product Master
- Work Order Manager
- Dashboard commessa selezionata
- Integrazione Test Mode tramite context layer separato
- Export JSON dei dati 6.0

## Flusso operativo
Commessa → Prodotto → Firmware → Revisione → Ricetta → Template Etichetta → Test Mode.

## Compatibilità
Non vengono modificati Test Engine, Device Manager, Label Designer, Print Engine, Traceability o Analytics. Il modulo 6.0 è aggiunto come layer Factory superiore.

## Prossima fase
AT-MEC_HM_6.1_REVISION_FIRMWARE_MANAGEMENT.
