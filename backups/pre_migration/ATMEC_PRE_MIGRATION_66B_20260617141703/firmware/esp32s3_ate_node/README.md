# Firmware AT-MEC_HM_1_4 per ESP32-S3 DevKitC-1 N16R8

Questa versione usa **Modbus RTU slave** e la mappatura diretta richiesta:

```text
GPIO1  -> pin fisico serigrafato 1
GPIO2  -> pin fisico serigrafato 2
GPIO3  -> pin fisico serigrafato 3
GPIO4  -> pin fisico serigrafato 4
...
```

## Librerie Arduino richieste

Installa da Arduino IDE > Gestione librerie:

- **ModbusRTU** by Alexander Emelianov

Non serve più ArduinoJson per questa versione Modbus.

## Impostazioni Arduino IDE

- Board: `ESP32S3 Dev Module`
- USB CDC On Boot: `Disabled` se usi la porta UART/USB-to-UART per Modbus
- Flash Size: `16MB`
- PSRAM: `OPI PSRAM`
- Upload Speed: `460800` o `921600`

## Parametri Modbus

```text
Slave ID: 1
Baud: 115200
Formato: 8N1
```

## Mappa Modbus

Gli indirizzi Modbus coincidono con il numero GPIO fisico.

```text
Coils address GPIO       -> DO, uscita digitale
Discrete input GPIO      -> DI, ingresso digitale
Input register GPIO      -> AI raw ADC 0..4095
Holding register GPIO    -> AO/PWM, riservato future versioni
```

Esempio:

```text
writeCoil(4, true) = attiva GPIO4, il pin marcato 4 sulla scheda
readCoils(4, 1)    = legge feedback GPIO4
```

## Pin evitati nella UI

AT-MEC mostra ma disabilita/avvisa per i pin speciali:

```text
GPIO0  BOOT
GPIO19 USB D-
GPIO20 USB D+
GPIO43 UART0 TX/log
GPIO44 UART0 RX/log
GPIO45 STRAP
GPIO46 STRAP
```

Per il primo test fisico usa GPIO4:

```text
GPIO4 -> resistenza 330 ohm -> LED -> GND
```

In AT-MEC apri ESP32 Control e premi `GPIO4 HIGH`, poi `GPIO4 LOW`.
