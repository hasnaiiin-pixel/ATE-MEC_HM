# AT-MEC_HM / VEXON 10.1.15

## DMM PERSISTENT SESSION + MEASUREMENT SPEED FIX

Questa release parte dalla 10.1.14 e corregge in modo strutturale i tempi elevati tra una misura e la successiva.

### Ottimizzazioni principali

- sessione PyVISA/USBTMC persistente per Keysight 34461A: Python, PyVISA e lo strumento vengono aperti una sola volta;
- configurazione DMM memorizzata per modalità RES, VOLT DC, CURR DC e FREQ;
- la sequenza CONF/RANGE/NPLC/TRIGGER viene inviata solo quando cambia modalità o dopo un errore;
- configurazione SCPI batch, senza attese fisse da 45 ms tra ogni comando;
- tutte le misure DMM usano lo stesso percorso veloce: StableMeasurement, VoltageMeasurement, CurrentMeasurement, ResistanceTest, FrequencyTest e AnalogInputMeasurement;
- lettura `READ?` riutilizzata durante gli step compatibili;
- una sola riconnessione controllata in caso di caduta sessione VISA;
- scritture GPIO duplicate saltate quando l'uscita è già nello stato richiesto;
- log prestazioni per ogni step: GPIO pre, esecuzione misura, GPIO post, configurazione DMM, letture e totale.

### Compatibilità mantenuta

- GPIO HIGH/LOW mantenuto fino alla conclusione dello step;
- retry e fallback manuale lasciano il GPIO attivo;
- inserimento manuale confermato al primo click e cella pulita dopo avanzamento;
- Action panel unico;
- profili GPIO iniziale, tra-test e sicurezza;
- Fast Start/F1 e ciclo automatico da misura multimetro.

### Verifica consigliata con ricetta 2180321

1. Collegare Keysight 34461A in modalità USB/VISA.
2. Caricare la ricetta con nove misure di resistenza stabilizzate.
3. Eseguire il test e confrontare il tempo totale con la 10.1.14.
4. Nei log verificare una sola riga `DMM ... configurato RES`; gli step successivi devono indicare configurazione in cache.
5. Controllare le righe `[RECIPE PERF]` e `[HAL PERF]` per individuare eventuali ritardi residui del banco reale.

### Nota hardware

Il tempo reale dipende anche dalla risposta USB/VISA del Keysight e dal firmware ESP32. La validazione software inclusa simula la ricetta 2180321 e verifica che la configurazione RES venga eseguita una sola volta.
