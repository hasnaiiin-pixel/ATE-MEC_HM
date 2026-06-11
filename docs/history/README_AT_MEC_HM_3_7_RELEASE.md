# AT-MEC_HM_3.7

## Sicurezza alimentatore PL303QMD-P

Questa release aggiunge una logica di sicurezza fondamentale per proteggere le schede durante collaudo.

### Spegnimento automatico CH1/CH2
L'alimentatore PL303 viene disattivato automaticamente in questi casi:
- chiusura applicazione
- fine test
- FAIL
- STOP TEST / stop operatore
- ABORT / errore esecuzione
- emergenza

Il comando eseguito e':
- `OP1 0`
- `OP2 0`

### Nuovo step ricetta
`PowerSupplyMeasureCurrent` misura il consumo corrente dal canale selezionato del PL303.

Campi principali:
- canale CH1/CH2
- min
- max
- unita' A o mA
- timeout/stabilizzazione

Il risultato viene salvato nello step log e nel report test.

### Pagina Alimentatore
Aggiunto pulsante `CH1+CH2 OFF SICURO` e pulsanti `MISURA I` per canale.
