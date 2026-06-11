# AT-MEC_HM_3.1

## Modifiche principali

### Versionamento
- La linea di rilascio continua come `AT-MEC_HM_3.x.zip`.
- Versione pacchetto aggiornata a `3.1.0`.

### Keysight 34461A
- Multimetro rinominato ufficialmente in `Keysight_34461A`.
- Compatibilità retroattiva con eventuali vecchie ricette/configurazioni `Keysight_34465A`.
- Driver SCPI Ethernet/LAN su porta 5025.
- Opzione USB/VISA/COM configurabile da HMI.
- Supporto base USB/COM quando lo strumento espone una porta seriale virtuale.
- Per VISA/USBTMC puro è previsto uso di bridge/driver esterno.

### Wizard ricette filtrato
- Quando si seleziona Uscita Digitale sono visibili solo campi DO: GPIO, HIGH/LOW, modalità uscita, timeout e feedback.
- Quando si seleziona Ingresso Digitale sono visibili solo campi DI: GPIO, stato atteso e timeout.
- Quando si seleziona Misura Multimetro sono visibili solo device, comando SCPI, unità e limiti.
- Quando si seleziona Timer è visibile solo il tempo di attesa.
- Quando si seleziona Step Manuale sono visibili solo istruzioni, immagine, misura manuale/acquisizione e limiti.

### Step manuale con misura manuale
- Aggiunto flag `Misura manuale inserita dall'operatore se non leggibile da strumento`.
- Se attivo, l'operatore inserisce il valore durante il test.
- Il sistema valida il valore con min/max e assegna PASS/FAIL senza interrogare strumenti.

## Note
- Il build nell'ambiente sandbox può segnalare dipendenze mancanti (`electron`, `serialport`, `ws`, ecc.).
- La sintassi dei file JS principali e renderer è stata verificata.
