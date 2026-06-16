# AT-MEC_HM_4.13R_G_DEVICE_EMERGENCY_SAFE

Baseline: AT-MEC_HM_4.13R_F_DEVICE_CLEANUP_SAFE confermata funzionante.

Modifiche:
- aggiunto pannello Emergency OFF assistito nel Device Manager;
- pulsante Emergency OFF manuale;
- pulsanti separati Solo PL303 OFF e Solo ESP32 LOW;
- usa solo API già esistenti: safePl303Off e setDigitalOutput;
- log eventi locale nella pagina Device Manager;
- nessun blocco automatico Test Mode;
- nessuna modifica backend.

Aree NON toccate:
- login;
- utenti;
- ruoli;
- permessi;
- profilo collaboratore;
- Test Mode;
- ricette;
- report;
- main/preload/UserManager.

Test eseguiti:
- sintassi app.js OK;
- ZIP valido.
