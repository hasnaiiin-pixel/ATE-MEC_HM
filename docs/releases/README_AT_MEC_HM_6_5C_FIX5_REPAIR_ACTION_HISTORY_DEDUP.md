# AT-MEC_HM_6.5C_FIX5_REPAIR_ACTION_HISTORY_DEDUP

Fix mirato Repair Center/Dossier.

## Correzioni
- Ticket con più interventi storici nello stesso ticket.
- Test Mode mostra tutti i ticket/interventi collegati al seriale.
- Retest FAIL aggiorna il ticket esistente e abilita un nuovo intervento.
- Dossier e PDF stampano tutti gli interventi.
- Deduplica forte PASS/FAIL in genealogia, dossier e PDF.
- PDF con loghi MEC/MIRZA e colori solo sui badge evento.
- Dettaglio ticket resta visibile dopo salvataggio.

## Test consigliato
FAIL → apri ticket → intervento #1 → retest FAIL → intervento #2 → retest PASS → dossier/PDF.
