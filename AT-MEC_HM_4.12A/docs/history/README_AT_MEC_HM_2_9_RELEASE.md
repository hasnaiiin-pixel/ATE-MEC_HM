# AT-MEC_HM_2.9

Release evolutiva basata su AT-MEC_HM_2.8.

## Novità principali

- Nuova **Modalità Test intera / Production Test Mode**:
  - nasconde menu, impostazioni e pagine tecniche;
  - mostra solo ricetta attiva, step corrente, KPI e avanzamento;
  - uscita protetta con credenziali autorizzate.

- Uscita dalla modalità test solo con ruolo autorizzato:
  - Admin;
  - Sviluppatore / Developer;
  - Engineer / Ingegnere;
  - Tecnico / Technician.

- Avanzamento test migliorato:
  - percentuale grande;
  - progress bar animata;
  - indicatore animato **TEST IN ESECUZIONE...**.

- Nuovo tasto **EMERGENZA**:
  - ferma la ricetta;
  - mette tutte le DO sicure a LOW;
  - scollega gli strumenti;
  - segnala fault e richiede controllo prima del riavvio.

- Loghi:
  - confermata opzione trasparente / sfondo bianco;
  - supporto selezione file GIF oltre a PNG/JPG/WEBP;
  - nei report PDF le GIF non vengono animate: usare PNG per report statici se serve massima compatibilità.

## Note

Il pulsante emergenza è un comando software. Per sicurezza industriale reale serve sempre un circuito di emergenza hardware cablato secondo la normativa applicabile.
