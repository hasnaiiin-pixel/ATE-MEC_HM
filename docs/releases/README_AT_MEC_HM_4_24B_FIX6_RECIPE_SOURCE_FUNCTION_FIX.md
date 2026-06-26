# AT-MEC_HM_4.24B_FIX6_RECIPE_SOURCE_FUNCTION_FIX

Fix mirato per Repository & Distribution.

## Correzioni
- Definita la funzione `discoverFromVisibleRecipeSelectors()` mancante nella FIX5.
- Aggiunte funzioni helper mancanti per normalizzare nome/revisione ricetta.
- Auto Discovery non si blocca più se il Test Mode non è aperto.
- Discovery ricette da selettori Test Mode, `api.listRecipes()`, `api.listRecipeVersions()`, localStorage e manifest.
- Versione e BAT aggiornati a 4.24B_FIX6.

## Test consigliato
1. Aprire Test Mode/Test Esecuzione e verificare la lista ricette.
2. Aprire Repository & Distribution → Ricette.
3. Premere Aggiorna Repository / Test Mode.
4. Verificare che non compaiano errori console `discoverFromVisibleRecipeSelectors is not defined`.
5. Verificare che vengano elencate le ricette disponibili.
