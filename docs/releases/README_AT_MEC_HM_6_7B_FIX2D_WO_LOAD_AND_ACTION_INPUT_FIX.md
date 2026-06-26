# AT-MEC_HM_6.7B_FIX2D_WO_LOAD_AND_ACTION_INPUT_FIX

Fix mirata Work Order + Test Mode.

## Correzioni
- Commessa Test Mode = numero WO.
- Lotto rimosso dalla logica Test Board WO.
- Selezione WO aggiorna subito commessa, cliente, prodotto, firmware, ricetta e contatori.
- Caricamento automatico ricetta dalla WO selezionata.
- Flag Usa Work Order / Modalità Libera.
- Action Panel: input misura manuale ripristinato con numeri, punto, virgola e segno meno.
- KPI WO aggiornati al cambio WO.

## Test consigliati
1. Apri Test Mode: nessun blocco.
2. Attiva Usa Work Order.
3. Seleziona WO: verifica commessa e ricetta.
4. START/F1: inserisci solo S/N.
5. Prova Action Panel misura manuale con 12, 12.5, 12,5, -1.25.
