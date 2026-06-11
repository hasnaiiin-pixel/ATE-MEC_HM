# AT-MEC_HM_1_41 — Step manuale guidato e log pulito

Versione basata sulla stabile AT-MEC_HM_1_41.

## Novità principali

### Step manuale guidato
Nuovo tipo step: `ManualMeasurement`.

Durante l'esecuzione ricetta appare un popup operatore con:
- istruzioni testuali;
- immagine dimostrativa opzionale;
- tipo misura da acquisire;
- tempo di stabilizzazione impostabile;
- conferma operatore prima dell'acquisizione.

Dopo la conferma, il sistema aspetta il tempo di stabilizzazione e poi acquisisce automaticamente la misura selezionata.

Tipi misura supportati:
- AI ESP32;
- DI ESP32;
- DO feedback ESP32;
- SCPI da strumento;
- sola conferma operatore.

### Log step più pulito
Il log di esecuzione ora stampa righe sintetiche:
- `Uscita 1 OK`;
- `Ingresso 1 OK`;
- `AI 4 OK: valore`;
- `Manuale OK: valore`.

Le righe tecniche intermedie non vengono più stampate nel log principale, salvo warning o fail.

### Stato grafico degli step
Gli step passati vengono evidenziati in verde.
Gli step falliti vengono evidenziati in rosso.

### Gestione fail operatore
Quando uno step fallisce, la ricetta si ferma e mostra una scelta:
- `Continua comunque`;
- `Ferma test`.

Se l'operatore continua, il test prosegue ma il risultato finale resta FAIL.

## File modificati
- `src/main/runtime/RecipeEngine.ts`
- `src/main/main.ts`
- `src/main/preload.ts`
- `src/main/core/EventBus.ts`
- `src/renderer/index.html`
- `dist/main/*` aggiornato tramite TypeScript emit anche se nell'ambiente locale mancavano dipendenze Node/Electron.
