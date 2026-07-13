# AT-MEC_HM 10.1.9 - STABLE MEASUREMENT OPERATOR SPEED + AUTOSTART FIX

## Base
Partenza da 10.1.8 confermata più veloce.

## Obiettivo
Rendere la MISURA STABILIZZATA più chiara per operatore e più veloce tra uno step e l'altro.

## Modifiche
- Popup misura live semplificato.
- MISURA ATTESA al centro, molto grande.
- Misura live multimetro sotto, pulita.
- Fallback manuale nello stesso popup senza blur/sfocatura.
- Pulsante Riprova multimetro anche vicino all'inserimento manuale.
- Soppressi pannelli manuali legacy mentre il popup live è attivo, anche in FAIL.
- Popup chiude a fine test e non resta appeso.
- Avvio ricetta più rapido se gli strumenti richiesti sono già LIVE.
- Validazione strumenti più rapida usando cache LIVE condivisa.
- Aggiunto toggle opzionale: Auto-start prima misura.

## Auto-start prima misura
Compare vicino al pulsante START.
Se attivo, quando il primo step è MISURA STABILIZZATA e il valore live rientra nel range per circa 300 ms, viene avviato il test automaticamente.

## Non modificato
- Layout principale Test Mode.
- VEXON/MIRZA/MEC.
- WO/Commessa.
- Utenti.
- Driver.
- PL303 se non usato.
- Repair/Traceability/AI.
