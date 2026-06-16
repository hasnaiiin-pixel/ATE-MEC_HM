# AT-MEC_HM_4.13R_J_DEVICE_TESTMODE_GATE_SAFE

Base: AT-MEC_HM_4.13R_I_DEVICE_MANAGER_STABILE.

## Modifiche

- Integra il pre-check Device Manager nell'avvio Test Mode.
- Dopo auto-collegamento strumenti, prima del wizard scheda campione, legge `getProfessionalDevices` / `getHardwareStatuses`.
- Se ESP32 / PL303 / Multimetro richiesti non risultano conformi, mostra avviso chiaro con scelta Continua/Annulla.
- Scrive log nel `run-log` e salva ultimo esito in `localStorage.atmec_last_test_gate_413RJ`.
- Nessuna modifica a backend, login, utenti, ruoli, permessi, profilo, ricette o report.

## Test consigliato

1. Login admin.
2. Apri Device Manager e verifica stati.
3. Vai in Test Mode e premi Start.
4. Se dispositivi offline, deve apparire avviso pre-check.
5. Premendo Annulla il test non parte.
6. Premendo Continua il flusso prosegue come prima.
