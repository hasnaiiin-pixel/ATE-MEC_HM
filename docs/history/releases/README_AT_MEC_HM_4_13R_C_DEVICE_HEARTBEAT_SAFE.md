# AT-MEC_HM_4.13R_C_DEVICE_HEARTBEAT_SAFE

Base: AT-MEC_HM_4.13R_B_DEVICE_STATUS_LIVE_SAFE confermata stabile.

Modifiche sicure:
- aggiunto watchdog heartbeat solo UI nel Device Manager;
- soglie visuali: warning 15s, offline 45s;
- pannello riepilogo heartbeat;
- badge HEARTBEAT LENTO / HEARTBEAT KO quando il device risulta online ma il dato heartbeat è vecchio;
- nessuna modifica a backend, login, utenti, ruoli, permessi, profilo, Test Mode, ricette, report.

Verifiche:
- node --check app.js OK;
- ZIP valido.
