# AT-MEC_HM_4.24A_FIX1_REPOSITORY_PAGE_FIX

Fix mirato per pagina vuota Repository & Distribution.

## Causa
La pagina `repository-center-424a-tab` era caricata correttamente, ma il partial aveva `style="display:none"`. La funzione `showTab()` aggiungeva solo la classe `active`; in alcuni casi l'inline style manteneva la pagina nascosta.

## Fix
- rimosso `style="display:none"` dal partial Repository Center
- aggiunta regola CSS `display:block !important` per `#repository-center-424a-tab.active`
- nessuna modifica a Test Mode, Hardware, Backup, Print, Audio o Label runtime

## Test da fare
1. Aprire app
2. Login
3. Aprire menu `Repository & Distribution`
4. Verificare che compaiano:
   - KPI Elementi / Published / Draft / Archived
   - tab Ricette, Firmware, Label, Audio, Layout, Audit
   - editor Nome/Revisione/Autore/Stato
   - tabella repository
5. Premere `+ Demo dati`
6. Verificare che la tabella si popoli
