# Audit tecnico AT-MEC_HM_3.95

- Base stabile: 3.94
- File JS renderer: 4
- File CSS renderer: 2
- Nuovo registro eventi: `src/renderer/js/ui-events.js`
- Obiettivo: ridurre doppi listener e preparare centralizzazione eventi senza toccare funzioni produttive.

## Controlli eseguiti
- Sintassi JS verificata con `node --check` su `app.js`, `layout-editor.js`, `ui-events.js`, `version.js`.
- ZIP finale verificato valido.

## Prossimo step consigliato
3.96: migrare gradualmente i nuovi eventi UI verso `AT_MEC_UI_EVENTS.on(...)` e rimuovere patch storiche residue solo dopo test manuale.
