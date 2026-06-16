# AT-MEC_HM_3.91 - Nota tecnica pulizia struttura
## Renderer attuale
- `index.html`: mantiene solo markup principale e caricamenti essenziali.
- `css/app.css`: stile principale.
- `css/layout-editor.css`: bundle consolidato del Layout Editor.
- `js/app.js`: logica applicativa principale ancora invariata per stabilità.
- `js/layout-editor.js`: bundle consolidato patch Layout Editor.
- `js/version-391.js`: versione UI centralizzata.

## Patch storiche non più caricate
Le patch originali sono state spostate in `docs/history/renderer_patches_merged_in_3.91/` e non vengono più caricate singolarmente.
Questo riduce frammentazione e rende più semplice la prossima pulizia delle funzioni duplicate.
