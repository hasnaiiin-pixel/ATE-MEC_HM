# AT-MEC_HM_3.17_TEST_LIGHT

Revisione LIGHT senza node_modules.

Modifiche principali:
- Fallback misura manuale quando multimetro/SCPI fallisce: l’operatore inserisce valore, PASS/FAIL resta automatico su min/max.
- Rimossi pulsanti PASS/FAIL manuale dal modal operatore e dai template rapidi.
- Celle input più chiare e avvisi più visibili.
- Baseline loghi: MEC = aziendale, MIRZA = sviluppatore, GIF MIRZA in login/test mode dove previsto.
- Dettagli step ricetta visualizzabili/nascondibili.
- Pagina ricette più compatta e ordinata.
- Dashboard esecuzione: sezione superiore ridotta, logo rimosso, KPI compatti a destra.
- Pulsanti esecuzione orizzontali con icone moderne; doppia barra test nascosta.
- Barre sinistra/destra sovrapponibili/chiudibili.
- Test Mode: campi seriale/campione allineati, timing centrato.
- Aggiunto campo Cliente ricetta e filtro cliente su dashboard/test mode.

Avvio:
```bash
npm install
npm start
```
