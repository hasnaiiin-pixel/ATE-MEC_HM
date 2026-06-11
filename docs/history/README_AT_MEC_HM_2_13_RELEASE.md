# AT-MEC_HM_2.13

Release focalizzata sui 5 punti evolutivi richiesti e su un database locale semplice.

## 1. Database locale semplice
- Nuovo file locale `database/ate_mec_local_db.json`.
- Nessun server richiesto.
- Salvataggio atomico con file temporaneo.
- Contiene ricette versionate, test report, storico riparazioni e statistiche.
- Esportazione database da HMI.

## 2. Versioning ricette
- Ogni salvataggio crea una nuova revisione.
- Possibilità di caricare una versione precedente dalla pagina Ricette & Step.
- Le ricette restano anche esportabili/importabili come JSON.

## 3. Storico seriali e riparazioni
- Lo storico test resta legato a Serial Number + Commessa/Lotto.
- Le riparazioni vengono archiviate nel database locale quando presenti nei report.
- I filtri Test Report continuano a lavorare su commessa, seriale, data, operatore, esito e ricetta.

## 4. Dashboard KPI produzione
- Nuova pagina Database/KPI.
- KPI: test totali, PASS, FAIL, Yield, riparazioni, ricette e revisioni.
- KPI filtrabili per commessa, seriale, operatore, ricetta, esito e data.
- Riepilogo per ricetta.

## 5. Wizard ricette più visuale
- Aggiunta area visuale di flusso ricetta START / I/O / MISURA / MANUALE / REPORT.
- Mantenuta logica smart dei campi: ogni step mostra solo le opzioni utili.
- Step DO resta separato da misure analogiche/multimetro.

## Compatibilità
- Firmware ESP32 JSON e `modbus_serial` logico invariati.
- Mappatura diretta GPIO invariata.
- Login, loghi e report mantenuti.
