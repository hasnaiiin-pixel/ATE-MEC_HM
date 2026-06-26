# AT-MEC_HM_4.24A_REPOSITORY_CENTER

## Stato
Release Repository Center su baseline stabile 4.23C_FIX1.

## Obiettivo
Introdurre il Repository centrale locale per gestire versioni ufficiali di:
- Ricette
- Firmware
- Label template
- Audio
- Layout

## Funzioni incluse
- Nuovo menu: Repository & Distribution
- Repository Center
- Stati: Draft / Published / Archived
- Audit operazioni repository
- Export JSON repository
- Dati demo per test rapido

## Non modificato
- Test Mode
- Runtime ricette
- Hardware
- Print Engine
- Audio runtime
- Backup & Restore

## Cosa provare
1. Aprire Repository & Distribution → Repository Center.
2. Creare un elemento Ricetta con REV_A e stato Draft.
3. Pubblicarlo.
4. Archiviarlo.
5. Cambiare tab su Firmware, Label, Audio, Layout e ripetere il test.
6. Aprire Audit e verificare utente/data/azione.
7. Usare Esporta JSON e verificare download.

## Prossimo step
AT-MEC_HM_4.24B_DISTRIBUTION_SYNC.
