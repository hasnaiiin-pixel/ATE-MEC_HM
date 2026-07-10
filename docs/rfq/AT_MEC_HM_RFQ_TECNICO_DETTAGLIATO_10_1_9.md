# RFQ tecnico dettagliato — AT-MEC HM / VEXON 10.1.9

**Versione analizzata:** AT-MEC_HM_10.1.9_STABLE_MEASUREMENT_OPERATOR_SPEED_AUTOSTART_FIX  
**Data report:** 2026-07-02  
**Scopo:** descrivere in modo tecnico e completo quanto già sviluppato, lo stato dell'applicazione, i moduli implementati, le integrazioni presenti e il perimetro da usare per una richiesta RFQ.

## 1. Sintesi esecutiva

AT-MEC HM / VEXON è una piattaforma desktop industriale per collaudo PCB, gestione produzione, tracciabilità, reportistica, strumenti USB/seriali/SCPI, ricette di test, riparazione e predisposizione MES.

La versione 10.1.9 consolida soprattutto il flusso operatore in Test Mode con MISURA STABILIZZATA, lettura live multimetro/Keysight, fallback manuale, retry misura e auto-start prima misura. La piattaforma include già un backbone enterprise con moduli dati, report, repair, label, analytics, repository, backup, AI read-only e gestione hardware.

## 2. Stato attuale della versione 10.1.9

- Package principale: `vexon-industrial-test-platform-10-1-9`.
- Runtime validate 10.1.9: esito 100% OK.
- Startup doctor 10.1.9: OK, con avviso previsto se `node_modules/electron` non è incluso nel pacchetto.
- Cleanup audit 7.5: 100% OK.
- Note di coerenza: alcuni riferimenti secondari risultano ancora 10.1.3 / 10.1.8 e vanno allineati nella prossima 10.1.10 senza toccare il motore test.

## 3. Architettura tecnica

- Frontend desktop: Electron renderer, HTML/CSS/JavaScript modulare.
- Backend: Node.js + TypeScript.
- Core backend: `AuditSystem`, `DataProvider`, `DiagnosticEngine`, `EnterpriseDatabase`, `EventBus`, `IotServer`, `LocalDatabase`, `PdfGenerator`, `StateMachine`, `TestResult`, `UserManager`.
- HAL / strumenti: `CalibrationManager`, `DeviceManager`, `Esp32SerialProvider`, `FlashManager`.
- Runtime: `RecipeEngine`.
- Database: JSON legacy, SQLite enterprise, sync queue, predisposizione PostgreSQL/MES.
- Distribuzione: BAT di avvio/installazione, electron-builder NSIS/portable, script driver e startup doctor.
## 4. Mappa evoluzione e tempi RFQ

| Serie | Contenuto | Record | Giorni min RFQ | Giorni max RFQ | Note |
|---|---:|---:|---:|---:|---|
| 1 | Fondazione HMI, ricette, I/O base, ESP32, log, ruoli | 12 | 15 | 25 | Base funzionale e primi fix runtime/hardware. |
| 2 | Test Mode, PL303, Keysight, ruoli operativi, report, filtri | 28 | 25 | 45 | Collaudo operativo, test full-screen, reportistica e strumenti. |
| 3 | Stabilizzazione, layout editor, packaging, traceability evoluta | 38 | 30 | 55 | Pulizia, installazione Windows, layout e robustezza UI. |
| 4 | Enterprise suite: factory, analytics, repository, label, print, audio | 92 | 70 | 120 | Grande espansione funzionale e architetturale. |
| 6 | Produzione, MES ready, SQLite enterprise, Repair Center | 40 | 45 | 80 | Backbone produzione e qualità con tracciabilità/riparazione. |
| 7 | Enterprise backbone, data contract, clean baseline | 17 | 20 | 40 | Hardening e contratto dati enterprise. |
| 8 | AI ready e provider approval iniziale | 2 | 8 | 16 | Preparazione AI in sicurezza. |
| 9 | AI Factory, action queue, supervisor, live chat, hardening | 13 | 30 | 60 | AI operational layer read-only e supervisione produzione. |
| 10 | VEXON, driver 10.0, StableMeasurement, Keysight live | 13 | 25 | 45 | Misura stabilizzata, popup operatore e auto-start. |
| Supporto | Documenti, driver, validazioni e note tecniche | 3 | 2 | 5 | Materiale di supporto e validazione. |
| **Totale** | **Stima normalizzata progetto** | **258** | **270** | **491** | Range indicativo per RFQ tecnico, non consuntivo contabile. |

## 5. Funzioni implementate per modulo

