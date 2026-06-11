# AT-MEC_HM_2.10

Release evolutiva dopo AT-MEC_HM_2.9_CORRETTA.

## Novità principali

- Modalità Test a pagina intera migliorata.
- Selezione ricetta direttamente in Test Mode.
- Sequenza step visibile con stati: DA FARE, IN ESECUZIONE, PASS, FAIL.
- Login Operatore / livello accesso 10 entra automaticamente in Test Mode.
- Tasto EMERGENZA spostato in alto con sirena animata.
- Emergenza immediata senza conferma: STOP test, DO LOW, scollegamento strumenti.
- Debug step-by-step in Test Mode solo per Admin, Sviluppatore, Engineer o Tecnico.
- Loghi in Test Mode più piccoli per lasciare spazio alla parte operativa.
- Collegamento strumenti automatico all'avvio.
- Da Test Mode è possibile ricollegare strumenti e escludere strumenti non trovati/non necessari.
- Validazione ricetta ignora gli strumenti esclusi dall'utente.

## Nota build

Il codice sorgente è aggiornato. In questo ambiente mancano le dipendenze Node/Electron, quindi la build TypeScript mostra errori di moduli mancanti (`electron`, `serialport`, `@types/node`, ecc.). La sintassi di `dist/main/main.js` e del renderer è stata verificata con `node --check` / controllo JS.
