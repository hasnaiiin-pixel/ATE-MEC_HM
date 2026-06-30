# Release AT-MEC_HM_7.6.2_FIX1_AI_COPILOT_UI_ACTIONS

Base: `AT-MEC_HM_7.6.1_AI_COPILOT_DEDICATED_MENU_INSIGHTS`.

## Modifiche

- AI Copilot completato in modalità locale/read-only.
- Menu AI ridotto a due azioni principali.
- Aggiunto `runAiCompleteAnalysis762()`.
- Aggiunto `exportAiCompleteReport762()`.
- Aggiunti pannelli: matrice moduli, anti-doppioni, qualità dati, preview report.
- Prompt AI strutturato per produzione, qualità, ricetta, dati mancanti e piano azione.

## Non modificato

- Test Engine
- Device Manager
- Hardware
- Ricette
- Traceability
- Repair Center
- Analytics Center
- MES / Work Orders

## Test release specifici

1. Aprire `AI Copilot` dalla sidebar.
2. Premere `Analisi completa`.
3. Verificare matrice moduli, anti-doppioni, qualità dati e preview report.
4. Premere `Copia prompt`.
5. Premere `Esporta report completo`.
