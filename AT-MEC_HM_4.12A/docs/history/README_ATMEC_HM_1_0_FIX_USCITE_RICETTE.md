# AT-MEC HM 1.0 - Fix blocchi UI, ricette e uscite digitali

## Modifiche incluse

### Stabilità / blocchi UI
- Il live del wizard non lancia più richieste sovrapposte: se una lettura è in corso, la successiva viene saltata.
- Aggiunti timeout lato UI per letture DI/DO/AI e comandi strumento, così il wizard non resta appeso.
- Aggiunti timeout lato RecipeEngine per I/O digitali, analogici e SCPI.
- Blocco avvio ricetta se una ricetta è già in esecuzione.
- Catch su `recipeEngine.run()` per evitare promise non gestite.
- `RecipeEngine` resetta sempre `running` e `debugResolver` nel `finally`.

### Gestione ricette
- Aggiunto flag globale `Ricetta abilitata all'esecuzione`.
- Se la ricetta è disabilitata, si può salvare/modificare ma non avviare.
- Aggiunto flag `Step attivo` nel wizard.
- Gli step disabilitati sono salvati ma saltati in esecuzione e nella validazione hardware.

### Uscite digitali
Nel wizard `DigitalOutputSet` ora puoi scegliere:

1. `Set stabile HIGH/LOW`
   - imposta l'uscita e la lascia nello stato selezionato.

2. `Set per tempo e ritorno`
   - imposta HIGH/LOW per il tempo indicato nel campo timeout;
   - poi ritorna allo stato finale configurato.

3. `Impulsi a frequenza fissa`
   - imposta impulsi con frequenza Hz;
   - numero impulsi configurabile;
   - stato finale configurabile.

### Live I/O
- DO: set + feedback HIGH/LOW.
- DI: lettura HIGH/LOW live.
- AI: lettura live con timeout.

## Nota build
In questo ambiente non sono installati `node_modules`, quindi TypeScript mostra errori di dipendenze mancanti (`electron`, `serialport`, `modbus-serial`, ecc.).
I file `src` e `dist` sono stati aggiornati. Sul tuo PC esegui:

```bash
npm install
npm run build
npm start
```
