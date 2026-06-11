# AT-MEC_HM_2.12

Release con miglioramenti richiesti per produzione e gestione ricette.

## Ricette / Step
- Wizard step più selettivo: se lo step è `DigitalOutputSet` mostra solo le opzioni utili per l'uscita.
- Le misure analogiche e misure varie (`AnalogInputMeasurement`, tensione, corrente, resistenza, frequenza) sono orientate al multimetro digitale SCPI/Keysight, non a valori casuali/mock ESP32.
- ESP32 resta dedicata a I/O digitali, feedback e comandi GPIO.

## Produzione
- Aggiunto Numero Lotto / Commessa persistente per produzione intera.
- Serial Number DUT resta specifico per ogni scheda e può essere inserito manualmente o via QR code.
- Controllo storico su Serial Number + Commessa:
  - se già PASS, chiede conferma per proseguire;
  - se già FAIL, richiede relazione di riparazione prima del ritest.

## Test Report
- Rinominato Audit in Test Report.
- Filtri per commessa, data, serial number, operatore, PASS/FAIL e testo libero.
- Report PDF arricchito con commessa/lotto e relazione riparazione.

## Branding
- Ogni logo può avere modalità sfondo indipendente: trasparente o bianco.
- Mantiene supporto PNG/JPG/WEBP/GIF per loghi HMI/login.
