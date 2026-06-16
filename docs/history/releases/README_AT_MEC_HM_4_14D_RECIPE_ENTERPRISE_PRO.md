# AT-MEC_HM_4.14D_RECIPE_ENTERPRISE_PRO

Baseline: AT-MEC_HM_4.14C_RECIPE_FLOW_PRO confermata funzionante.

## Modifiche
- Recipe Enterprise Pro nel Recipe Editor.
- Sub-ricette/blocchi riutilizzabili: PowerOn, MeasureVoltage, PowerOff.
- Libreria blocchi locale.
- Salvataggio degli step correnti come blocco riutilizzabile.
- Compilazione su copia prima dell’avvio Test Mode.
- Simulatore Enterprise.
- Versione interna aggiornata a 4.14D.

## Non modificato
- Login, utenti, ruoli, permessi.
- Device Manager backend.
- Test Mode engine backend.
- Ricette esistenti, report e hardware backend.

## Test consigliati
1. Aprire Recipe Editor.
2. Verificare pannello Recipe Enterprise Pro.
3. Inserire PowerOn / Misura V / PowerOff.
4. Simulare Enterprise.
5. Avviare Test Mode e verificare che parta come 4.14C.
