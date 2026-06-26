# AT-MEC_HM_4.24B_FIX4_REPOSITORY_USES_REAL_RECIPE_SOURCE

## Correzione
Il Repository non deve inventare una sorgente propria per le ricette. Ora usa prima `window.api.listRecipes()`, cioè la stessa API già usata dal Test Mode, poi aggiunge eventuali ricette da `localStorage` con prefisso `recipe_` e infine il manifest.

## Risultato atteso
Nel tab Ricette del Repository devono comparire le stesse ricette visibili in Test Mode / Esecuzione Ricette.

## Non modificato
Test Mode, Backup, Print Engine, Audio, Hardware.
