# AT-MEC_HM_4.18B_FACTORY_ENTERPRISE_FIX6

Fix mirato su identità postazione.

## Correzioni
- La configurazione salvata in Factory Enterprise viene propagata anche al DataProvider backend.
- I nuovi Test Report/PDF usano Station ID e Nome postazione salvati, non più DESKTOP/Postazione locale.
- Allineate chiavi storiche localStorage per topbar, report e moduli 4.12/4.13.
- Dopo login viene sincronizzata la configurazione postazione salvata verso il backend, così i report generati anche senza riaprire Factory Enterprise usano il nome corretto.
- Mantenuto il fix visibilità pagine del FIX5.

## Test consigliati
1. Login admin.
2. Factory Enterprise: salva Station ID e Nome postazione.
3. Cambia pagina: menu deve funzionare.
4. Avvia Test Mode e genera un report.
5. Il PDF/Test Report deve stampare Station ID/Nome configurati, non DESKTOP/Postazione locale.
