# AT-MEC_HM_4.24B_FIX2_AUTO_DISCOVERY_REAL_FILES

Fix mirato della 4.24B per rendere visibili automaticamente le risorse reali nel Repository.

## Correzioni
- Auto Discovery basato su manifest generato dai file reali del progetto.
- Ricette lette dalla cartella `recipes/`.
- Firmware letto dalla cartella `firmware/`.
- Label, Audio e Layout rilevati da cartelle/file disponibili.
- Apertura pagina Repository con discovery automatico se il repository locale è vuoto.
- Pulsante `Aggiorna Repository da file` mantiene il refresh manuale.
- BAT aggiornati a `4.24B_FIX2`.
- README vecchi archiviati in `docs/releases`.

## Test consigliato
1. Aprire Repository & Distribution.
2. Verificare che in tab Ricette compaia almeno `Nuova Ricetta` se presente in `recipes/`.
3. Premere `Aggiorna Repository da file`.
4. Controllare Firmware, Label, Audio e Layout.
5. Pubblicare una risorsa e sincronizzare una postazione.
