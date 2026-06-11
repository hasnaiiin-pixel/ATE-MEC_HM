# ATE_MEC_2.0 - Fix stato test e gestione utenti Admin

Modifiche applicate:

- Fix stato UI dopo FAIL/RECOVERY/IDLE/READY: il pulsante START torna abilitato e il riquadro step corrente viene resettato a "Nessun test in esecuzione".
- Fix log `Test completato: FAIL — undefined`: ora mostra `N/D` se il seriale/report non è disponibile.
- Pagina Utenti/Ruoli migliorata:
  - lista utenti selezionabile;
  - crea/aggiorna utente;
  - elimina utente;
  - abilita/disabilita utente;
  - protezione per non eliminare/disabilitare l'ultimo Admin attivo.
- Se l'utente loggato non è Admin o livello >=100:
  - può vedere utenti e ruoli;
  - non può modificare campi, ruoli, utenti o permessi.
- API backend aggiunte:
  - `delete-user`
  - `set-user-enabled`
