# AT-MEC HM 1.0 — Step log, I/O grafici, COM, loghi, ruoli

Modifiche incluse:

- Step log dettagliato: ogni step stampa descrizione, valore letto/impostato, atteso, feedback e motivo del fail.
- Wizard ricette con lista grafica I/O ESP32: DI/DO/AI vengono mostrati come chip selezionabili. Gli I/O non compatibili con la funzione non vengono proposti/disabilitati.
- Live I/O: DI e DO mostrano HIGH/LOW nel wizard; DO legge anche il feedback dopo il set.
- COM ESP32 senza digitazione manuale: scansione periferiche seriali e selezione da lista, con evidenza delle porte probabili ESP32/USB-Serial.
- Alimentazione manuale: il test non viene più bloccato dal PL303; lo step log segnala la richiesta ma l’esecuzione prosegue.
- Branding: selezione logo azienda e logo costruttore; i percorsi sono salvati in `config/app_settings.json` e vengono usati nei PDF.
- Ruoli e credenziali: creazione ruoli con permessi e utenti con password hashata SHA-256 + salt in `config/users.json`.

Nota sicurezza: la gestione credenziali è locale e adatta a banco/laboratorio; per produzione multi-stazione va collegata a dominio/LDAP o database centralizzato.
