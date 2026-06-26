# AT-MEC_HM_4.24B_DISTRIBUTION_SYNC

Release successiva a 4.24A_FIX1 stabile.

## Obiettivo
Completare il blocco Repository & Distribution con Auto Discovery e sincronizzazione base delle postazioni.

## Incluso
- Auto Discovery Repository: ricette, firmware, label/template, audio e layout disponibili.
- Pulsante **Aggiorna Repository**.
- Station Manager con ATE-01/ATE-02 ecc.
- Sync manuale singola postazione e Sync tutte.
- Mismatch detection base.
- Rollback base registrato in audit.
- Export JSON con repository + postazioni + audit.
- Manifest di progetto `config/repository_manifest_424b.json`.
- BAT aggiornati a 4.24B.
- README vecchi archiviati in `docs/releases`.

## Cosa provare
1. Aprire **Repository & Distribution → Repository Center / Sync**.
2. Premere **Aggiorna Repository** e verificare che compaiano ricette/firmware/label/audio/layout rilevati.
3. Pubblicare almeno una ricetta e un firmware.
4. Aprire **Station Manager**.
5. Aggiungere `ATE-01` e `ATE-02`.
6. Premere **Sincronizza Tutte**.
7. Forzare un mismatch su una postazione e verificare l’avviso.
8. Eseguire rollback base e verificare audit.

## Note
La 4.24B non modifica Test Mode, Device Manager, Print Engine, Audio Runtime o Backup Restore.
