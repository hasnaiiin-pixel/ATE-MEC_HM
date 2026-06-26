# AT-MEC_HM_6.6E_FIX1_FIX1_COMPACT_TEST_MODE_UI

## Obiettivo
Miglioramento grafico e operativo del Test Mode senza modificare il motore test, ricette, hardware, Repair Center, Repository, Backup o SQLite.

## Incluso
- Misura Manuale Assistita con ultima lettura live multimetro.
- Valore atteso, tolleranza e range accettabile chiaramente visibili.
- Barra grafica tolleranza con indicatore valore.
- PASS/FAIL live durante inserimento valore manuale.
- Stato strumenti live: PL303, Multimetro, ESP32, Repository.
- KPI sessione: PASS, FAIL, Yield, Tempo sessione.
- Step Card Pro.
- Log eventi con badge moderni.
- Compatibilità con Action Panel 6.6D.

## Test consigliati
1. Avvio app.
2. Test Mode: verificare che campo S/N non si sposti.
3. Misura manuale: verificare card assistita e range tolleranza.
4. Multimetro offline/fallback: verificare ultima lettura o stato offline.
5. Log eventi: verificare badge PASS/FAIL/MANUALE/RETEST.
6. Pagine già stabili: Repair Center, Repository, Database Status.

## Note
La release è UI/UX. Non cambia le regole di esecuzione test.
