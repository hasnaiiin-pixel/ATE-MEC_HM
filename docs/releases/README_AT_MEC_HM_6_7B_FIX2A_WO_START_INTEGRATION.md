# AT-MEC_HM_6.7B_FIX2A_WO_START_INTEGRATION

Fix sicura della 6.7B: integrazione Work Order in Test Mode solo al momento di START/F1.

## Correzioni

- Base: AT-MEC_HM_6.7B_FIX1_WO_MASTERDATA_CONSOLIDATION.
- Nessun controllo WO all’ingresso in Test Mode.
- Nessun overlay permanente o blocco pagina.
- START/F1 controlla la WO solo al momento dell’avvio.
- Se WO attiva presente: carica commessa/lotto e ricetta automaticamente.
- Se una sola WO aperta: la imposta automaticamente.
- Se più WO aperte: mostra selettore non bloccante con opzione continua senza WO.
- Pannello contatori WO informativo e non bloccante.
- PASS aggiorna prodotti/residuo; FAIL aggiorna fail senza scalare residuo.
- BAT/versione aggiornati a 6.7B_FIX2A.

## Prove consigliate

1. Entra in Test Mode: la pagina deve essere cliccabile e scrollabile.
2. Premi START/F1 con WO attiva: commessa/ricetta devono caricarsi.
3. Con più WO aperte: appare selettore solo allo START.
4. Se annulli selettore: Test Mode resta utilizzabile.
5. Esegui PASS/FAIL e verifica contatori WO.
