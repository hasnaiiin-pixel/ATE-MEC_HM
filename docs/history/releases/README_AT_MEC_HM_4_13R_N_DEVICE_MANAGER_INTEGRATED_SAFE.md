# AT-MEC_HM_4.13R_N_DEVICE_MANAGER_INTEGRATED_SAFE

Base: AT-MEC_HM_4.13R_M_DEVICE_DIAGNOSTIC_CENTER_SAFE confermata funzionante.

## Obiettivo
Integrare direttamente la rifinitura diagnostica nel passo successivo Device Manager, evitando una micro-versione separata.

## Modifiche
- Diagnostica ESP32 formattata in modo leggibile, non più JSON grezzo.
- Diagnostica PL303 formattata con stato, canale, tensione/corrente/output quando disponibili.
- Diagnostica Multimetro formattata con comando SCPI e risposta principale.
- Dettaglio tecnico JSON resta disponibile solo dentro sezione espandibile "Dettaglio tecnico".
- Aggiunto pannello "Mapping dispositivi ricetta" in modalità SAFE.
- Il mapping mostra i dispositivi richiesti dalla ricetta corrente quando rilevabili.
- Possibilità di segnare localmente Auto / Obbligatorio / Opzionale / Escluso-manuale.

## SAFE
Non sono stati toccati:
- login
- utenti
- ruoli
- permessi
- Test Mode engine
- ricette
- report
- backend

## Test consigliati
1. Login admin.
2. Device Manager.
3. Centro diagnostica: Test ESP32.
4. Verificare output leggibile invece del JSON grezzo.
5. Controllare pannello Mapping dispositivi ricetta.
6. Avviare Test Mode e verificare comportamento invariato rispetto alla 4.13R_M.
