# AT-MEC_HM_7.7.1_AI_APPROVAL_PERSISTENCE_UX

Base: `AT-MEC_HM_7.7_AI_PROVIDER_APPROVAL_SAFE`.

## Modifiche
- Coda approvazioni AI resa persistente: `Approva` e `Rifiuta` non tornano più `PENDING` quando premi `Aggiorna coda`, se il suggerimento è lo stesso.
- Aggiunto identificatore stabile per ogni suggerimento AI basato su area, titolo, azione, sorgente e rischio.
- Aggiunta evidenza colore sui pulsanti AI selezionati.
- Aggiunta evidenza del pannello selezionato.
- Aggiunto riquadro `Roadmap AI ridotta — stato verso 8.0` dentro la pagina AI esistente.
- Nessuna nuova pagina doppia e nessun nuovo modulo business duplicato.

## Test specifici della release
1. Aprire `AI Copilot`.
2. Premere `Analisi completa`: il pulsante deve restare evidenziato e si deve aggiornare il riquadro roadmap 8.0.
3. Premere `FAIL / Qualità`: il pulsante deve cambiare colore e il pannello qualità deve evidenziarsi.
4. Premere `Review ricetta`: il pulsante deve cambiare colore e il pannello ricetta deve evidenziarsi.
5. Premere `Crea coda approvazioni`.
6. Approvare una voce e rifiutarne una.
7. Premere di nuovo `Aggiorna coda`.
8. Le decisioni già prese devono restare `APPROVED_NO_RUNTIME_CHANGE` o `REJECTED`, non tornare `PENDING`.

## Bloccante se
- I pulsanti non cambiano colore quando selezionati.
- `Approva` o `Rifiuta` tornano `PENDING` dopo `Aggiorna coda` con lo stesso suggerimento.
- AI modifica automaticamente WO, ricette, utenti, test o hardware.
- Si crea una nuova pagina duplicata per AI, Analytics, Repair, Traceability, MES o Factory.
