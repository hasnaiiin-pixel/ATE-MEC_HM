# AT-MEC_HM_3.13_BIG_TEST_LIGHT

Versione LIGHT di test basata su AT-MEC_HM_3.12_TEST_LIGHT.

## Modifiche principali

- Recipe Builder migliorato:
  - blocchi grafici con modifica valori direttamente sullo step;
  - drag & drop per riordinare gli step;
  - template rapidi aggiunti: continuità, temperatura, potenza;
  - device mapping semplificato per step: manual, PL303, Keysight, modbus_serial/ESP32;
  - validazione base ricetta: step attivi, PL303/ESP32 richiesti, controllo Min > Max.

- Stabilità PL303 / Device Manager:
  - query PL303 non generano più FAULT globale;
  - timeout letture restituiti come stato non bloccante;
  - set PL303 con pause tra comandi seriali;
  - safe OFF CH1+CH2 non bloccante.

- Emergenza/Test Mode:
  - emergenza spegne PL303 CH1+CH2 e DO sicure;
  - non scollega forzatamente gli strumenti per evitare obbligo di riavvio app;
  - reset stato a READY quando possibile.

- Dashboard base:
  - pannello Device Manager 3.13 su pagina Ricette;
  - KPI qualità base PASS/FAIL/Yield.

## Avvio

```bash
npm install
npm start
```

Questa versione è TEST LIGHT: non contiene node_modules.
