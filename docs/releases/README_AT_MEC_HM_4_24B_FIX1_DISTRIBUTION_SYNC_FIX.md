# AT-MEC_HM_4.24B_FIX1_DISTRIBUTION_SYNC_FIX

Fix mirato della 4.24B Distribution Sync.

## Correzioni

- Rimossa chiamata `prompt()` non supportata da Electron nel progetto.
- `Aggiungi Postazione` crea automaticamente ATE-01, ATE-02, ATE-03...
- `Sincronizza Tutte` non genera più errore quando non esistono postazioni.
- Aggiunto `src/renderer/config/repository_manifest_424b.json`.
- Auto Discovery ora trova risorse progetto dal manifest e mantiene fallback localStorage.
- Versioni BAT aggiornate a 4.24B_FIX1.
- README precedenti archiviati in docs/releases.

## Test consigliati

1. Aprire Repository & Distribution.
2. Premere Aggiorna Repository.
3. Verificare che compaiano ricette/firmware/label/audio/layout disponibili.
4. Aprire Station Manager.
5. Premere Aggiungi Postazione.
6. Premere Sincronizza Tutte.
7. Verificare assenza errore `prompt() is not supported`.
