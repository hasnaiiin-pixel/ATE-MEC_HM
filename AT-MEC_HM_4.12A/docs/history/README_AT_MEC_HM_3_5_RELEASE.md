# AT-MEC_HM_3.5

Release basata su AT-MEC_HM_3.4.

## Fix Keysight 34461A USB/VISA

Corretto il riconoscimento LIVE del multimetro Keysight 34461A quando la risposta `*IDN?` arriva nel formato:

```text
Keysight Technologies,34461A,MY57216945,...
```

La validazione ora è case-insensitive e considera valido lo strumento se la risposta contiene `Keysight` oppure `34461A`.

## Migliorie incluse

- Timeout VISA aumentato per evitare falsi timeout.
- Timeout UI Keysight aumentato durante connessione e interrogazioni.
- `*IDN?` tenta prima la connessione se lo strumento non risulta LIVE.
- Resource predefinita supportata:

```text
USB0::0x2A8D::0x1301::MY57216945::0::INSTR
```

## Procedura test

1. Installare Keysight IO Libraries Suite.
2. Eseguire `drivers/Keysight_34461A/INSTALLA_PYVISA_BRIDGE.bat`.
3. Aprire AT-MEC.
4. Strumenti -> Keysight 34461A.
5. Selezionare USB/VISA.
6. Inserire/selezionare resource VISA.
7. Premere `*IDN?`.

Risposta attesa:

```text
Keysight Technologies,34461A,MY57216945,...
```
