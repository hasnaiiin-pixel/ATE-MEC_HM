# AT-MEC_HM_4.14A_RECIPE_VARIABLES_PRO

Baseline: AT-MEC_HM_4.13R_O_DEVICE_MANAGER_ENTERPRISE_SAFE confermata stabile.

## Modifiche
- Aggiunto pannello Recipe Variables Pro nel Recipe Editor.
- Variabili standard: ${serial}, ${lot}, ${collaboratore}, ${username}, ${recipe}, ${datetime}.
- Variabili Device Manager: ${esp32_port}, ${esp32_fw}, ${pl303_port}, ${multimeter_model}.
- Variabili personalizzate salvate dentro la ricetta (`recipe.variables`).
- Anteprima variabili.
- Sostituzione `${VAR}` su una copia della ricetta all'avvio Test Mode.

## Sicurezza regressioni
Non sono stati modificati login, utenti, ruoli, permessi, profilo collaboratore, Device Manager backend, Test Mode engine, report o hardware backend.

## Test consigliato
1. Login admin.
2. Recipe Editor → aggiungi TARGET_VOLTAGE con valore 12.0.
3. Usa `${TARGET_VOLTAGE}` in un campo testuale/comando step.
4. Anteprima variabili.
5. Salva ricetta.
6. Avvia Test Mode e verifica che il test parta come nella 4.13R_O.
