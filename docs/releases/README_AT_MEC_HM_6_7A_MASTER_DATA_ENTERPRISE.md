# AT-MEC_HM_6.7A_MASTER_DATA_ENTERPRISE

Release 6.7A basata su AT-MEC_HM_6.6E_FIX1G stabile.

## Contenuto

- Nuovo menu **Master Data**.
- Gestione Clienti.
- Gestione Prodotti.
- Gestione Schede / PCB.
- Gestione Revisioni.
- Gestione Firmware.
- Collegamenti gerarchici Cliente → Prodotto → Scheda → Revisione → Firmware → Ricetta.
- Audit Master Data.
- Export JSON Master Data.
- Salvataggio locale compatibile con architettura SQLite-ready/local-first.

## Non modificato

- Test Mode.
- Repair Center.
- Dossier e genealogia.
- SQLite Enterprise Status.
- Repository & Distribution.
- Backup / Restore.
- Hardware / Device Manager.

## Test consigliato

1. Aprire app con `AVVIA_AT_MEC_HM_6.7A.bat`.
2. Aprire **Master Data → Master Data Enterprise**.
3. Creare Cliente.
4. Creare Prodotto collegato al Cliente.
5. Creare Scheda collegata al Prodotto.
6. Creare Revisione collegata alla Scheda.
7. Creare Firmware collegato al Prodotto.
8. Creare Collegamento completo e associare Ricetta.
9. Esportare JSON.
10. Verificare che Test Mode e Repair Center continuino a funzionare.
