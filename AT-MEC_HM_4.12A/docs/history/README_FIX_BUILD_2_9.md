# AT-MEC_HM_2.9 - Fix build emergenza

Correzione applicata:
- `src/main/main.ts`: corretto apostrofo in `Pulsante emergenza premuto dall'operatore` usando stringa con doppi apici.
- `dist/main/main.js`: build runtime corretta per evitare `SyntaxError: Unexpected token ':'` all'avvio.

Nota verifica ambiente:
- `node --check dist/main/main.js` OK.
- In questo ambiente `npm run build` non può completare perché mancano dipendenze/type definitions (`electron`, `@types/node`, `serialport`, `pdfkit`, ecc.). Dopo `npm install` nel tuo PC, il build non deve più mostrare l'errore TS1005/TS1002 su main.ts riga 237.
