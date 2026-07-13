# AT-MEC_HM_10.1.10_MANUAL_FALLBACK_FOCUS_IMMEDIATE_CONFIRM_FIX

## Obiettivo release
Correggere il comportamento del fallback manuale nel popup MISURA STABILIZZATA: dopo aver inserito il valore manuale, il pulsante Conferma deve funzionare subito senza dover cliccare su un'altra finestra, perdere focus o rientrare nel popup.

## Problema risolto
Nella 10.1.9, in alcune condizioni Electron/Chromium, il primo click su Conferma poteva non inviare immediatamente il valore appena digitato nel campo manuale. L'operatore era costretto a spostare il focus su un'altra finestra, tornare nell'app e premere nuovamente Conferma.

## Modifiche implementate
- Conferma immediata del valore manuale tramite `pointerdown` oltre al normale `click`.
- Lettura diretta del valore dal campo popup anche quando il focus resta dentro l'input.
- Salvataggio temporaneo `lastManualValue` durante input/change/compositionend.
- Copia robusta nel campo legacy `manual-step-value` con eventi `input` e `change` forzati.
- Mantenimento del popup manuale nello stesso punto, senza passaggio a finestre/pannelli secondari.
- Focus automatico sul campo manuale quando il fallback viene richiesto.
- Conferma con tasto Enter.
- Protezione da doppio invio con stato `manualSubmitting`.
- Stato visivo `CONFERMO...` durante l'invio manuale.
- Riprova multimetro azzera correttamente modalità manuale e valore temporaneo.

## File principali modificati
- `src/renderer/js/modules/ui/action-live-measurement-1012.js`
- `src/renderer/css/modules/45-action-live-measurement-1012.css`
- `src/renderer/js/version.js`
- `config/app_settings.json`
- `package.json`
- `package-lock.json`
- `scripts/runtime_validate_10110.js`
- `scripts/startup_doctor_10110.js`

## Verifica operatore
1. Avviare VEXON 10.1.10.
2. Entrare in Test Mode.
3. Eseguire una ricetta con step `StableMeasurement`.
4. Portare la misura in fallback manuale, oppure scollegare/forzare errore multimetro.
5. Nel popup MISURA, inserire un valore manuale.
6. Premere Conferma una sola volta, senza cambiare finestra.
7. Il valore deve essere accettato subito e il test deve proseguire/assegnare PASS-FAIL secondo min/max.

## Stato
Patch mirata, senza modifiche al motore test, al database, alle ricette o alla gestione strumenti.
