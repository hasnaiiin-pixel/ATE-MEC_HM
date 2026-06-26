# AT-MEC_HM_6.5C_FIX1_REPAIR_DOSSIER_DETAIL

Fix mirato su Repair Center Enterprise.

## Correzioni principali
- Dossier seriale con timeline completa: TEST, FAIL, REPAIR_OPEN, REPAIR_ACTION, RETEST_PASS/FAIL, REPAIR_CLOSED.
- Dettaglio ticket completo nel dossier e nel dettaglio ticket.
- Allegati/foto/documenti visibili nel dossier.
- Deduplica righe test duplicate su seriale/timestamp/esito/ricetta/operatore.
- Distinzione tra TEST_PASS, TEST_FAIL, RETEST_PASS e RETEST_FAIL.
- Popup RETEST moderno in stile AT-MEC, con difetto, causa, riparazione e tecnico.
- Export JSON aggiornato alla release 6.5C_FIX1.

## Cosa provare
1. Aprire un ticket con difetto, causa, azione correttiva, componenti e tecnico.
2. Allegare una foto o un PDF al ticket.
3. Inviare il ticket a RETEST.
4. Ricollaudare lo stesso seriale: deve comparire il popup moderno.
5. Se il retest passa, il ticket deve chiudersi e il dossier deve mostrare RETEST_PASS / CLOSED.
6. Doppio click sul seriale: verificare timeline, dettagli ticket e allegati.
