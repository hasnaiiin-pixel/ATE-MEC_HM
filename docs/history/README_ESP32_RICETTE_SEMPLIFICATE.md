# AT-MEC HM 1.0 — ESP32 e ricette semplificate

Modifiche incluse:

- Nuova pagina **Ricette & Step** con workspace grande per modificare gli step.
- La lista step laterale resta solo rapida; la modifica principale si fa nella nuova pagina.
- Pagina **ESP32 Control** semplificata con pulsante **Auto collega ESP32 per ricette**.
- La porta ESP32 scelta viene salvata in configurazione e usata al riavvio.
- Se una ricetta richiede `modbus_serial`, l’avvio prova una riconnessione automatica prima di bloccare il test.
- Messaggio di errore migliorato: indirizza alla pagina ESP32 Control, non solo a Settings.
- Health check ricetta: mostra step attivi, flag abilitazione e stato ESP32 LIVE/MOCK.
- Gestione step più grande: abilita/disabilita, duplica, sposta su/giù, modifica.

Flusso consigliato:

1. Apri **ESP32 Control**.
2. Premi **Auto collega ESP32 per ricette**.
3. Verifica che `modbus_serial` sia LIVE nella barra alta.
4. Apri **Ricette & Step**.
5. Crea o modifica gli step dalla pagina grande.
6. Avvia il test.
