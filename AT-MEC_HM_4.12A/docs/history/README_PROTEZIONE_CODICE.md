# Protezione codice AT-MEC HM

Per distribuire a clienti o altri PC senza esporre il sorgente, usare:

1. Build Electron (`npm run package:all`) e distribuire solo installer/portable.
2. Non distribuire la cartella `src/` nella versione finale cliente.
3. Aggiungere offuscazione JavaScript nel processo build se necessario.
4. Firmare ricette e database con checksum/licenza.
5. Cifrare database locale nelle prossime release.

Nota: se un file sorgente viene caricato in un sistema AI o consegnato a terzi, il contenuto può essere letto. La protezione reale consiste nel distribuire solo eseguibile/installer e non il sorgente.
