# AT-MEC_HM_9.1_AI_ACTION_QUEUE_SAFE

AI Action Queue 9.1 aggiunge una coda azioni manuale dentro AI Copilot.

## Regole

- AI propone azioni, ma non le esegue.
- Approva/Rifiuta/Completa manuale modificano solo lo stato della coda.
- Nessuna modifica automatica a ricette, WO, utenti, test o hardware.
- Nessuna nuova pagina Repair, Analytics, MES, Factory o Recipe.

## Sorgenti lette

- AI Factory Command Center 9.0
- AI Workbench / Piano azione
- Coda approvazioni AI 7.7

## Chiavi runtime

- `atmec91_ai_action_queue`
- `atmec91_ai_action_queue_report`
- `atmec91_ai_action_history`
