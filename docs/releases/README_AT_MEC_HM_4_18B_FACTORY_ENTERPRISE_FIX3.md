# AT-MEC_HM_4.18B_FACTORY_ENTERPRISE_FIX3

Fix definitivo layout Factory Enterprise:
- Factory Enterprise isolata dalle classi globali `.recipe-big-card`, `.dashboard-card`, `.modern-panel`.
- Rimosso uso di `recipe-big-card` nella partial Factory per evitare transform/scale globali.
- Griglia configurazione postazione corretta: label e input non si sovrappongono.
- KPI Factory separati con classi dedicate e dimensioni stabili.
- Login: logo grande MIRZA limitato entro la card, senza uscire a destra.
- Nessuna modifica a login logico, utenti, ruoli, permessi, Device Manager, Test Mode o backend.

Test consigliato:
1. Login: verificare logo MIRZA centrato e contenuto.
2. Produzione -> Factory Enterprise.
3. Verificare Configurazione postazione: Station ID, Nome postazione, Reparto, Sito, Server, Modalità Sync tutti visibili.
4. Premere Aggiorna Enterprise.
5. Verificare che KPI, Monitor postazione, Device Monitor, Sync Manager e Storico non si sovrappongano.
