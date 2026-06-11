# ATE_MEC_2.0 - Login obbligatorio e layout pulito

Modifiche applicate:

- Login obbligatorio all'avvio app tramite popup full-screen.
- Finché non viene effettuato login, topbar e interfaccia principale restano nascoste.
- Rimossa la sezione login dalla barra sinistra.
- Rimossa la gestione ricette/step dalla barra sinistra: la modifica ricette resta nella pagina grande `Ricette & Step`.
- Aggiunta pagina dedicata `Utenti e ruoli` con creazione ruoli e credenziali.
- Barra sinistra semplificata: DUT, alimentazione e scorciatoie pagine principali.
- Riordino step: dopo su/giù, duplica o elimina, gli step vengono rinumerati in ordine 1,2,3...
- Stato grafico step: `DA FARE`, `IN ESECUZIONE`, `PASS`, `FAIL`.
- Pulsanti TEST / IN ESECUZIONE-PAUSA / STOP resi più moderni con effetto 3D.
- Step log accorciato per occupare meno spazio in esecuzione.

Nota: questa patch lavora sulla UI/HMI. Il firmware ESP32 JSON e il backend hardware della versione stabile ATE_MEC_2.0 non sono stati modificati.
