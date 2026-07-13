# AT-MEC HM 10.1.15 — Measurement Speed Analysis

## Caso analizzato: ricetta 2180321

- 9 step `StableMeasurement`;
- stesso Keysight 34461A;
- stessa modalità `MEAS:RES?`;
- stabilità circa 250 ms per step;
- GPIO SW1–SW8 attivato LOW durante la misura e riportato HIGH a fine step.

## Collo di bottiglia corretto

Nelle release precedenti ogni step poteva eseguire nuovamente la configurazione completa del DMM. Con collegamento USB/VISA ogni comando avviava inoltre un nuovo processo Python, importava PyVISA, apriva la risorsa USBTMC, eseguiva un comando e chiudeva tutto.

La 10.1.15 introduce:

1. processo Python/PyVISA persistente;
2. risorsa Keysight mantenuta aperta;
3. configurazione DMM in cache per modalità;
4. preparazione SCPI batch;
5. sole letture `READ?` negli step successivi compatibili;
6. una sola riconfigurazione controllata dopo errore;
7. skip delle scritture GPIO duplicate;
8. telemetria prestazioni per singolo step.

## Smoke test software incluso

Comando:

```bat
node scripts\performance_smoke_10115.js scripts\fixtures\2180321_performance.json
```

Risultato di riferimento in ambiente simulato:

- esito: PASS;
- configurazioni RES: 1;
- letture: 27, tre campioni per ognuno dei nove step;
- tempo totale: circa 2,3 secondi;
- tempo step: circa 249–258 ms.

Il risultato reale sul banco dipende dalla latenza Keysight USB/VISA e dal tempo di risposta del firmware ESP32. I log `[HAL PERF]` e `[RECIPE PERF]` permettono di misurare con precisione i tempi reali.
