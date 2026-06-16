# AT-MEC_HM_4.13R_K_DEVICE_GATE_ESP32_FIX

Fix mirato del pre-check Test Mode introdotto in 4.13R_J.

## Correzioni
- Il pre-check Test Mode usa i dispositivi realmente richiesti dalla ricetta, non obbliga più ESP32/PL303/Multimetro per ogni test.
- ESP32 collegato come `modbus_serial` viene riconosciuto correttamente come ESP32.
- Se `getEsp32Info()` indica ESP32 live, il gate lo considera conforme anche se la lista Device Manager non è ancora aggiornata.
- Aggiunta alias resolution per `getHardwareStatusByName()` su ESP32/modbus_serial, PL303/AimTTi e Keysight/Multimetro.

## Non modificato
Login, utenti, ruoli, permessi, profilo collaboratore, ricette, report e backend.
