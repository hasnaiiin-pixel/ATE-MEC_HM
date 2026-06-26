# AT-MEC_HM_6.5C_REPAIR_DOSSIER_RETEST

Baseline: AT-MEC_HM_6.5B_REPAIR_INTELLIGENCE stabile.

## Modifiche
- Ticket riparazione collegati al Dossier completo della scheda.
- Flag `Includi nel dossier completo` per decidere se mostrare il ticket nella Scheda Seriale.
- Allegati ticket: foto, PDF, DOC/DOCX e TXT salvati nel ticket.
- `Invia a Retest` ora mette il ticket in stato RETEST e collega il seriale.
- Quando si ricollauda lo stesso seriale, AT-MEC mostra il ticket e il dettaglio riparazione prima del test.
- Dopo retest, il Repair Center aggiorna automaticamente:
  - PASS -> ticket CLOSED con esito RETEST PASS.
  - FAIL -> ticket IN_REPAIR con esito RETEST FAIL.
- Doppio click seriale apre il Dossier/Scheda Seriale con test, retest e ticket inclusi.

## Test consigliato
1. Apri Repair Center.
2. Apri un ticket da FAIL Queue.
3. Compila difetto, causa, azione, componenti e tecnico.
4. Aggiungi una foto o documento.
5. Verifica flag `Includi nel dossier completo`.
6. Clicca `Invia a Retest`.
7. Vai in Test Mode e inserisci lo stesso seriale.
8. Verifica avviso ticket retest.
9. Esegui retest PASS/FAIL.
10. Torna in Repair Center e premi `Aggiorna Retest`/`Aggiorna`.
11. Verifica Dossier Scheda.
