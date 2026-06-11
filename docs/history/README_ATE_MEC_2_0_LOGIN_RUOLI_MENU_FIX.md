# ATE_MEC_2.0 — Login, ruoli e menu principale

## Modifiche incluse

- Corretto CSP immagini/logo:
  - `img-src 'self' data: blob: file:`
  - i loghi locali non vengono più bloccati da Content Security Policy.

- Login obbligatorio semplificato:
  - login con solo `username + password`;
  - il ruolo non si sceglie più nella finestra login;
  - ruolo e livello accesso vengono letti dalle credenziali salvate.

- Gestione utenti/ruoli aggiornata:
  - creazione ruolo con nome ruolo, livello accesso e permessi;
  - creazione utente con username, password, nome visualizzato e ruolo assegnato;
  - livelli predefiniti:
    - 10 Operatore
    - 30 Tecnico
    - 60 Engineer
    - 80 Sviluppatore
    - 100 Admin

- Menu riorganizzato:
  - Audit, ESP32 Control, Utenti/Ruoli e Flash sono stati spostati nel menu principale laterale;
  - la barra superiore resta più pulita: Esecuzione, Multimetro, Ricette & Step.

## Credenziali iniziali

Se non esiste ancora un database utenti, viene creato automaticamente:

- Username: `admin`
- Password: `admin`
- Ruolo: `Admin`
- Livello: `100`

Consiglio: dopo il primo accesso crea un nuovo admin personale e cambia/aggiorna le credenziali operative.
