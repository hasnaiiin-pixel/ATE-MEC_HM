# AT-MEC_HM_2.4 - Ricette, loghi e multimetro

## Ricette
- Aggiunti pulsanti moderni nella pagina Ricette & Step.
- Aggiunto **Esporta ricetta** con percorso scelto dall'utente.
- Aggiunto **Importa ricetta** da file `.json` scelto dall'utente.
- La ricetta viene rinumerata automaticamente dopo import/riordino.

## Loghi
- I loghi sono salvati anche come Data URL per evitare blocchi CSP di Electron.
- Aggiunti loghi configurabili:
  - Login logo grande
  - Login logo piccolo
  - App logo aziendale grande
  - App logo sviluppatore piccolo
  - Report logo azienda
  - Report logo costruttore

## Multimetro
ATE-MEC usa un driver SCPI TCP/IP per `Keysight_34465A`.
Se in Settings l'indirizzo è `127.0.0.1` oppure lo strumento risulta MOCK, le misure sono simulate/casuali.
Per misure reali serve:
1. collegare il multimetro alla rete/LAN o USB-TMC con bridge SCPI compatibile;
2. impostare IP reale del multimetro in Settings;
3. usare porta TCP normalmente `5025`;
4. verificare che lo stato sia LIVE prima di avviare le ricette.

Se il tuo multimetro non è Keysight 34465A, va aggiunto un driver/provider dedicato o SCPI generico con comando configurabile.
