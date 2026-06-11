# AT-MEC_HM_1_4 — Pinout diretto ESP32-S3 DevKitC-1 N16R8

Versione salvata come **AT-MEC_HM_1_4**.

## Cambio principale

La mappa I/O non traduce più DO_01/DI_01 in pin diversi. Ora il numero usato nel software coincide con la serigrafia della scheda:

```text
GPIO1  -> pin marcato 1
GPIO2  -> pin marcato 2
GPIO3  -> pin marcato 3
GPIO4  -> pin marcato 4
...
```

Quindi se dalla pagina **ESP32 Control** premi:

```text
GPIO4 HIGH
```

AT-MEC invia Modbus:

```text
writeCoil(address=4, value=true)
```

e il firmware attiva fisicamente il pin **GPIO4**, quello scritto **4** sulla scheda.

## Firmware Arduino

Apri e carica:

```text
firmware/esp32s3_ate_node/esp32s3_ate_node.ino
```

Installa prima la libreria Arduino:

```text
ModbusRTU by Alexander Emelianov
```

Parametri Modbus:

```text
Slave ID: 1
Baud: 115200
8N1
```

## Pin consigliati abilitati

```text
GPIO1..GPIO18
GPIO21
GPIO47
GPIO48
```

## Pin mostrati ma disabilitati/da evitare

```text
GPIO0  BOOT
GPIO19 USB D-
GPIO20 USB D+
GPIO43 UART0 TX/log
GPIO44 UART0 RX/log
GPIO45 STRAP
GPIO46 STRAP
GPIO35..GPIO42 SPI/FSPI speciale, da validare prima dell'uso
```

## Test consigliato

Collega:

```text
GPIO4 -> resistenza 330 ohm -> LED -> GND
```

Poi in AT-MEC:

```text
ESP32 Control -> GPIO4 -> HIGH
ESP32 Control -> GPIO4 -> LOW
```

Il LED deve accendersi e spegnersi.
