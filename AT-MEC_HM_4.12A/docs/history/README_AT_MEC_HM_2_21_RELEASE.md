# AT-MEC_HM_2.21

Release mirata su stabilità avvio test, layout Test Mode e gestione strumenti/ricette.

## Modifiche principali
- STOP TEST spostato sotto PAUSA/RIPRENDI in Test Mode.
- Riga ricetta compatta: Ricetta da eseguire + pulsanti Ricette/Seleziona sulla stessa riga.
- Riga dedicata per Commessa/Lotto e Serial scheda.
- Se il flag SN obbligatorio è disattivato, il backend non riceve più NOSERIAL e non attiva più il controllo duplicato PASS/FAIL.
- Popup relazione riparazione sostituito con modale custom in primo piano, compatibile Electron sandbox, senza `prompt()`.
- Popup Manuale/Fail/Wizard portati sempre in primo piano con z-index alto.
- Dopo FAIL/annullo ritest la UI torna pronta tramite reset controllato.
- Test Mode: step attuale a sinistra e sequenza step a destra.
- Pagina Alimentatore PL303: rimossa sezione Scanner QR/Serial Number duplicata.
- Flash: aggiunti J-LINK LITE, ST-LINK, JTAG, SWD, SPI, I2C.
- Ricette: eliminazione ricetta per Admin/Sviluppatore/Tecnico.

## Nota build
La sintassi JS renderer e dist main/preload è stata verificata con `node --check`. In questo ambiente non sono installati `node_modules`, quindi `tsc` segnala dipendenze mancanti.
