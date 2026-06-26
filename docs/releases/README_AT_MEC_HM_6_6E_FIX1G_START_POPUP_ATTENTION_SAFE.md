# AT-MEC_HM_6.6E_FIX1G_START_POPUP_ATTENTION_SAFE

Baseline: AT-MEC_HM_6.6E_FIX1E_START_WORKFLOW.

## Fix

- Popup avvio test con SN obbligatorio reso sicuro: START, INVIO ed ESC/chiudi funzionano sempre.
- Rimosso lampeggio aggressivo dal banner/dashboard generale.
- Attenzione operatore solo nel punto di azione: Action Panel o popup avvio test.
- Stile professionale con evidenza leggera su IN ATTESA OPERATORE.
- Focus automatico sul campo Serial Number.
- Layout Test Mode precedente mantenuto.

## Test consigliati

1. SN obbligatorio ON → F1/START → popup → inserisci SN → INVIO.
2. SN obbligatorio ON → popup → ANNULLA / X / ESC.
3. SN obbligatorio OFF → F1/START parte diretto.
4. Misura manuale → attenzione solo su Action Panel.