### Test Mode / Collaudo automatico
**Funzioni:** Esecuzione ricette, START/STOP, stato READY/RUNNING/FAIL/PASS, debug step-by-step, emergenza, log operatore, full-screen operativo, auto-start prima misura.

**Tecnologie / integrazioni:** Electron renderer + RecipeEngine + StateMachine + IPC backend.

**Stato:** Implementato e stabilizzato fino a 10.1.9.

**Valore RFQ:** Modulo core: riferimento principale per RFQ di collaudo industriale.

### StableMeasurement / Misura stabilizzata
**Funzioni:** Lettura live da multimetro, range min/max, stabilizzazione configurabile, auto-pass, retry misura, fallback manuale nello stesso popup.

**Tecnologie / integrazioni:** Keysight/VISA bridge, DeviceManager, step events, UI action-live-measurement.

**Stato:** Implementato in 10.1.x, migliorato in 10.1.9.

**Valore RFQ:** Riduce errori operatore e tempo ciclo.

### Recipe Editor / Runtime
**Funzioni:** Creazione step, abilita/disabilita step, fail stop/continue, variabili, condizioni, blocchi, retry, timeout, preview e gestione step.

**Tecnologie / integrazioni:** JSON recipes, RecipeEngine TypeScript, IPC save/load.

**Stato:** Implementato con evoluzioni da 1.x a 10.x.

**Valore RFQ:** Base per ricette multi-prodotto e scalabilità fixture.

### Hardware / Device Manager
**Funzioni:** Gestione ESP32, PL303, Keysight, serial terminal, driver assistiti, stato LIVE/OFFLINE, reconnect, emergency safe.

**Tecnologie / integrazioni:** Seriale/USB, SCPI, Python VISA bridge, driver check.

**Stato:** Implementato; 10.1.9 velocizza validazione se strumenti già LIVE.

**Valore RFQ:** Punto chiave per integrazione strumenti in produzione.

### Produzione / MES Ready / WO
**Funzioni:** Work Order, Product Master, firmware/revisioni, commesse attive, quantità, ricette associate, base lettura MES.

**Tecnologie / integrazioni:** SQLite/JSON local-first; predisposizione SQL read-only MES.

**Stato:** Implementato come base MES-ready; integrazione MES reale da completare con credenziali cliente.

**Valore RFQ:** Permette RFQ per collegamento sistema fabbrica.

### Traceability / Storico / Scheda Unità
**Funzioni:** Storico seriali, scheda unità, filtri, genealogia test, esiti, operatori, firmware, lotto, report unità.

**Tecnologie / integrazioni:** Local DB / SQLite, report PDF/HTML, audit trail.

**Stato:** Implementato.

**Valore RFQ:** Necessario per qualità, audit e rintracciabilità.

### Repair Center
**Funzioni:** Ticket FAIL, interventi multipli, allegati, retest, dossier tecnico, timeline eventi.

**Tecnologie / integrazioni:** Repair module JS/CSS, database locale, report dossier.

**Stato:** Implementato nelle serie 6.x con miglioramenti successivi.

**Valore RFQ:** Modulo qualità post-collaudo e gestione non conformità.

### Report PDF / QC
**Funzioni:** Report test, report lotto, firma operatore, loghi MEC/MIRZA, filtri, QR/seriali, export.

**Tecnologie / integrazioni:** PdfGenerator, renderer, assets.

**Stato:** Implementato.

**Valore RFQ:** Output cliente e documento ufficiale collaudo.

### Label / Print Engine
**Funzioni:** Designer etichette, QR, logo, seriale, commessa, layout stampa, print preview.

**Tecnologie / integrazioni:** Label Manager, Print Engine, asset/logo manager.

**Stato:** Implementato in serie 4.x.

**Valore RFQ:** Utile per serializzazione e packaging produzione.

### Analytics / KPI
**Funzioni:** OEE/FPY/throughput, fail rate, analisi produzione, filtri, dashboard.

**Tecnologie / integrazioni:** ChartJS/UI modules, data provider.

**Stato:** Implementato.

**Valore RFQ:** Supporta decisioni qualità/produzione.

### SQLite / Data Provider / Sync
**Funzioni:** Local-first, sync queue, audit, migrazioni, backup, stato DB, database enterprise.

**Tecnologie / integrazioni:** SQLite schema, DataProvider, Sync Manager, scripts db:*.

**Stato:** Implementato e validato in 6.x/7.x.

**Valore RFQ:** Base per deployment offline e sincronizzazione futura.

### AI Copilot / AI Factory
**Funzioni:** AI read-only, provider approval, action queue, supervisor, live chat, hardening.

