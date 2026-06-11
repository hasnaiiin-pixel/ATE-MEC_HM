# AT-MEC_HM_3.6

Release basata su AT-MEC_HM_3.5.

## Novità principali

### Alimentatore Aim-TTi PL303QMD-P a 2 canali
- Pagina `Alimentatore PL303` aggiornata per uso separato di CH1 e CH2.
- Ogni canale ha campi indipendenti:
  - tensione setpoint;
  - corrente limite;
  - uscita ON/OFF;
  - lettura stato.
- Comandi SCPI usati:
  - `V1`, `I1`, `OP1` per CH1;
  - `V2`, `I2`, `OP2` per CH2;
  - `V1O?`, `I1O?`, `V2O?`, `I2O?` per lettura.

### Ricette
- Aggiunto step `PowerSupplySet`.
- Nel wizard ricette è disponibile la tipologia `Alimentatore`.
- Lo step alimentatore mostra solo opzioni pertinenti:
  - canale CH1/CH2;
  - tensione;
  - corrente;
  - output ON/OFF;
  - timeout.
- Lo step usa lo strumento `AimTTi_PL303`.

### Compatibilità
- Restano incluse le modifiche AT-MEC_HM_3.5:
  - Keysight 34461A Ethernet/TCP;
  - USB/COM;
  - USB/VISA tramite bridge PyVISA;
  - resource VISA predefinita per 34461A;
  - wizard filtrato;
  - misura manuale nello step manuale.

## Nota build
Nel sandbox la build può fallire per assenza di dipendenze (`electron`, `serialport`, `@types/node`, ecc.). In ambiente progetto eseguire:

```bash
npm install
npm run build
```
