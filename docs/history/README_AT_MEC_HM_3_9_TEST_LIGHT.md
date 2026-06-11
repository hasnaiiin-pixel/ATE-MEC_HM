# AT-MEC_HM_3.9_TEST_LIGHT

Versione di prova leggera basata su AT-MEC_HM_3.8.

## Modifiche principali
- Fix errore UI: `measurePl303Current is not defined`.
- Fix `safePl303Off` globale per bottone CH1+CH2 OFF sicuro.
- Spegnimento PL303 CH1 e CH2 con doppio invio e pausa tra comandi seriali.
- Emergenza: invio OFF PL303 prima e dopo emergency stop.
- Uscita Test Mode: PL303 CH1+CH2 OFF automatico.
- Pagina alimentatore: mostra subito tensione impostata e misura corrente reale dopo ON.
- Loghi MIRZA caricati integrati: `MIRZA_Animation.gif` e `MIRZA_LOGO.png`.
- Default loghi con sfondo bianco.

## Avvio dopo estrazione
```bash
npm install
npm audit fix --force
npm start
```

Nota: pacchetto LIGHT senza `node_modules`.
