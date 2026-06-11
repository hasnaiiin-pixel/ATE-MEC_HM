# AT-MEC_HM_2.14

Release focalizzata su stabilità, protezione anti-blocco e documentazione interna del codice.

## Stabilità introdotta

- Wrapper IPC `safeIpcHandle` su tutti i canali principali: ogni errore viene catturato e restituito alla UI senza rompere il renderer.
- EventBus protetto: un listener difettoso non blocca gli altri listener o il motore ricetta.
- WebSocket/IoT broadcast protetto: client remoti lenti o disconnessi vengono rimossi senza bloccare HMI.
- ESP32 USB JSON con limite richieste pendenti e reset coda se la seriale non risponde.
- Buffer RX ESP32 protetto contro dati corrotti senza newline.
- Renderer con gestione globale `error` e `unhandledrejection` per mantenere cliccabile l'interfaccia.
- Log UI limitato e sicuro per evitare crescita infinita del DOM.

## Commenti codice

Sono stati aggiunti commenti descrittivi nei moduli principali:

- `main.ts`: avvio HMI, IPC, hardware, test, report, impostazioni.
- `DeviceManager.ts`: HAL, coda ESP32, strumenti reali/mock.
- `Esp32SerialProvider.ts`: protocollo JSON, timeout, buffer e pending queue.
- `RecipeEngine.ts`: motore ricette e gestione step.
- `LocalDatabase.ts`: database locale JSON, versioning, storico e riparazioni.
- `UserManager.ts`: login, ruoli, livelli e permessi.
- `PdfGenerator.ts`: generazione report PDF.
- `EventBus.ts`: eventi interni protetti.
- `IotServer.ts`: dashboard remota e KPI.
- `index.html`: renderer HMI, protezioni globali e layout.

## Nota build

In ambiente senza `node_modules` possono comparire errori solo per dipendenze mancanti (`electron`, `serialport`, `ws`, `pdfkit`, `@types/node`).
Con dipendenze installate tramite `npm install`, la release è pronta per `npm run build`.
