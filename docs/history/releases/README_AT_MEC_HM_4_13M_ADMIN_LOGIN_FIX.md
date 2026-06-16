# AT-MEC_HM_4.13M_ADMIN_LOGIN_FIX

Fix mirato su base 4.13L/4.13G stabile.

## Problema risolto
Se nel PC esisteva già `userData/auth/users.json` con utente `admin` corrotto, disabilitato, ruolo errato o password hash non valida, il bootstrap non lo riparava perché `ensureDefaultAdmin()` saltava l'utente già presente.

## Correzione
`ensureDefaultAdmin()` ora ripara sempre l'utente `admin`:
- username: `admin`
- password: `admin`
- ruolo: `Admin`
- enabled: `true`

L'utente `mirza` viene creato solo se manca, senza sovrascrivere dati esistenti.

## Credenziali recovery
- admin / admin
- mirza / mirza

Dopo accesso admin, cambiare password se necessario.
