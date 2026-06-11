# AT-MEC_HM_2.17

Release orientata a stabilità, produzione e usabilità.

## Correzioni principali
- Rimosso tasto EMERGENZA dalla Dashboard: resta solo in Test Mode.
- Fix logica ESP32 LIVE: `modbus_serial` rimane nome logico, ma viene considerato LIVE quando il backend ESP32 JSON USB è realmente connesso.
- Prima dell'avvio test viene eseguito auto-collegamento strumenti e poi validazione hardware.
- Dashboard con selezione ricetta funzionante e avvio diretto test.
- Menu Strumenti collassabile: Alimentatore PL303, ESP32 Controller I/O, Scanner QR, Keysight Multimetro.
- Scanner QR spostato in pagina dedicata, non più duplicato sotto PL303.
- Wizard ricette separato per tipologia: uscita digitale, ingresso digitale, multimetro, manuale, timer, SCPI.
- Nell'editor ricette gli step mostrano lo stato I/O live se disponibile.
- Branding migliorato: GIF MIRZA in programma/Test Mode, MIRZA statico nei report, effetto anti-alone per loghi trasparenti.
- Layout Dashboard/Test più responsivo per evitare componenti fuori pagina.

## Note tecniche
- Il database locale JSON esistente resta operativo e compatibile.
- La migrazione SQLite nativa è predisposta come obiettivo successivo, ma non forza dipendenze native per non rompere l'installazione su Windows.
- Firmware ESP32 invariato: backend USB JSON stabile con GPIO diretto.
