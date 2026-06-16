# AT-MEC_HM_4.21AB_AUDIO_VOICE_PLATFORM

Baseline: AT-MEC_HM_6.1_REVISION_FIRMWARE_MANAGEMENT.

## Obiettivo
Integrare Audio Platform 4.21A e Voice Assistant 4.21B in un unico layer indipendente da Melexis/MES.

## Moduli aggiunti

- Audio Manager
- Audio Event Engine
- Libreria audio future-ready in `assets/audio/`
- Mapping evento → file audio / testo vocale
- Fallback tone interno se il file audio non esiste
- Text To Speech tramite Web Speech API / motore browser/Electron
- Voice Commands base tramite Web Speech API se disponibile
- Log eventi audio
- Hook su Test Mode, emergenza, stampa etichetta e principali eventi runtime

## Eventi supportati

- START_TEST
- PAUSE_TEST
- STOP_TEST
- TEST_COMPLETED
- PASS
- FAIL
- ERROR
- LOGIN
- LOGOUT
- EMERGENCY
- DEVICE_OFFLINE
- DEVICE_ONLINE
- LABEL_PRINTED
- PRINTER_ERROR
- LOT_COMPLETED
- WORK_ORDER_COMPLETED
- TARGET_REACHED
- MANUAL_STEP

## Comandi vocali base

- avvia test
- stop test
- pausa test
- ristampa etichetta
- apri report

## File modificati / aggiunti

- `src/renderer/partials/audio-voice-421ab.html`
- `src/renderer/js/modules/audio/audio-voice-421ab.js`
- `src/renderer/css/modules/17-audio-voice.css`
- `assets/audio/pass/`
- `assets/audio/fail/`
- `assets/audio/error/`
- `assets/audio/system/`
- `assets/audio/production/`
- `assets/audio/recipes/`
- `src/renderer/index.html`
- `package.json`

## Note tecniche

Il modulo non dipende dal MES e non modifica il database Melexis. Tutte le impostazioni sono salvate in localStorage per mantenere compatibilità con l'architettura attuale.

Se il browser/Electron non espone Web Speech API, il sistema mostra un avviso ma non blocca Test Mode.
