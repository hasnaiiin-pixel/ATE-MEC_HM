# AT-MEC_HM_4.13R_M_DEVICE_DIAGNOSTIC_CENTER_SAFE

Baseline: AT-MEC_HM_4.13R_L_DEVICE_CONFIG_CENTER_SAFE.

Modifiche incluse:
- aggiunto Centro diagnostica dispositivi nel Device Manager;
- test manuale ESP32 tramite getEsp32Info;
- test PL303 tramite query stato CH1 e OFF sicuro manuale;
- test Multimetro tramite query SCPI/VISA;
- test Scanner tramite scan COM;
- log diagnostica locale persistente;
- nessuna modifica a backend, login, utenti, ruoli, permessi, profilo, Test Mode, ricette o report.

Test consigliati:
1. Login admin.
2. Aprire Device Manager.
3. Verificare pannello Centro diagnostica dispositivi.
4. Premere Test ESP32, Test stato PL303, Test DMM, Test Scanner.
5. Verificare che Test Mode funzioni come 4.13R_L.
