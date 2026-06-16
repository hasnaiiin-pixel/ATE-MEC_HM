# AT-MEC_HM_4.13N_PERMISSIONS_DEFINITIVE

Release costruita su base 4.13M/4.13G stabile, applicando il report di audit sui permessi.

## Fix principali

- Contratto permessi unificato: `manage_archive` legacy viene migrato e accettato come alias di `manage_data`.
- Admin riparato e garantito con permessi core completi: `admin / admin`.
- Developer/Sviluppatore non è più root automatico lato UI: vede solo funzioni presenti nei suoi permessi.
- Editor ruoli migliorato: selettore ruolo esistente + caricamento permessi/livello nel form.
- Creazione/aggiornamento ruolo salva permessi canonici.
- Creazione/aggiornamento utente mantiene password se campo password vuoto per utente esistente.
- IPC di lettura sensibili protette: report, storico seriali, KPI, archivio/sync, communication log.
- Fix visibilità Archivio Dati / Sync coerente con backend.
- Test automatico aggiunto: `scripts/tests/test_permissions_contract_413N.js`.

## Credenziali default

- `admin / admin`
- `mirza / mirza`

## Test eseguiti in ambiente di analisi

```bash
node --check dist/main/core/UserManager.js
node --check dist/main/main.js
node --check src/renderer/js/app.js
node scripts/tests/test_user_manager_413L.js
node scripts/tests/test_permissions_contract_413N.js
```

Tutti i test Node eseguiti sono PASS.

## Nota importante

Se sul PC esiste già un vecchio `userData/auth/users.json`, questa versione lo rilegge e normalizza i permessi legacy. `manage_archive` non deve più essere usato nella UI: viene convertito in `manage_data`.
