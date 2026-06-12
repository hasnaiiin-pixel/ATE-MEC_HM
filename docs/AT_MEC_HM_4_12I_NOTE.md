# AT-MEC_HM_4.12I

Base: AT-MEC_HM_4.12H stabile.

## Implementato
- Data Provider unico mantenendo JSON locale come backend attivo.
- Tracciabilità postazione estesa: Station ID, nome postazione, reparto, sede.
- Report PDF test con dati postazione e supporto logo/nome cliente da ricetta.
- Campo Logo cliente in Recipe Editor (`assets/customers/NOME_CLIENTE.png` consigliato).
- Report multiplo/dossier PDF dalla pagina Test Report con scelta contenuti.
- Sync queue arricchita con dati postazione.

## Non toccato
- Test Mode.
- Motore ricette.
- Hardware/ESP32/PL303.
- Layout Editor.
- Sync Manager esistente.
