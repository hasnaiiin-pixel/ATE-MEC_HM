# Modifiche ricette + ESP32 live Modbus Serial

Questa versione mantiene `modbus_serial` come layer hardware per ESP32.

## Cosa cambia

- Wizard guidato ricette: i campi non necessari vengono nascosti automaticamente in base alla categoria step.
- Uscita digitale: mostra solo canale, stato ON/OFF, timeout e verifica feedback.
- Ingresso digitale: live HIGH/LOW dal wizard.
- Ingresso analogico: live valore ADC dal wizard.
- Avvio ricetta bloccato se uno strumento richiesto è in MOCK/non LIVE.
- `DigitalOutputSet` ora imposta la DO e rilegge lo stato reale della coil.
- Aggiunto IPC `readDigitalOutput`.

## Uso consigliato

1. Vai in Settings hardware.
2. Imposta COM ESP32 in `ESP32-S3 — COM (Modbus)`.
3. Premi APPLICA.
4. Verifica che il badge `modbus LIVE` sia verde.
5. Crea la ricetta con il wizard.
6. Usa Live per controllare DI/DO/AI prima di salvare lo step.
7. Avvia la ricetta: se un device è MOCK, il test viene fermato prima dell'esecuzione.
