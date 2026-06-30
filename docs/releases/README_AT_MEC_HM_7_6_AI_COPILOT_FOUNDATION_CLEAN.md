# Release AT-MEC_HM_7.6_AI_COPILOT_FOUNDATION_CLEAN

## Base

Derivata da `AT-MEC_HM_7.5.3_CLEAN_BASELINE_STARTUP_SAFE`, confermata funzionante.

## Obiettivo

Integrare la prima fondazione AI senza duplicare funzionalità già presenti.

## Modifiche

- Nuovo modulo AI read-only: `ai-copilot-76.js`.
- Nuovo CSS: `34-ai-copilot-76.css`.
- Pannello AI dentro Enterprise esistente.
- Menu `AI Copilot` che apre il pannello, non una pagina duplicata.
- Provider AI predisposto ma disattivato per default.
- Prompt AI con regole anti-duplicazione.
- Runtime validation 7.6.
- Startup doctor 7.6.

## Anti duplicazione

La release non aggiunge nuovi moduli per Traceability, Repair, Analytics, MES, Factory, Work Orders, Device Manager o Test Mode.

## Test obbligatori

- Avvio applicazione.
- Apertura Test Mode.
- Apertura Enterprise / AI Copilot 7.6.
- Pulsante Analizza contesto.
- Pulsante Crea prompt AI.
- Export contesto AI.
- Runtime validation 100%.
- Cleanup audit 100%.
