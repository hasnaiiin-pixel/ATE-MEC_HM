# AT-MEC HM 1.0 — Fix stabilità UI / Modbus / Ricette

Questa versione interviene sul blocco dopo la prima esecuzione.

## Cause probabili trovate

1. **Live wizard e ricetta usavano la stessa seriale Modbus contemporaneamente**.
   Il polling live poteva leggere/scrivere DO mentre la ricetta stava usando la stessa COM.

2. **Il live DO scriveva l’uscita ad ogni polling**.
   Questo poteva generare comandi ripetuti, code sulla seriale e blocco della comunicazione.

3. **Dopo un FAIL il sistema restava in FAULT**.
   La UI mostrava alcune funzioni, ma l’avvio ricetta non partiva più correttamente finché non veniva fatto reload/recover.

4. **Timeout senza cleanup**.
   Alcuni timeout lasciavano timer attivi o promesse pendenti.

## Modifiche applicate

- Modbus seriale ora è serializzato con coda interna: una sola operazione alla volta.
- Timeout su ogni operazione Modbus: read/write coil, discrete input, input register, holding register.
- Auto-reconnect Modbus dopo timeout ripetuti.
- Il live del wizard per DO ora **legge solo il feedback**, non scrive più l’uscita in polling.
- Quando parte una ricetta, il live wizard viene fermato automaticamente.
- Dopo errore/FAIL il sistema torna in READY, lasciando visibile il fault log ma senza bloccare l’app.
- STOP sblocca anche eventuale pausa/debug.
- `start-test` fa recovery automatica da FAULT prima dell’avvio.
- Timeout frontend con cleanup del timer.

## Come provare

1. Avvia app.
2. Collega ESP32 Modbus seriale.
3. Apri wizard e controlla live DO/DI.
4. Ferma live oppure avvia direttamente la ricetta: il live viene fermato automaticamente.
5. Esegui la stessa ricetta più volte senza reload.

## Nota operativa

Per step DO con feedback non cablato o non implementato nel firmware, lascia disattivata **Verifica feedback DO**. Il comando viene considerato OK se la scrittura coil riesce.
