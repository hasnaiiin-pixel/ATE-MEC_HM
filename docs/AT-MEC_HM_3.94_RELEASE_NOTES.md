# AT-MEC_HM_3.94

Base: AT-MEC_HM_3.934 stabile.

## Modifiche
- Fix definitivo handle resize: overlay separato dal contenuto dei bottoni, con freccia `↘` via CSS `::before`.
- Protezione eventi handle/move per evitare click doppi o propagazione verso il bottone sottostante.
- Aggiornamento versione UI/package a 3.94.
- Mantenute le funzioni funzionanti della 3.934: selezione, multi-selezione, dimensionamento, allineamento, riferimento elemento, pannello mobile, ricerca a scomparsa, modifica testo.

## Nota
Questa release non modifica Test Mode, ricette, ESP32 o PL303.
