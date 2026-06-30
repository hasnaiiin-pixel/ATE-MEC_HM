# AT-MEC HM 7.5 Clean Baseline — Report pulizia

## Decisione tecnica

La 7.5 non aggiunge nuove funzioni operative. Serve come baseline pulita per ripartire dopo l'analisi Deep Research.

## Doppioni rimossi dal runtime

- `work-order-product-60.js`
- `revision-firmware-61.js`
- `work-order-product-60.html`
- `revision-firmware-61.html`
- `15-work-order-product.css`
- `16-revision-firmware.css`

I file sono archiviati in `docs/deprecated/runtime_7_5_removed_from_app/` e non sono più caricati da `index.html`.

## Menu consolidato

Nel menu Report & QC / KPI sono stati rimossi gli accessi duplicati:

- `Database / KPI`
- `Analisi Produzione`

L'accesso consolidato resta `Analytics Center`. Le pagine legacy KPI restano disponibili nel codice per compatibilità interna, ma non sono più accessi operatore principali.

## Contesto dati canonico

La 7.5 usa:

- `atmec75_canonical_context`
- `atmec74_unified_context`
- `atmec_current_work_order`
- `atmec_active_work_order`
- `atmec_selected_work_order_for_test`

Le chiavi `atmec60_*` restano mirror compatibile, non sorgente primaria.

## Backup / rollback

Prima del mirror 7.5 viene creato:

- `atmec75_cleanup_backup`

Il backup contiene le chiavi principali WO, contesto, stazione e compatibilità legacy.

## Validazione

Comando:

```bash
npm run cleanup:audit
```

Output atteso: `AT-MEC HM 7.5 cleanup audit: 100%`.

## Non modificato

- Test Engine
- Device Manager Safe
- Hardware / strumenti
- PL303
- Multimetro
- Ricette
- Repair Center
- Database main
