# AT-MEC_HM_3.4

Base: AT-MEC_HM_3.3.

## Novità
- Supporto reale Keysight 34461A USB/VISA tramite bridge Python PyVISA.
- Scansione risorse VISA da pagina Keysight.
- Connessione a risorsa tipo `USB0::0x2A8D::0x1301::MY57216945::0::INSTR`.
- Query `*IDN?`, SCPI manuale e misure live usando lo stesso driver.
- Mantiene Ethernet TCP 5025 e USB/COM fallback.
- Aggiunti script e istruzioni in `drivers/Keysight_34461A`.

## Nota
Per USB/VISA sono necessari Keysight IO Libraries Suite e Python PyVISA installati sul PC.
