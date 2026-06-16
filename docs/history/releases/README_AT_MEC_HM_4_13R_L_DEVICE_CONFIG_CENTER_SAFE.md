# AT-MEC_HM_4.13R_L_DEVICE_CONFIG_CENTER_SAFE

Baseline: AT-MEC_HM_4.13R_K_DEVICE_GATE_ESP32_FIX confermata funzionante.

## Modifiche
- Aggiunto pannello **Centro configurazione dispositivi** dentro Device Manager.
- Configurazione UI per ESP32, PL303, Multimetro e Scanner.
- Campi: porta/risorsa, baudrate, timeout, modalità, abilitato, obbligatorio.
- Salvataggio locale sicuro in localStorage (`atmec_device_config_center_413RL`).
- Pulsante suggerimento da rilevamento COM/VISA usando API già esistenti.

## Sicurezza regressioni
- Non modifica backend.
- Non modifica login, utenti, ruoli, permessi, profilo collaboratore.
- Non modifica Test Mode, ricette, report.
- Il campo obbligatorio è preparatorio e non blocca il Test Mode.

## Test consigliati
1. Login admin.
2. Aprire Device Manager.
3. Verificare presenza pannello Centro configurazione dispositivi.
4. Inserire COM/baud/timeout e salvare.
5. Cambiare pagina e tornare al Device Manager: valori ancora presenti.
6. Start Test Mode: il comportamento deve rimanere come 4.13R_K.
