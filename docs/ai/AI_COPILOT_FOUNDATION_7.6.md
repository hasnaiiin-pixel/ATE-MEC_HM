# AI Copilot Foundation 7.6

## Scopo

Questa integrazione prepara AT-MEC HM all'AI senza creare doppioni. Il Copilot non sostituisce moduli esistenti: legge il contesto consolidato e produce insight o prompt controllati.

## Sorgenti lette

- `atmec75_canonical_context`
- `atmec74_unified_context`
- `atmec75_clean_baseline_report`
- `atmec76_runtime_validation_report`
- `atmec67b_mes_ready`
- `atmec65a_repair_tickets`
- `atmec65a_repair_actions`
- configurazione Factory / Station
- storico test locale se disponibile
- stato Device Manager se disponibile

## Cosa non fa

- Non crea nuova Traceability.
- Non crea nuovo Repair Center.
- Non crea nuovo Analytics Center.
- Non crea nuovo MES.
- Non crea nuova Factory dashboard.
- Non comanda strumenti.
- Non modifica utenti, ricette, WO o dati produzione.
- Non invia dati all'esterno se il provider non viene abilitato manualmente.

## Funzioni disponibili

- Analisi locale del contesto.
- AI readiness score.
- Insight anti-doppioni.
- Generazione prompt sicuro.
- Export contesto JSON.
- Configurazione provider AI futura in modalità sicura.

## Regola di sviluppo futuro

Ogni funzione AI futura deve appoggiarsi ai moduli esistenti e deve usare conferma operatore prima di qualsiasi azione scrivente.
