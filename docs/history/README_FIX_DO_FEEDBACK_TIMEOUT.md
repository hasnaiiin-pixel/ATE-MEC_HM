# Fix DO feedback timeout - AT-MEC HM 1.0

Problema rilevato:

```text
Step #1: DO set timeout 500ms
Step #1 FAIL — Mancata corrispondenza dei parametri nominali o timeout...
```

Correzioni applicate:

- timeout minimo comando DO portato a 1200 ms;
- timeout feedback DO portato a minimo 1500 ms;
- log step più chiaro: distingue comando non completato, feedback non letto e feedback diverso;
- nuovo flag wizard **Verifica feedback DO**;
- se il flag è disattivo, lo step DO non fallisce quando il comando è OK ma la lettura feedback è lenta/non supportata;
- se il flag è attivo, lo step fallisce solo con dettaglio tecnico leggibile.

Uso consigliato:

- Per attivare una uscita senza controllo elettrico: lasciare **Verifica feedback DO** disattivo.
- Per collaudo con conferma reale HIGH/LOW: attivare **Verifica feedback DO** e usare timeout 1500-3000 ms.
