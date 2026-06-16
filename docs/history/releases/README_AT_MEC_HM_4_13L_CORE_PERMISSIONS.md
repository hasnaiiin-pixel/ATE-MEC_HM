# AT-MEC HM 4.13L - Core Permissions Refactor

Base stabile: **AT-MEC_HM_4.13G**.

Questa revisione non deriva dalle patch 4.13H/4.13I: riparte dalla 4.13G e applica una bonifica mirata e strutturale del sistema utenti/ruoli/permessi.

## Correzioni principali

- Backend RBAC deny-by-default: prima del login nessun permesso è attivo.
- Login reale separato da verifica credenziali non distruttiva.
- Logout reale lato backend tramite IPC `user-logout`.
- Nuovo IPC `get-current-user` per riallineare UI e backend.
- Utenti/ruoli salvati in `userData/auth/users.json`, con migrazione iniziale dal vecchio `config/users.json`.
- Password legacy SHA-256 migrate automaticamente a `scrypt` al primo login valido.
- Modifica utente esistente con password vuota: mantiene la password precedente e aggiorna ruolo/displayName.
- Protezione ultimo utente/ruolo con `manage_users`.
- CRUD utenti/ruoli bloccato lato backend senza permesso `manage_users`.
- Visibilità UI utenti/ruoli stabilizzata: utenti nascosti se manca `manage_users`, niente errore `users.map is not a function`.
- Firma qualità e uscita Test Mode non cambiano più la sessione corrente.
- Branding usa `manage_branding`, non `manage_users`.
- Canali IPC sensibili hardware/ricette/sync/loghi protetti lato main process.
- Problema `N/D` top bar stabilizzato allineando 413B/413C e delegando a un solo updater.
- Vecchi README di release spostati in `docs/archive_release_notes` per pulizia root.

## Test eseguiti in ambiente locale

- `node --check src/renderer/js/app.js`
- `node --check dist/main/main.js`
- `node --check dist/main/core/UserManager.js`
- `node --check dist/main/preload.js`
- simulazione Node su UserManager:
  - prima del login `run_test = false`;
  - creazione ruolo prima del login negata;
  - login admin OK;
  - creazione ruolo OK;
  - creazione utente OK;
  - update utente con password vuota OK;
  - `verifyCredentials()` non cambia sessione corrente;
  - logout backend OK;
  - operatore non può creare admin.

## Nota build

Il comando `npm run build` nell'ambiente di analisi segnala mancanza delle dipendenze TypeScript/Node (`@types/node`, `electron`, ecc.), perché `node_modules` non è incluso nello ZIP. Nonostante questo, TypeScript ha emesso i file in `dist`, e i file JS finali risultano sintatticamente validi.

Su workstation reale eseguire:

```bat
npm install
npm run build
npm start
```

## Test manuale consigliato

1. Avvia app.
2. Prima del login controlla che non sia possibile creare utenti/ruoli.
3. Login `admin/admin`.
4. Crea ruolo `SoloTest` con solo `run_test`.
5. Crea utente `optest` con ruolo `SoloTest`.
6. Logout.
7. Login `optest`.
8. Verifica che menu utenti/ruoli non permetta modifiche e lista utenti sia nascosta.
9. Logout.
10. Login admin, cambia ruolo a `optest` senza inserire password.
11. Logout/login `optest` con vecchia password: deve funzionare e applicare nuovo ruolo.
12. Verifica Test Mode exit/firma qualità: non devono cambiare l'utente corrente nella top bar.
13. Imposta Station ID e ricarica app: non deve tornare `N/D` se lo Station ID è salvato.
