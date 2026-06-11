# AT-MEC_HM_3.96

Base: AT-MEC_HM_3.95 stabile.

Obiettivo: consolidamento tecnico senza rompere il Layout Editor validato in 3.94/3.95.

Modifiche:
- Versione aggiornata a 3.96.
- Aggiunto `layout-editor-managers.js` come livello non invasivo di diagnostica/manager.
- Aggiunto marker runtime `AT_MEC_LAYOUT_EDITOR_VERSION = '3.96'`.
- Mantenuto invariato il comportamento stabile di selezione, dimensionamento, allineamento, pannello mobile, ricerca a scomparsa e handle.

Console utili:
- `window.AT_MEC_LAYOUT_396.Diagnostics.summary()`
- `window.AT_MEC_LAYOUT_396.SelectionManager.clear()`
