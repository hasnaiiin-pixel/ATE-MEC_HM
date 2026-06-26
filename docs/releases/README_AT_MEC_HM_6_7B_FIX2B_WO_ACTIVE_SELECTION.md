# AT-MEC_HM_6.7B_FIX2B_WO_ACTIVE_SELECTION

Fix su flusso Work Order in Test Mode.

## Modifiche

- Test Mode non si blocca all ingresso.
- Dashboard iniziale pulita.
- Mostra elenco di tutte le WO attive/aperti selezionabili.
- La WO viene scelta dall operatore prima del collaudo.
- Dopo selezione, AT-MEC carica commessa, lotto e ricetta dalla WO.
- START/F1 usa la WO selezionata.
- Se nessuna WO selezionata, START mostra selettore solo al momento dell avvio.
- Contatori WO riferiti alla WO selezionata.
- PASS aggiorna prodotti/residuo. FAIL aggiorna solo fail.

## Base

Ripartito da AT-MEC_HM_6.7B_FIX2A_WO_START_INTEGRATION con correzione logica di selezione WO attive.
