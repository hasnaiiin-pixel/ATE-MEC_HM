AT-MEC_HM 3.3 - Driver Keysight 34461A

Strada consigliata:
1) Ethernet/LAN SCPI: collegare il 34461A in rete, usare IP e porta 5025. Non richiede driver VISA nel software.
2) USB/VISA: installare Keysight IO Libraries Suite sul PC e verificare lo strumento con Keysight Connection Expert.
3) USB/COM: usare solo se Windows espone lo strumento come porta COM virtuale.

File proprietari Keysight:
- Non sono inclusi nello ZIP per motivi di licenza.
- Scaricare Keysight IO Libraries Suite dal sito ufficiale Keysight.
- Copiare l’installer in drivers/Keysight_34461A/installers.

Configurazione in AT-MEC:
Strumenti > Keysight Multimetro
- Ethernet / LAN SCPI: IP + porta 5025
- USB / COM: COMx + baud
- USB / VISA Resource: USB0::...::INSTR

Test iniziale:
Premere Collega Keysight e poi *IDN?.
