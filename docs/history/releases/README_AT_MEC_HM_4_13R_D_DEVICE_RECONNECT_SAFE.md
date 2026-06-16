# AT-MEC_HM_4.13R_D_DEVICE_RECONNECT_SAFE

Baseline: AT-MEC_HM_4.13R_C_DEVICE_HEARTBEAT_SAFE confermata stabile.

## Obiettivo
Aggiungere reconnect assistito al Device Manager senza toccare backend, login, utenti, ruoli, permessi, profilo collaboratore, Test Mode, ricette o report.

## Modifiche
- Pulsante reconnect per singolo dispositivo configurato.
- Pulsante reconnect globale per ESP32 / PL303 / Multimetro configurati.
- Auto reconnect opzionale ogni 15 secondi, disattivato di default.
- Log locale eventi reconnect.
- Indicazione configurazione reconnect su ogni card.

## Sicurezza
- Usa solo API già esistente `reconnectHardware`.
- Nessuna modifica a `main.ts`, `preload.ts`, `UserManager.ts`.
- Nessun blocco Test Mode introdotto.
