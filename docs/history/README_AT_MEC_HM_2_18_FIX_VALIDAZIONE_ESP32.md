# AT-MEC_HM_2.18 - Fix validazione ESP32 / timeout hardware

Questa release corregge il problema segnalato in AT-MEC_HM_2.17:

- `timeout validazione`
- `Hardware richiesto non LIVE`
- ESP32 già collegata ma test non avviabile

## Correzioni principali

1. Validazione hardware più rapida e dedicata:
   - se la ricetta richiede I/O ESP32, viene verificato solo `modbus_serial` logico/ESP32 JSON;
   - non vengono più tentati PL303/Keysight durante la validazione se non sono richiesti dalla ricetta.

2. Nuovo IPC `connect-esp32-only`:
   - collega solo ESP32 su COM selezionata/salvata;
   - evita timeout causati da altri strumenti non presenti.

3. Avvio test più pulito:
   - rimosso doppio auto-collegamento strumenti;
   - auto-collega solo strumenti necessari agli step attivi.

4. Stato LIVE più robusto:
   - accetta `connected=true`, `mock=false`, `live=true` o `status=LIVE`;
   - compatibile con modbus_serial logico + backend USB JSON.

## Flusso corretto

1. Seleziona COM ESP32 in ESP32 Control oppure lascia porta salvata.
2. Seleziona ricetta.
3. Clicca TEST.
4. Il sistema collega rapidamente ESP32 e avvia la ricetta se LIVE.
