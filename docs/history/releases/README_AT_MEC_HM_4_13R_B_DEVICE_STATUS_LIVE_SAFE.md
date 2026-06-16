# AT-MEC_HM_4.13R_B_DEVICE_STATUS_LIVE_SAFE

Baseline: AT-MEC_HM_4.13R_A_DEVICE_UI_AUDIT, derivata da AT-MEC_HM_4.13R_STABILE confermata funzionante.

## Modifica eseguita

Revisione sicura e incrementale della sola pagina Device Manager:

- collegamento UI alle API già esposte `getProfessionalDevices` e `getHardwareStatuses`;
- mantenute le card ESP32 / PL303 / Multimetro / Scanner;
- aggiunta origine dati visibile;
- aggiunto refresh manuale e auto refresh opzionale ogni 5 secondi;
- aggiunto log locale dei cambi stato;
- aggiunto conteggio dispositivi obbligatori OK;
- Test Gate rimane solo visivo.

## Non toccato

- login;
- utenti;
- ruoli;
- permessi;
- profilo collaboratore;
- UserManager;
- main.ts / preload.ts;
- backend HAL;
- Test Mode;
- ricette;
- report.

## Nota

Questa versione non introduce reconnect automatico, blocco Test Mode o Emergency Manager nuovo. È solo una lettura live sicura dello stato hardware già disponibile.
