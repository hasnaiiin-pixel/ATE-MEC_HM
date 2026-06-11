# AT-MEC_HM_3.984

Bugfix partendo da AT-MEC_HM_3.983.

## Obiettivo
Estendere il Layout Editor anche a riquadri, testi, log, card/pannelli e sezioni che prima non rispondevano bene a Porta avanti / Porta dietro o modifica dimensioni.

## Modifiche
- Elementi testuali e riquadri marcati come editabili in Layout ON.
- Porta avanti / Porta dietro più robusto per card, log, risultati test e pannelli.
- Z-index applicato anche considerando lo stacking context degli antenati.
- Nessun riordino DOM, quindi non deve spostare elementi a destra/sinistra.
- Test Mode, ricette, ESP32 non toccati.
