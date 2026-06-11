# Fix AT-MEC_HM_1_41 - UI bloccata per errore JavaScript

Correzione applicata:

- Risolto errore critico:
  - `Uncaught SyntaxError: Unexpected identifier 'operatore'`
- Causa:
  - stringa JavaScript con apostrofo non escapato in `L'operatore`
  - l'errore interrompeva il caricamento dell'intero script
  - di conseguenza funzioni come `showTab`, `loadSavedRecipe`, `stopQr` risultavano non definite
- Verifica:
  - eseguito controllo sintattico sullo script estratto da `src/renderer/index.html`
  - nessun errore rilevato da `node --check`

Effetto:

- Menu e tab tornano cliccabili
- Ricette e pagina ESP32 tornano utilizzabili
- Lo step manuale resta disponibile
