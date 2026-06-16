# AT-MEC_HM_4.13R_H_DEVICE_EMERGENCY_VISIBLE

Base: AT-MEC_HM_4.13R_G_DEVICE_EMERGENCY_SAFE.

Fix mirato:
- il menu stabile richiamava ancora `renderDeviceManagerPage413RA()`;
- la 4.13R_G agganciava il pannello Emergency solo a `renderDeviceManagerPage`, `renderDeviceManagerPage413G` e `renderDeviceManagerPage326`;
- quindi entrando dal menu reale il pannello non veniva visualizzato.

Correzione:
- tutte le alias storiche Device Manager ora puntano alla stessa render con Emergency:
  - `renderDeviceManagerPage413RA`
  - `renderDeviceManagerPage413RB`
  - `renderDeviceManagerPage413RC`
  - `renderDeviceManagerPage413RD`
  - `renderDeviceManagerPage413RE`
  - `renderDeviceManagerPage413RG`
  - `renderDeviceManagerPage413G`
  - `renderDeviceManagerPage326`
  - `renderDeviceManagerPage`
- aggiunto fallback MutationObserver per reinserire il pannello se una render legacy ridisegna la pagina.

Non modificato:
- login;
- utenti;
- ruoli;
- permessi;
- profilo collaboratore;
- Test Mode;
- ricette;
- report;
- backend.

Test consigliato:
1. Login admin.
2. Menu sinistro > Device Manager.
3. Verificare pannello `Emergency OFF assistito` sotto Pre-check Test Mode o prima dello Stato dispositivi.
4. Premere i pulsanti solo con hardware in condizione sicura.
