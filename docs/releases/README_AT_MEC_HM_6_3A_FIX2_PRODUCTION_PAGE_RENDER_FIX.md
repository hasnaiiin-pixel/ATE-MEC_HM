# AT-MEC_HM_6.3A_FIX2_PRODUCTION_PAGE_RENDER_FIX

Fix mirato per pagina Production Execution vuota.

## Correzioni
- Rimosso `display:none` dal partial Production Execution.
- Aggiunto fallback HTML se il partial non viene montato.
- `showProductionExecution63A()` forza visualizzazione e inizializzazione pagina.
- La pagina mostra messaggi chiari anche con database test vuoto.
- BAT aggiornati a 6.3A_FIX2.
- README vecchi archiviati in `docs/releases`.

## Da provare
1. Avviare con `AVVIA_AT_MEC_HM_6.3A_FIX2.bat`.
2. Aprire `Produzione → Production Execution`.
3. Verificare che la pagina sia visibile.
4. Premere `Aggiorna dati reali`.
5. Se non ci sono test, deve comparire una pagina con KPI a 0, non una pagina vuota.
