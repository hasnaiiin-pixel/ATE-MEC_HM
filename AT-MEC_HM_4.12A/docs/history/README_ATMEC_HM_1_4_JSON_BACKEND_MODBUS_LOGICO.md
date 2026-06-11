# AT-MEC_HM_1_4 - modbus_serial logico con backend ESP32 JSON

Questa versione mantiene il nome `modbus_serial` dentro AT-MEC per non rompere ricette, wizard e validazione hardware.
Il trasporto reale verso ESP32-S3 è però USB seriale JSON, perché il firmware JSON è risultato stabile nei test diretti.

## Firmware Arduino
Percorso:

```text
firmware/esp32s3_ate_node/esp32s3_ate_node.ino
```

Non richiede librerie esterne:

```cpp
#include <Arduino.h>
```

Non usa `ModbusRTU.h`.

## Protocollo
Esempi da Monitor Seriale 115200 baud:

```json
{"cmd":"info"}
{"cmd":"writeDigital","gpio":4,"value":1}
{"cmd":"readDigital","gpio":4}
{"cmd":"readAnalog","gpio":1}
```

Il firmware accetta anche `channel` al posto di `gpio` per retrocompatibilità.

## Mappa pin
Mappa diretta:

```text
GPIO1 = pin serigrafato 1
GPIO2 = pin serigrafato 2
GPIO3 = pin serigrafato 3
GPIO4 = pin serigrafato 4
...
```

Quindi in AT-MEC selezionare GPIO4 comanda fisicamente il pin scritto `4` sulla scheda.

## Integrazione software
- `modbus_serial` rimane il nome dispositivo richiesto dalle ricette.
- `DeviceManager` usa `Esp32SerialProvider` quando connette `modbus_serial`.
- Le operazioni sono serializzate in coda per evitare blocchi o comandi sovrapposti.
- Il feedback DO non forza più il pin in input, quindi leggere un'uscita non la spegne.

## Test consigliato
1. Caricare il firmware Arduino.
2. Aprire Monitor Seriale a 115200.
3. Inviare:

```json
{"cmd":"info"}
```

4. Collegare LED su GPIO4 con resistenza 330 ohm verso GND.
5. Inviare:

```json
{"cmd":"writeDigital","gpio":4,"value":1}
```

6. In AT-MEC: ESP32 Control -> Auto collega ESP32 -> GPIO4 HIGH/LOW.
