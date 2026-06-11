# AT-MEC_HM_2.8

Release successiva alla 2.5.

## Fix compilazione
- Corretto `PdfGenerator.ts`: rimossa opzione PDFKit `align: 'left'` non compatibile con i tipi TypeScript installati.
- Il logo azienda viene posizionato a sinistra tramite coordinate fisse, senza usare `align: 'left'`.

## Branding / Loghi
- Login aggiornato: logo aziendale in alto, titolo ATE-MEC centrato, logo sviluppatore sotto il form login.
- Possibilità di scegliere modalità loghi:
  - trasparenza originale PNG;
  - sfondo bianco automatico.
- La modalità viene applicata a Login, HMI e Report.
- Report PDF: MEC in alto a sinistra e MIRZA in alto a destra, con area dedicata per evitare sovrapposizioni con le scritte.

## Versione
- Package aggiornato a 2.8.0.
