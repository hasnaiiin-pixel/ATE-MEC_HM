# AT-MEC_HM_4.13O_OPERATOR_PROFILE

Baseline: AT-MEC_HM_4.13N_PERMISSIONS_DEFINITIVE confermata dall'utente come funzionante meglio per permessi/ruoli.

## Obiettivo
- Applicare permessi appena salvati senza logout/login.
- Semplificare pagina Utenti & Ruoli.
- Aggiungere codice operatore e foto profilo nella gestione utenti.
- Aggiungere pagina Profilo operatore con statistiche personali.

## Modifiche principali

### Permessi live
Dopo salvataggio ruolo, utente, eliminazione o abilita/disabilita:
- il renderer richiama `getCurrentUser()`;
- aggiorna `currentUser` e `window.atmecCurrentUser412K`;
- ricalcola menu, pulsanti e strumenti Layout;
- aggiorna pagina profilo se aperta.

Risultato: non serve più logout/login per vedere il permesso appena modificato.

### Utenti estesi
`UserManager` ora gestisce anche:
- `operatorCode`;
- `photoDataUrl`.

I campi sono opzionali e retrocompatibili: utenti vecchi senza codice/foto continuano a funzionare.

### Profilo operatore
Nuova pagina `Profilo operatore` con:
- foto/avatar;
- nome utente;
- codice operatore;
- ruolo/livello;
- lista permessi;
- KPI personali disponibili localmente: test registrati, PASS, FAIL, FPY, tempo medio.

### Test
Aggiunto:

```bash
node scripts/tests/test_operator_profile_413O.js
```

Verifiche eseguite:
- login admin;
- creazione ruolo;
- creazione utente con codice/foto;
- verifica credenziali nuovo utente;
- update utente con password vuota mantiene password;
- verify credentials non cambia sessione;
- permessi correnti aggiornati da `getCurrentUser()`.

## Note
`npm run build` può fallire in ambienti senza `node_modules/@types` installati. I file `dist/main/*.js` sono stati aggiornati e controllati con `node --check`.
