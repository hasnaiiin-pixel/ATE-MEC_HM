AT-MEC_HM 3.4 - Keysight 34461A USB/VISA

Prerequisiti:
1) Installare Keysight IO Libraries Suite dal sito ufficiale Keysight.
2) Verificare in Keysight Connection Expert che il multimetro appaia come risorsa VISA, esempio:
   USB0::0x2A8D::0x1301::MY57216945::0::INSTR
3) Installare Python 3 se non presente.
4) Eseguire INSTALLA_PYVISA_BRIDGE.bat per installare PyVISA.

Uso in AT-MEC:
Strumenti > Keysight 34461A
- Tipo connessione: USB / VISA Resource
- Premere 🔎 VISA oppure inserire manualmente la risorsa.
- Premere Collega Keysight.
- Premere *IDN? e verificare risposta KEYSIGHT TECHNOLOGIES,34461A,...

Ethernet TCP 5025 resta la modalità consigliata per sistemi industriali stabili.
