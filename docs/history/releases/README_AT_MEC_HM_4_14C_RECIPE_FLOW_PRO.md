# AT-MEC_HM_4.14C_RECIPE_FLOW_PRO

Baseline: AT-MEC_HM_4.14B_RECIPE_LOGIC_PRO.

## Modifiche
- Recipe Flow Pro nel Recipe Editor.
- LOOP / END LOOP con compilazione su copia della ricetta prima dell'avvio.
- WAIT/Delay rapido.
- Retry prossimo step con campi tentativi, delay e stabilità.
- Simulazione flow prima del test.
- Versione interna allineata a 4.14C in package.json, titolo e UI.

## Non toccato
Login, utenti, ruoli, permessi, Device Manager, backend hardware, report.

## Test consigliato
1. Aprire Recipe Editor.
2. Verificare pannello Recipe Flow Pro.
3. Aggiungere LOOP, WAIT, Retry.
4. Simulare flow.
5. Avviare Test Mode con ricetta semplice.
