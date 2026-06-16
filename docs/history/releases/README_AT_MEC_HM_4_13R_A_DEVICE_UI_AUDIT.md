# AT-MEC_HM_4.13R_A_DEVICE_UI_AUDIT

Baseline: AT-MEC_HM_4.13R_STABILE confermata funzionante.

Modifica eseguita in modo sicuro solo sul renderer/UI Device Manager.

## Cosa cambia
- Nuova pagina Device Manager con card moderne per ESP32, PL303, Multimetro, Scanner e altri device.
- KPI dispositivi: totale, online, simulati, offline/errori, esclusi.
- Badge stato: ONLINE, SIMULATO, OFFLINE, ERRORE, ESCLUSO.
- Test Gate visivo non invasivo.
- Log eventi locale della UI.
- Unificati gli entry point renderer: renderDeviceManagerPage413RA, renderDeviceManagerPage413G, renderDeviceManagerPage326 e renderDeviceManagerPage puntano alla stessa UI sicura.

## Cosa NON è stato toccato
- Login.
- Utenti.
- Ruoli.
- Permessi.
- Profilo collaboratore.
- Test Mode.
- Ricette.
- Report.
- Backend main/preload/UserManager.

## Nota
Questa è la fase A: solo UI/read-only. La fase successiva potrà collegare lo stato live e poi heartbeat/reconnect, una modifica per volta.
