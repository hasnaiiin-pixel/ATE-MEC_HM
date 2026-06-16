# AT-MEC_HM_4.16A_APP_JS_SPLIT

Base: AT-MEC_HM_4.15B_TRACEABILITY_REPAIR_PRO.

## Obiettivo

Prima fase di pulizia professionale: riduzione del monolite `app.js` senza cambiare comportamento applicativo.

## Modifiche

- Estratti moduli append-only da `src/renderer/js/app.js`.
- Creati moduli in `src/renderer/js/modules/`.
- `index.html` carica i moduli dopo `app.js` in ordine compatibile.
- Aggiornata versione interna a 4.16A.
- Aggiunta mappa tecnica in `docs/architecture/AT_MEC_4_16A_APP_JS_SPLIT_MAP.md`.

## Non modificato

- Login
- Utenti
- Ruoli
- Permessi
- Device Manager backend
- Test Mode backend
- Ricette backend
- Report
- Hardware backend

## Verifiche locali

- `node --check` su `app.js` e tutti i moduli estratti: OK.
- Verifica riferimenti script/link HTML: OK.
- ZIP valido.

## Test manuale consigliato

1. Login admin.
2. Aprire Utenti/Ruoli e verificare permessi.
3. Aprire Device Manager.
4. Aprire Recipe Editor e pannelli Recipe Pro.
5. Avviare Test Mode.
6. Aprire Storico Seriali e Scheda Unità.
