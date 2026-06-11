# AT-MEC_HM_4.12

Base stabile: AT-MEC_HM_4.11

Focus release: Step Misure Universali.

Modifiche principali:
- aggiunta configurazione misura universale con target e tolleranza;
- aggiunta scelta origine misura: automatica da multimetro, automatica con fallback manuale, solo manuale;
- aggiunto flag per accettare/non accettare inserimento manuale se il multimetro digitale fallisce;
- report step arricchito con origine misura AUTOMATICA/MANUALE/SISTEMA, device, target, tolleranza, min, max, unità e timestamp;
- mantenuta compatibilità con Test Mode, Storico Seriali, Scheda Unità, KPI e Layout Editor.

Comandi:
```bat
npm install
npm run build
npm start
```
