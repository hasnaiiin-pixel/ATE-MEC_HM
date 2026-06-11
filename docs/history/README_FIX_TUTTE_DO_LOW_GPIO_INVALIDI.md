# Fix ATE_MEC_2.0 — Tutte DO LOW / GPIO invalidi

Problema risolto:
- Il comando "Tutte DO LOW" includeva anche GPIO disabilitati o non validi come GPIO0, GPIO19 e GPIO20.
- La UI mostrava comunque "DOx impostata a LOW" anche quando il backend aveva restituito errore.
- Dopo l'errore, il controllo I/O poteva sembrare bloccato o non più affidabile.

Correzioni:
- "Tutte DO LOW" usa solo GPIO sicuri (`safe !== false`).
- GPIO0, GPIO19, GPIO20 e altri pin riservati vengono saltati.
- Il live polling legge solo canali sicuri.
- `esp32SetDo()` ora controlla il risultato reale del comando e stampa OK solo se `ok:true`.
- Il live viene sospeso durante "Tutte DO LOW" e riavviato alla fine.
- Il flag di busy viene sempre rilasciato nel `finally`.

Risultato atteso:
- Premendo "Tutte DO LOW" non devono più comparire errori tipo "GPIO mancante/non valido".
- Dopo il comando, puoi subito comandare di nuovo una singola uscita, ad esempio GPIO4 HIGH.
