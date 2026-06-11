# AT-MEC_HM_2.22

Release focalizzata su stabilità esecuzione test, gestione strumenti richiesti dalla ricetta e sblocco dello stato RUNNING dopo FAIL.

## Fix principali

- Se il motore resta in stato "Ricetta già in esecuzione", il front-end esegue STOP/RESET automatico e ritenta l'avvio una sola volta.
- Popup FAIL/manuale sempre in primo piano, con z-index elevato, per evitare che sembri tutto bloccato.
- Validazione hardware basata solo sugli strumenti realmente usati dalla ricetta.
- Strumenti esclusi non bloccano più l'avvio.
- Se SN obbligatorio è OFF, non viene più eseguito controllo storico su NOSERIAL.

## Test Mode

- Il pannello strumenti ora mostra "Strumenti utilizzati per questa ricetta".
- Vengono visualizzati solo gli strumenti richiesti dagli step e dalla sorgente alimentazione.
- Aggiunta lista operazioni preliminari quando si carica una ricetta.
- Auto-collegamento strumenti richiesti dopo selezione ricetta.

## Device validation

- DO/DI richiedono ESP32 (`modbus_serial` logico).
- Misure analogiche/multimetro richiedono Keysight se non specificato altro driver.
- PL303 viene richiesto solo se la ricetta usa alimentazione programmabile.
- Scanner QR non blocca il test: resta input operatore/manuale.

## Stabilità

- Reset controllato su STOP TEST.
- Recupero automatico da RUNNING bloccato.
- Protezione UI da popup nascosti.