**Tecnologie / integrazioni:** Moduli UI AI, policy read-only, approval queue.

**Stato:** Implementato come layer assistivo; non deve comandare hardware senza approvazione.

**Valore RFQ:** Opzione RFQ avanzata, da quotare separatamente.

### Backup / Repository / Distribution
**Funzioni:** Backup/restore, clone export/import, repository center, distribution, installer, BAT start/install.

**Tecnologie / integrazioni:** Scripts Node/PowerShell, electron-builder.

**Stato:** Implementato.

**Valore RFQ:** Serve per installazione e manutenzione multi-stazione.

### Branding VEXON / MIRZA / MEC
**Funzioni:** Nome VEXON, loghi, icone, tema industriale, asset applicativi.

**Tecnologie / integrazioni:** CSS modules, assets, app_settings.

**Stato:** Implementato; alcune version inconsistency da sistemare.

**Valore RFQ:** Pronto per presentazione commerciale/cliente.

## 6. Flusso operativo principale

1. L'operatore seleziona o riceve ricetta/commessa.
2. Il sistema verifica stato strumenti e disponibilità hardware.
3. In Test Mode viene avviato il test.
4. Ogni step viene eseguito dal RecipeEngine con log dettagliato.
5. Per le misure stabilizzate, il popup mostra valore atteso, valore live e stato stabilizzazione.
6. Se la misura è stabile dentro range, lo step passa automaticamente.
7. In caso di FAIL si applica la regola configurata: stop test oppure continua.
8. Il risultato viene registrato nello storico e nella scheda unità.
9. In caso di FAIL si può aprire ticket Repair Center.
10. In caso di PASS/FAIL viene generato report o dossier secondo configurazione.

## 7. Integrazioni strumenti presenti o predisposte

- ESP32 / I/O digitali e analogici.
- PL303 / alimentatore programmabile.
- Keysight / multimetro tramite bridge VISA.
- Scanner QR / seriale.
- Driver USB/seriali assistiti.
- Device Manager con stato LIVE/OFFLINE, reconnect e validazione.
- In futuro: integrazione più ampia con strumenti RF, fixture auto-recognition, MES SQL read-only e sistemi di collaudo cliente.

## 8. Dati, tracciabilità e report

La piattaforma gestisce dati di test, seriali, lotti, operatori, esiti, revisioni, firmware, ticket, retest, report e audit. La logica è local-first, con SQLite e sync queue per lavorare anche offline. La parte MES è predisposta per credenziali in sola lettura e lettura di commesse attive, quantità, cliente, scheda, ricetta e firmware.

## 9. Requisiti tecnici da inserire nella RFQ

Il fornitore dovrà quotare:

- revisione codice e hardening architettura;
- stabilizzazione Test Mode e RecipeEngine;
- integrazione strumenti USB/SCPI/VISA/seriale;
- gestione ricette grafiche e runtime;
- report PDF ufficiale cliente;
- tracciabilità seriale/unità;
- Repair Center e dossier tecnico;
- MES read-only connector;
- database SQLite/PostgreSQL ready;
- backup/restore e installazione Windows;
- validazione con test automatici;
- manuale utente e manuale tecnico;
- pacchetto sorgenti, installer e procedura di rilascio.

## 10. Criteri di accettazione consigliati

- Avvio applicazione senza errori JavaScript.
- Startup doctor OK.
- Runtime validate OK.
- Test Mode avvia e chiude correttamente lo stato RUNNING.
- Device Manager non riconnette strumenti già LIVE inutilmente.
- MISURA STABILIZZATA passa solo quando valore è nel range per il tempo richiesto.
- FAIL gestito con stop/continue secondo ricetta.
- Report generato con dati corretti.
- Storico seriali e scheda unità aggiornati.
- Repair Center crea/aggiorna ticket e retest.
- Installazione pulita su Windows 10/11.
- Nessuna password reale salvata in chiaro negli allegati RFQ.

## 11. Punti aperti / prossima release consigliata

Prossima release tecnica suggerita: **10.1.10 VERSION CONSISTENCY FIX**.

Obiettivo: allineare tutti i riferimenti versione senza modificare logica test:
- `src/renderer/js/version.js`;
- `config/app_settings.json`;
- `package.json description`;
- README/release notes;
- BAT/installer;
- eventuali banner UI.

Dopo 10.1.10, si può procedere con:
- integrazione MES reale;
- nuova pagina TEST MODE IDS per collaudo automatico strumenti;
- gestione fascicolo applicazione con log, report e file dati originali cliente;
- integrazione RF/strumenti USB;
- import report esistenti cliente senza alterare formato.
