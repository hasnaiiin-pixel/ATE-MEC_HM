# AT-MEC_HM_4.22_ENTERPRISE_STABLE

Release di consolidamento industriale basata su AT-MEC_HM_4.21AB_AUDIO_VOICE_PLATFORM.

## Obiettivo

Congelare e stabilizzare i moduli esistenti prima di procedere con nuove funzioni complesse.

## Incluso

- Version consistency: package, titolo, login, topbar e version.js allineati a 4.22.
- Enterprise Stability Center: nuova pagina per audit runtime, backup localStorage, permission audit e log enterprise.
- Backup CLI: `npm run backup`.
- Audit CLI: `npm run audit:enterprise`.
- Documentazione release storiche spostata in `docs/releases/`.
- Nessuna modifica intenzionale al Test Engine, Recipe Engine, Device Manager, Label Platform, Print Engine, Audio/Voice o Manufacturing Layer.

## Uso consigliato

1. Eseguire `npm install` se mancano dipendenze.
2. Eseguire `npm run build`.
3. Eseguire `npm run audit:enterprise`.
4. Aprire HMI e andare in Impostazioni → Enterprise Stable.
5. Eseguire audit runtime e backup configurazioni.

## Baseline successiva

Questa release diventa la baseline consigliata prima di riprendere con:

- 6.3 Production Execution System
- 6.4 Manufacturing Intelligence
- 7.0 AI Factory Platform

Melexis SQL Connector resta in pausa fino al recupero di credenziali, tabelle e query reali.
