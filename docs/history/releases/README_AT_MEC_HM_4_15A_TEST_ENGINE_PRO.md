# AT-MEC_HM_4.15A_TEST_ENGINE_PRO

Baseline: AT-MEC_HM_4.14D_RECIPE_ENTERPRISE_PRO confermata funzionante.

## Implementato
- Test Engine Pro 4.15A.
- Runtime variables raccolte durante il test.
- Step universali: tensione, corrente, resistenza, frequenza, continuità, temperatura, potenza.
- IF runtime su variabili `${VAR}`.
- Pannello live con variabili runtime e misure.
- Salvataggio misura come variabile tramite `save_as_variable`.
- Compilazione su copia della ricetta prima dell'avvio.

## Non toccato
- Login, utenti, ruoli, permessi.
- Device Manager backend.
- Hardware backend.
- Report.

## Test consigliato
1. Apri Recipe Editor.
2. Aggiungi misura tensione runtime.
3. Verifica `save_as_variable = VOLTAGE`.
4. Aggiungi IF runtime `${VOLTAGE} >= 11.5`.
5. Simula Test Engine.
6. Avvia Test Mode e verifica pannello live.
