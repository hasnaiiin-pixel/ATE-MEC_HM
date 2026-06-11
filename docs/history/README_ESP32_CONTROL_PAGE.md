# AT-MEC HM 1.0 — Pagina ESP32 Control

Questa versione aggiunge una pagina dedicata **ESP32 Control** per gestire la scheda ESP32-S3 senza passare dalle ricette.

## Funzioni aggiunte

- Nuova tab **ESP32 Control**.
- Scansione periferiche COM direttamente nella pagina ESP32.
- Selezione porta ESP32 senza scrivere manualmente `COMx`.
- Connessione ESP32 da pagina dedicata mantenendo `modbus_serial`.
- Lettura info ESP32.
- Griglia grafica delle uscite digitali DO.
- Pulsanti singoli **HIGH** e **LOW** per ogni uscita.
- Lettura feedback DO dopo il comando.
- Griglia ingressi DI e AI in sola lettura.
- Modalità **Live I/O** con polling non sovrapposto.
- Pulsante emergenza **Tutte DO LOW**.
- Log separato ESP32 per capire quale comando fallisce.

## Stabilità UI

La pagina usa le protezioni già introdotte:

- `guardedUi()` per timeout sulle operazioni.
- Nessun polling sovrapposto.
- Live disattivabile.
- Aggiornamento chip grafici senza ricreare tutta la UI ad ogni lettura.

## Uso consigliato

1. Apri **ESP32 Control**.
2. Premi **Periferiche**.
3. Scegli la porta della ESP32.
4. Premi **Connetti**.
5. Premi **Info** per verificare firmware/stato.
6. Usa HIGH/LOW sulle DO o abilita **Live I/O** per vedere ingressi e feedback.

