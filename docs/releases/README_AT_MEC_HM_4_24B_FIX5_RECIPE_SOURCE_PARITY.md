# AT-MEC_HM_4.24B_FIX6_RECIPE_SOURCE_FUNCTION_FIX

Fix mirato della 4.24B per allineare il Repository Ricette alla stessa sorgente usata da Test Mode / Test Esecuzione.

## Correzioni

- Repository Ricette legge prima i selettori runtime del Test Mode (`prod-recipe-select`, `dash-recipe-select`).
- Usa `api.listRecipes()` e, se disponibili, `api.listRecipeVersions()`.
- Usa localStorage `recipe_*` anche quando la ricetta è salvata come singolo oggetto.
- Mantiene fallback su manifest/cartelle.
- Pulsante aggiornato: `Aggiorna Repository / Test Mode`.
- Nessuna modifica a Test Mode, hardware, backup, print o audio runtime.

## Test richiesto

1. Aprire Test Mode/Test Esecuzione e verificare che il menu ricette sia popolato.
2. Aprire Repository & Distribution.
3. Entrare in Ricette.
4. Premere `Aggiorna Repository / Test Mode`.
5. Verificare che appaiano le stesse ricette viste in Test Mode.
