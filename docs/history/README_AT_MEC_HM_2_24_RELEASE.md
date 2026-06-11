# AT-MEC_HM_2.24

Release di trasformazione flusso produzione/stabilità.

## Principali modifiche
- Startup Wizard obbligatorio dopo login: selezione ricetta, selezione revisione, strumenti richiesti, test strumenti, conferma scheda campione.
- Test Mode con selezione revisione ricetta.
- Layout Test Mode a celle, più compatto e con progress bar in basso.
- Fix definitivo stato RUNNING dopo FAIL: renderer e main riportano il sistema in READY quando il motore non è più in esecuzione.
- Gestione seriali già testati: PASS chiede conferma ritest, FAIL richiede relazione riparazione.
- Se SN obbligatorio è disattivato, non viene controllato lo storico NOSERIAL.
- Device Manager più stabile: evita riapertura continua ESP32 sulla stessa COM e non chiude subito la seriale dopo timeout transitori.
- Strumenti usati dalla ricetta: visualizzazione/validazione solo degli strumenti necessari.

## Note operative
1. Login.
2. Startup Wizard: scegli ricetta e revisione.
3. Collega/testa strumenti richiesti.
4. Conferma scheda campione se attiva.
5. Entra in Test Mode e avvia.
