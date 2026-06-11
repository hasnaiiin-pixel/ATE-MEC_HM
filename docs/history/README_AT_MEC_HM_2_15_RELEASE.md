# AT-MEC_HM_2.15

Release di integrazione strumenti e stabilità produzione.

## Novità principali

- Pagina separata **Alimentatore PL303**.
- Driver Aim-TTi PL303 con due modalità:
  - USB/seriale COM;
  - Ethernet/TCP SCPI.
- Impostazione manuale tensione/corrente da HMI.
- Uscita PL303 ON/OFF da pagina dedicata.
- Lettura stato PL303 con timeout protetto.
- Scanner QR migliorato:
  - webcam;
  - scanner USB HID tramite campo seriale dedicato.
- Quando premi **TEST**, il sistema prova prima a ricollegare automaticamente gli strumenti, poi valida hardware e avvia la ricetta.
- Device Manager più completo per ESP32, multimetro e PL303.
- Log e funzioni aggiunte con commenti descrittivi.

## Note driver PL303

Comandi SCPI usati:

- `V1 <valore>` tensione canale 1;
- `I1 <valore>` corrente limite canale 1;
- `OP1 1` uscita ON;
- `OP1 0` uscita OFF;
- `V1O?` lettura tensione output;
- `I1O?` lettura corrente output.

Se lo strumento non è trovato, AT-MEC passa in MOCK senza bloccare la UI.
