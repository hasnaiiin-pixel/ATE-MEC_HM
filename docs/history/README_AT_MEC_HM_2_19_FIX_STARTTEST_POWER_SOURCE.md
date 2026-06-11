# AT-MEC_HM_2.19 - Fix avvio ricetta

Correzioni:
- fix errore UI: Cannot read properties of null (reading 'value') in startTest;
- `power-source` non esisteva più in alcune pagine dopo il redesign, ora viene usato `power-source-page` come fallback;
- aggiunte funzioni sicure `getPowerSourceValue()` e `setPowerSourceValue()`;
- avvio test non si blocca più se la pagina Dashboard/Test Mode non contiene tutti gli elementi secondari;
- result banner e fault panel ora sono opzionali e non causano crash UI.

Questa versione parte da AT-MEC_HM_2.18.
