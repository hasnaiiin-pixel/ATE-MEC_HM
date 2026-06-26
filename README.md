# AT-MEC_HM_6.7O_TEST_MODE_SWITCH_ALIGNMENT_FIX

Base stabile: AT-MEC_HM_6.7H_TEST_MODE_TOPBAR_WO_STATS.

Modifica mirata Test Mode operatore + WO/Commessa:

- Action Panel misura manuale ridotto alle sole informazioni operative.
- Pulsante `Riprova multimetro` rinominato in `Riprova`.
- Pulsante `Usa misura manuale` rinominato in `Misura manuale`.
- Popup manuale con step, azione operatore, input misura e grafico tolleranza.
- Valutazione misura: verde dentro parametro, rosso fuori range.
- Grafico tolleranza modernizzato.
- Barra Test Mode ordinata: WO -> Commessa -> S/N -> Test campione.
- Flag `Usa WO/Commessa`: ON blocca Commessa e prende WO; OFF abilita Commessa manuale.
- Popup WO con ricerca per cliente, commessa, codice scheda, prodotto o ricetta.
- Startup Wizard produzione appare solo con flag `Test campione` attivo.
- Log step Test Mode allineato in colonne: numero, step, tipo/azione, esito.
- Live measure non mostra piu `[object Object] V/A`.
- Pannello live measure occupa tutta la STEP CARD.
- Popup F1 con campo S/N grande, evidente e pronto per INVIO.
- Popup statistiche WO con KPI, grafico donut, barre, tempo medio, tempo impiegato, tempo totale stimato e top fail.
- Barra alta Test Mode ridisposta senza sovrapposizioni.
- Flag WO e Test campione ridimensionati come i flag label printer.
- Commessa ridotta a larghezza circa 10 cifre.
- S/N e Test campione compatti con flag a destra.
- KPI WO trasformati in mini riquadri colorati TOT/PASS/FAIL/RES.
- Nome ricetta grande nascosto per evitare doppione.
- Cliente/Ricetta/Rev bloccati quando `Usa WO/Commessa` e attivo.
- Popup F1: Commessa piccola sopra, S/N grande sotto.
- Nessuna modifica a Test Engine, Device Manager, PL303, multimetro, ricette, Repair Center o database.

Base 6.7D mantenuta:

Correzione mirata reale su Start Engine e validazione hardware:

- Device Manager / PL303 / porte COM non modificati.
- `runPreTestSampleWizard` esportato correttamente su `window`.
- `startTest()` non si blocca più se il wizard scheda campione non è disponibile.
- se “Abilita all’inizio produzione” è OFF, il wizard scheda campione viene saltato.
- validazione hardware normalizza sempre `latestHardwareStatuses` come array.
- Test Mode legge anche lo stato condiviso salvato dal Device Manager SAFE (`atmec67c_device_status_shared`).
- riconoscimento alias PL303 / AimTTi / TTI / Alimentatore.

Test consigliato:
1. Device Manager → PL303 ONLINE e comando tensione OK.
2. Test Mode → seleziona WO/ricetta.
3. START/F1 → inserisci S/N → INVIO.
4. Il test deve passare a RUNNING e non fermarsi su “alimentatore non trovato”.
