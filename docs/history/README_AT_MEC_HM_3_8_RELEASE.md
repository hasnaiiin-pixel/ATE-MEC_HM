# AT-MEC_HM_3.8

Release di stabilità Device Manager / PL303.

## Correzioni principali

- Fix crash Electron main process: `Error: Port is not open`.
- Chiusura sicura porte seriali prima di riconnettere PL303 o strumenti SCPI USB/COM.
- Nuove funzioni interne `safeCloseSerialPort()` e `safeCloseSerialPortSync()`.
- Se la porta è già chiusa, l'errore viene registrato come warning e non blocca la HMI.
- Disconnessione generale più stabile: chiude anche porte SCPI seriali senza generare popup JavaScript.

## Base mantenuta

- AT-MEC_HM_3.7.
- PL303QMD-P a due canali CH1/CH2.
- Spegnimento sicuro alimentatore su FAIL/STOP/ABORT/EMERGENZA/fine test/chiusura app.
- Step ricetta `PowerSupplyMeasureCurrent`.
- Keysight 34461A USB/VISA, Ethernet e USB/COM.

## Nota test

Il problema corretto è quello mostrato da Windows/Electron:

```text
A JavaScript error occurred in the main process
Error: Port is not open
at SerialPort.close
at DeviceManager.connectDevice
```

Con questa release il tentativo di chiudere una porta non aperta non genera più crash del main process.
