# AT-MEC_HM_2.20

Release correttiva su AT-MEC_HM_2.19.

## Modifiche
- Aggiunto flag Serial Number obbligatorio/non obbligatorio in Dashboard e Test Mode.
- Se SN obbligatorio è attivo, il test non parte senza seriale.
- Se SN obbligatorio è disattivato, il test usa NOSERIAL e non blocca schede senza SN.
- Aggiunto STOP TEST rapido in Dashboard e Test Mode.
- STOP TEST sblocca RUNNING/PAUSED/FAULT, chiude popup manuali/fail e riporta UI in READY.
- Backend stop-test forza reset controllato del motore ricetta per evitare stato test in esecuzione bloccato dopo FAIL.
- Migliorata gestione system-fault lato UI: start riabilitato e stop disponibile.
