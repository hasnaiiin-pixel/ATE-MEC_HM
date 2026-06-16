# AT-MEC_HM_4.18B_FACTORY_ENTERPRISE_FIX1

Base: AT-MEC_HM_4.17B_DATABASE_ENTERPRISE_STABILE

Fix e integrazione:
- aggiunta pagina Factory Enterprise reale;
- aggiunta funzione globale `loadFactoryEnterprise418B()`;
- corretto errore F12 `ReferenceError: loadFactoryEnterprise418B is not defined`;
- aggiunta configurazione postazione;
- aggiunta dashboard KPI Factory;
- aggiunto monitor dispositivi e Sync Queue;
- aggiunto Factory Health Score;
- aggiornate versioni interne a 4.18B / 4.18.2;
- mantenuta compatibilità con login, utenti, ruoli, permessi, Device Manager, Recipe Engine e Test Mode.

Test consigliato:
1. `npm install`
2. `npm start`
3. Login admin
4. Produzione → Factory Enterprise
5. Click su `Aggiorna Enterprise`
6. Verifica che non compaia più l'errore `loadFactoryEnterprise418B is not defined`.
