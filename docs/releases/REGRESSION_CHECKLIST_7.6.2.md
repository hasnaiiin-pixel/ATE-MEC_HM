# Test specifici 7.6.2

Testare solo AI Copilot.

## Test 1 - Menu AI

Aprire `AI Copilot` dalla sidebar.

Esito atteso: apre `AI Copilot Center`, senza pagina bianca.

## Test 2 - Analisi completa

Premere `Analisi completa`.

Esito atteso: si popolano contesto, workbench, matrice moduli, anti-doppioni, qualità dati e preview report.

## Test 3 - Prompt

Premere `Copia prompt`.

Esito atteso: prompt strutturato e copiabile, senza dati inventati.

## Test 4 - Export

Premere `Esporta report completo`.

Esito atteso: viene scaricato un JSON report AI completo.

## Bloccante

- AI Copilot non si apre.
- Analisi completa genera errore JS.
- AI modifica dati da sola.
- Report export non parte.
