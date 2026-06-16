# AT-MEC_HM_4.18B_FACTORY_ENTERPRISE_FIX5

Fix navigazione dopo Factory Enterprise.

## Correzione
- Rimosso `display:block!important` globale da `#factory-core-tab`.
- Factory Enterprise resta visibile solo quando il tab ha classe `active`.
- Salvataggio nome postazione/header mantenuto dal FIX4.
- Nessuna modifica a login, utenti, ruoli, permessi, Device Manager, Test Mode o backend.

## Test
1. Apri Factory Enterprise.
2. Salva Station ID/Nome postazione e verifica topbar.
3. Clicca altri menu: Dashboard/Test Mode/Device Manager/Ricette/Database.
4. Verifica che la pagina cambi correttamente.
