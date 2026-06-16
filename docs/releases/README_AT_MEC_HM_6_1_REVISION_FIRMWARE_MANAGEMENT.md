# AT-MEC_HM_6.1_REVISION_FIRMWARE_MANAGEMENT

Baseline: AT-MEC_HM_6.0_WORK_ORDER_PRODUCT_MANAGEMENT.

## Obiettivo
Completa il layer Manufacturing opzionale introdotto nella 6.0 con gestione firmware, revisioni prodotto, binding prodotto/revisione/firmware e validazioni stile Melexis.

## Moduli aggiunti
- Firmware Manager
- Revision Manager
- Product Revision Binding
- Firmware / Revision Validation Engine
- Change History
- Manufacturing Mode flag ON/OFF

## Modalità Manufacturing opzionale
Se Manufacturing Mode è OFF, AT-MEC_HM resta utilizzabile come ATE standalone con ricetta, test, report ed etichetta.
Se Manufacturing Mode è ON, sono visibili i moduli Manufacturing: Work Orders, Product Master, Firmware e Revisioni.

## Integrazione 6.0
La Work Order selezionata può usare automaticamente il binding 6.1 per sovrascrivere firmware, revisione, ricetta e template etichetta prima del Test Mode.

## Compatibilità
Non sono stati riscritti Test Mode, Recipe Engine, Device Manager, Label Manager, Print Engine o Traceability.
La 6.1 è aggiunta come layer separato.

## Prossima fase
AT-MEC_HM_6.2_MES_CONNECTOR.
