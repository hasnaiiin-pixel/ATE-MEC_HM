# AT-MEC_HM_4.16G_CSS_SPLIT

Baseline: AT-MEC_HM_4.16F_INDEX_HTML_FINAL_SPLIT.

## Obiettivo
Separare il CSS monolitico senza cambiare grafica o comportamento.

## Modifiche
- `src/renderer/css/app.css` trasformato in indice di import.
- Creati moduli CSS in `src/renderer/css/modules/`.
- Ordine CSS originale preservato per ridurre il rischio regressioni.
- Versione interna aggiornata a 4.16G.

## Non toccato
- Login, utenti, ruoli, permessi.
- Device Manager.
- Recipe Engine.
- Test Mode.
- Backend, preload, main process.

## Test consigliato
1. Login admin.
2. Apertura tutte le tab.
3. Test Mode.
4. Recipe Editor.
5. Device Manager.
6. Storico Seriali / Scheda Unità.
7. Report PDF.
