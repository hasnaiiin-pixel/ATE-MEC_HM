# AT-MEC_HM_4.19A1_FACTORY_COMMAND_CENTER_FIX1

Fix mirato su Dashboard/Factory Station sync.

## Correzioni
- Eliminato warning F12 `DataProvider station update rejected: Permessi insufficienti`.
- La sincronizzazione backend della postazione viene tentata solo se l'utente ha `manage_data` o `config_hardware` oppure ruolo Admin/livello alto.
- Prima del login o con utente senza permessi: la UI/topbar/report locale resta aggiornata, senza chiamata backend rumorosa.
- Messaggi di salvataggio Factory più chiari.

## Non modificato
- Login, ruoli, permessi backend, Test Mode, Device Manager backend, Recipe Engine e Report engine.
