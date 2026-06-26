# AT-MEC_HM_6.5A_FIX2_TAB_NAVIGATION_RECOVERY

Fix mirato alla navigazione tab dopo Repair Center.

## Problema corretto
Dopo 6.5A_FIX1 alcune pagine standard come Ricette, Multimetro e altre risultavano vuote perché alcuni moduli impostavano `style.display = none` inline su tutte le `.tab-content`. La funzione globale `showTab()` aggiungeva solo la classe `active`, ma non rimuoveva il display inline.

## Correzioni
- `showTab()` ora ripulisce `display:none/block/flex` inline e lascia gestire la visibilità al CSS globale.
- `Production Execution` e `Repair Center` non forzano più display inline permanente sulle altre pagine.
- Repair Center resta visibile solo nella sua tab attiva.
- Nessuna modifica a Test Mode, Ricette runtime, Hardware, Print, Audio, Repository o Backup.

## Test consigliato
1. Aprire Dashboard.
2. Aprire Ricette.
3. Aprire Hardware/Multimetro.
4. Aprire Report & QC / KPI → Repair Center.
5. Tornare a Ricette e Multimetro: non devono essere vuote.
