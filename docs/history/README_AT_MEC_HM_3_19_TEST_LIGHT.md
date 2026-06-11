# AT-MEC_HM_3.30_TEST_LIGHT

Build LIGHT senza node_modules.

Avvio consigliato dopo estrazione:

```bash
npm install
npm start
```

Modifiche principali:
- Recipe Builder 2.0 migliorato con ricette collegate a cliente/prodotto.
- Misura live nello step durante esecuzione.
- Fallback manuale più chiaro se lettura multimetro/device fallisce.
- Switch ON/OFF moderni al posto di checkbox/spunte.
- Menu principale e strumenti collassabili.
- Device Manager sotto Strumenti.
- Communication Hub con Seriale, Telnet/TCP, log RX/TX e parser PASS/FAIL.
- Layout Dashboard Esecuzione più compatto, KPI a destra, logo rimosso dalla sezione KPI.
- Database/KPI riallineato con esiti più compatti.
- Impostazioni: Loghi HMI/Report e Utenti & Ruoli.

Note:
- Multi-alimentatore, ESP32-CAM, OCR, DataMatrix, MQTT, SSH, Modbus TCP e plugin system restano sospesi per release future.
