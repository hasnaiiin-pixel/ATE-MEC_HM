# AT-MEC_HM_6.7B_FIX2C_WO_COMPACT_SELECTOR

Release basata su 6.7B_FIX2B con correzione della selezione Work Order in Test Mode.

## Modifiche
- Work Order in Test Mode visualizzate tramite selettore compatto, non come elenco/card completo.
- Ricerca rapida WO.
- Mostra solo la WO selezionata e i KPI relativi.
- START/F1 usa la WO selezionata; se manca, apre selettore WO.
- Possibilità di cambiare WO senza uscire dal Test Mode.
- Nessun blocco all’ingresso nel Test Mode.

## Verifica
1. Aprire Test Mode.
2. Verificare che non compaia una lista lunga di WO.
3. Selezionare una WO dal menu a tendina.
4. Verificare KPI: previsti, PASS, FAIL, residuo, yield.
5. Premere START/F1 e verificare che il collaudo usi la WO selezionata.
