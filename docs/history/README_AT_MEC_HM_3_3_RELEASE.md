# AT-MEC_HM_3.3

Base: AT-MEC_HM_3.2.

## Modifiche principali

- Pagina Keysight 34461A migliorata.
- Scelta connessione: Ethernet/LAN SCPI, USB/COM, USB/VISA Resource.
- Test connessione Keysight dedicato.
- Interrogazione *IDN?.
- Interrogazione SCPI manuale.
- Misure live VDC/VAC/IDC/IAC/Ohm/Freq.
- Live polling selezionabile.
- Log comunicazione Keysight nella pagina multimetro.
- Salvataggio impostazioni Keysight con modo connessione.
- Cartella drivers/Keysight_34461A con istruzioni e script di supporto.

## Nota driver USB/VISA

I driver Keysight proprietari non sono inclusi direttamente. Inserire l’installer ufficiale Keysight IO Libraries Suite nella cartella drivers/Keysight_34461A/installers prima della distribuzione cliente.
