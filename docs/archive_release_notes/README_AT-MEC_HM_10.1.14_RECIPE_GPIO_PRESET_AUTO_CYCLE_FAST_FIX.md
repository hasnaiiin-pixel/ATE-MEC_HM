# AT-MEC_HM / VEXON 10.1.14

## RECIPE GPIO PRESET + AUTO CYCLE FAST FIX

Questa release parte dalla 10.1.13 e aggiunge la preparazione del banco direttamente nella ricetta, senza ricaricare tutti i GPIO dopo ogni test.

### Funzionamento

1. **Caricamento o cambio ricetta**
   - collega/verifica una sola volta gli strumenti richiesti;
   - applica il profilo `gpio_initial_profile`;
   - memorizza la ricetta come preparata;
   - i test successivi usano il percorso Fast Start.

2. **Durante gli step di misura**
   - resta attiva la gestione 10.1.13: GPIO HIGH/LOW mantenuto durante misura, retry e fallback manuale;
   - lo stato finale dello step viene applicato solo quando lo step è realmente concluso.

3. **Fine test PASS/FAIL**
   - non ricarica la ricetta;
   - applica soltanto `gpio_inter_test_profile`;
   - attende rimozione scheda precedente e poi una nuova misura stabile;
   - avvia automaticamente il test successivo quando seriale/commessa e hardware sono pronti.

4. **STOP, cambio ricetta o chiusura**
   - applica `gpio_safe_profile`;
   - impedisce che uscite critiche rimangano nello stato del test precedente.

### Recipe Editor

Nuova sezione **Hardware GPIO ricetta e ciclo automatico** con:

- profilo iniziale ricetta;
- profilo rapido tra due test;
- profilo sicuro;
- GPIO, HIGH/LOW, ritardo e descrizione;
- dispositivo e comando SCPI per trigger;
- range presenza scheda;
- range assenza scheda;
- stabilità presenza/rimozione;
- ritardo minimo tra cicli;
- polling multimetro;
- obbligo rimozione scheda precedente;
- avvio diretto sulla prima scheda.

### Prestazioni

- il profilo iniziale non viene ripetuto dopo ogni test;
- se ricetta/GPIO sono già preparati, START/F1 salta la scansione completa strumenti;
- resta attiva la validazione rapida hardware;
- il multimetro viene interrogato solo quando il banco è inattivo e il ciclo automatico è abilitato;
- protezione anti doppio avvio e anti riavvio sulla stessa scheda.

### Verifica consigliata

1. Configurare i tre profili GPIO nel Recipe Editor.
2. Abilitare il ciclo automatico e inserire range presenza/assenza.
3. Caricare la ricetta: verificare che il profilo iniziale venga applicato una sola volta.
4. Eseguire un test.
5. A fine test verificare soltanto i GPIO del profilo tra-test.
6. Rimuovere la scheda e controllare lo stato **RIMUOVERE SCHEDA** → **ATTESA NUOVA SCHEDA**.
7. Inserire/scansionare la nuova scheda: quando la misura è stabile, il test deve partire automaticamente.
8. Premere STOP e verificare il profilo sicuro.

### Compatibilità

Sono mantenute le correzioni precedenti:

- fallback manuale diretto e pulizia cella;
- Action panel unico;
- Fast Start/F1;
- GPIO mantenuto durante misura, retry e inserimento manuale.
