# AT-MEC_HM_4.13R_F_DEVICE_CLEANUP_SAFE

Base: AT-MEC_HM_4.13R_E_DEVICE_TEST_GATE_SAFE confermata funzionante.

Modifiche sicure:
- rimosso/filtrato il riferimento a assets/customers/COBO.png non presente nel pacchetto;
- pulizia automatica dei vecchi riferimenti COBO in localStorage clienti;
- ridotto il polling pesante in layout-editor.js alla riga del vecchio setInterval 700ms;
- applySaved del Layout Editor resta eseguito all'avvio, ma non viene più richiamato continuamente;
- nessuna modifica a login, utenti, ruoli, permessi, profilo, Test Mode, ricette, report o backend.

Verifiche:
- node --check src/renderer/js/app.js OK
- node --check src/renderer/js/layout-editor.js OK
- ZIP valido
