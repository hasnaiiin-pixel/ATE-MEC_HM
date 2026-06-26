# AT-MEC_HM_6.5C_FIX3_MULTI_REPAIR_ACTIONS

Fix Repair Center Enterprise:

- interventi multipli nello stesso ticket;
- ogni intervento ha tecnico, difetto, causa, azione correttiva, componenti e note;
- timeline completa TEST_FAIL → TICKET_OPEN → REPAIR_ACTION_1/2/... → RETEST_FAIL/PASS → TICKET_CLOSED;
- PDF dossier con colori evento;
- Dossier Unità mostra tutti gli interventi;
- Test Mode può aprire il ticket senza uscire dal test.

## Test consigliato

1. Apri un ticket da FAIL Queue.
2. Inserisci Intervento #1.
3. Invia a Retest e fai FAIL.
4. Aggiungi Intervento #2.
5. Fai Retest PASS.
6. Apri Dossier seriale e verifica timeline e PDF colorato.
