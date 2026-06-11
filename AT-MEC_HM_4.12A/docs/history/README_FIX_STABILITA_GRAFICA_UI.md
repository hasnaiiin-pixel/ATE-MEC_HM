# AT-MEC HM 1.0 — Fix stabilità grafica/UI

Questa versione corregge i blocchi della grafica dopo la prima operazione.

## Problema individuato
La UI poteva restare apparentemente bloccata perché alcune chiamate IPC/hardware venivano lanciate senza protezione grafica completa:

- polling live multimetro ogni 500 ms con possibili chiamate sovrapposte;
- operazioni hardware/ricette senza timeout lato renderer;
- scansione COM e riconnessione hardware avviabili più volte;
- log DOM senza limite, con crescita continua;
- stato pulsanti non sempre riallineato dopo errori, timeout o FAULT;
- errori JavaScript/promise non gestiti che lasciavano la schermata in stato incoerente.

## Correzioni inserite

- `guardedUi()` per tutte le operazioni critiche della grafica.
- Timeout lato UI per start/stop/pause/recover/scansione COM/riconnessione hardware.
- Timeout lato main IPC per query strumenti e I/O Modbus.
- Polling multimetro non sovrapposto: una sola lettura alla volta.
- Polling multimetro rallentato da 500 ms a 1500 ms.
- Stop automatico del live wizard quando parte una ricetta o si riconnette hardware.
- Pulsante STOP lasciato utilizzabile anche durante operazioni lente.
- Eventi `error` e `unhandledrejection` mostrati nel log invece di lasciare la UI muta.
- Log limitato a 350 righe per evitare rallentamenti progressivi.
- Stato pulsanti riallineato sugli eventi `READY`, `RUNNING`, `FAULT`, `IDLE`.
- Caricamenti iniziali scaglionati per evitare picco all'avvio.

## Cosa provare

1. Avvia app.
2. Vai in Impostazioni.
3. Scansiona COM.
4. Applica ESP32/modbus_serial.
5. Crea ricetta con uno step DO.
6. Avvia ricetta più volte senza fare reload.
7. Verifica che, anche in caso di errore hardware, la UI resti cliccabile.

