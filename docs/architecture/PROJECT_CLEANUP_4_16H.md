# AT-MEC_HM_4.16H Project Cleanup Stabile

## Obiettivo
Pulizia finale dopo JS/HTML/CSS split, senza modificare logica applicativa.

## Azioni eseguite
- README storici spostati in `docs/history/releases/`.
- Note release legacy spostate in `docs/history/legacy-docs/`.
- BAT legacy spostati in `docs/history/legacy-scripts/`.
- Creati nuovi BAT 4.16H per avvio, installazione e installer.
- Versione interna allineata a 4.16H in package, UI e version.js.
- Mantenute intatte logiche login, ruoli, permessi, Device Manager, Recipe Engine, Test Mode, Traceability e backend.

## Baseline di partenza
AT-MEC_HM_4.16G_CSS_SPLIT confermata funzionante.

## Test consigliati
Login, Utenti/Ruoli, Device Manager, Recipe Editor, Test Mode, Report PDF, Storico Seriali, Scheda Unità.
