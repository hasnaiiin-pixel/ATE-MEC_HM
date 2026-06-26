# AT-MEC_HM_6.6E_FIX1C_TEST_BOARD_LAYOUT_RECOVERY

Baseline: AT-MEC_HM_6.6E_FIX1_COMPACT_TEST_MODE_UI.

## Modifiche
- Step Card e Log Sequenza sulla stessa riga: 50% / 50%.
- `testmode.status.banner` spostato sotto e largo 100%.
- Mini preview etichetta ripristinata stile FIX1 e spostata sotto la barra percentuale.
- Tasti misura in maiuscolo: MISURA MANUALE, RIPROVA MULTIMETRO, MISURA NON DISPONIBILE.
- Input misura manuale: accetta più cifre, punto, virgola e valori negativi; conferma con INVIO.
- Login con elenco utenti attivi: selezione utente + sola password.
- Non modificati flag seriale, scheda campione e Abilita all'inizio produzione.

## Test consigliati
1. Avvio app.
2. Login selezionando utente e inserendo solo password.
3. Test Mode: controllare layout 50/50 e banner 100%.
4. Misura manuale: inserire `12`, `12,5`, `12.5`, `-1,25` e confermare con INVIO.
5. Verificare mini preview etichetta sotto barra percentuale.
