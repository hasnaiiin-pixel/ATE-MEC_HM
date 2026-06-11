# AT-MEC_HM_2.23

Modifiche principali:
- Fix definitivo stato RUNNING dopo FAIL: il motore torna READY anche se lo step fallisce.
- Durante il popup FAIL lo stato non resta più RUNNING ma si ferma su PAUSED/FAULT UI.
- Step manuale: aggiunti pulsanti PASS manuale e FAIL manuale oltre alla misura/acquisizione.
- Test Mode più compatta: step attuale a sinistra, sequenza a destra, avanzamento in basso.
- Test scheda campione opzionale all'inizio con wizard preliminare step-by-step.
- Wizard preliminare strumenti: conferma/ricollega per gli strumenti richiesti dalla ricetta.
- Popup sempre in primo piano per FAIL, istruzioni e conferme.
