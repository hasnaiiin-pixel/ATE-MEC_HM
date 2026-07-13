# AT-MEC_HM_10.1.11_MANUAL_FALLBACK_DIRECT_CONFIRM_CLEAR_FIX

## Obiettivo
Correggere definitivamente il fallback manuale della misura stabilizzata quando il primo click su **Conferma** non veniva accettato subito.

## Problema risolto
Nella 10.1.10 poteva capitare che l'operatore inserisse il valore manuale ma il test non proseguisse al primo click. Era necessario cliccare fuori, reinserire il dato o premere Conferma più volte.

## Modifiche implementate
- Conferma manuale diretta dal popup `StableMeasurement` tramite `api.manualStepResponse`.
- Salvataggio del `requestId` ricevuto da `manual-step-request`.
- Scrittura del valore in tutti i campi manuali compatibili legacy prima della conferma.
- Eventi `input`, `change` e `blur` forzati sui campi compatibili.
- Protezione anti doppio invio durante `CONFERMO...`.
- Pulizia automatica del valore manuale dopo conferma, step passato/fallito o run completata.
- Race guard nel `RecipeEngine`: se una risposta manuale arriva troppo velocemente, viene conservata fino alla registrazione del resolver.

## File modificati
- `src/renderer/js/modules/ui/action-live-measurement-1012.js`
- `src/main/runtime/RecipeEngine.ts`
- `dist/main/runtime/RecipeEngine.js`
- `src/renderer/js/version.js`
- `config/app_settings.json`
- `package.json`
- `package-lock.json`
- `scripts/runtime_validate_10111.js`
- `scripts/startup_doctor_10111.js`

## Verifica operatore
1. Avvia una ricetta con `StableMeasurement`.
2. Porta la misura in fallback manuale.
3. Inserisci il valore nel popup.
4. Premi **Conferma** una sola volta.
5. Il test deve proseguire subito.
6. Dopo l'avanzamento, la cella del valore manuale deve tornare vuota.
