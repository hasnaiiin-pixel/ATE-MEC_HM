# AT-MEC_HM_4.12 - Release Notes

Versione derivata da AT-MEC_HM_4.11_FULL.

## Layout Editor 4.12

Implementato pannello professionale con:

- trasformazioni elemento: rotazione numerica, rotazione ±90°, flip orizzontale, flip verticale;
- griglia: comandi rapidi mostra/nascondi griglia e snap ON/OFF, con passo griglia già configurabile dalla barra superiore;
- gruppi: raggruppa elementi selezionati con CTRL+click, separa gruppo, blocca/sblocca gruppo;
- livelli avanzati: porta in primo piano assoluto, porta sullo sfondo assoluto;
- immagini: sostituisci immagine tramite percorso, opacità immagine/elemento, rotazione immagine;
- salvataggio proprietà nel layout JSON localStorage `atmec.layout367.v1`;
- supporto movimento gruppo tramite handle di spostamento.

## File modificati

- `src/renderer/js/layout-editor.js`
- `src/renderer/css/layout-editor.css`
- `package.json`

## Note test

Questa versione è pensata per test operativo: le modifiche sono applicate sui sorgenti e compilazione TypeScript verificata.
