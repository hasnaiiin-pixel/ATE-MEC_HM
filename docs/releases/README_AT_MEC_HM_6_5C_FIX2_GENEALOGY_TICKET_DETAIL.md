# AT-MEC_HM_6.5C_FIX2_GENEALOGY_TICKET_DETAIL

Fix mirato Repair Center/Dossier.

## Incluso
- deduplica reale Genealogia, Dossier Unità e PDF dossier
- timeline TEST_FAIL → TICKET_OPEN → REPAIR_ACTION → RETEST_PASS/FAIL → TICKET_CLOSED
- dettagli ticket visibili e modificabili nel Dossier Unità
- allegati/foto/documenti visualizzati nel dettaglio ticket e dossier
- visualizzatore interno immagini per evitare finestra Electron bianca
- PDF dossier con ticket, timeline deduplicata e immagini incorporate
- in Test Mode, pulsante Apri Ticket mostra il ticket in popup senza uscire dal Test Mode

## Test consigliati
1. Apri seriale con fail/retest in Scheda Unità.
2. Verifica assenza doppioni PASS/FAIL.
3. Verifica timeline con ticket e retest.
4. Modifica dettagli ticket dal dossier e salva.
5. Apri foto allegata.
6. Genera PDF dossier.
