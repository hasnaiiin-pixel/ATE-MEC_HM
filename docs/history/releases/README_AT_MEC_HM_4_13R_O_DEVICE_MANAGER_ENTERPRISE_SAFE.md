# AT-MEC_HM_4.13R_O_DEVICE_MANAGER_ENTERPRISE_SAFE

Base: AT-MEC_HM_4.13R_N_DEVICE_MANAGER_INTEGRATED_SAFE confermata funzionante.

Modifiche SAFE solo renderer/UI:
- Device Manager Enterprise.
- Health score dispositivi.
- Storico eventi enterprise locale persistente.
- Lock/Unlock test visivo, non bloccante.
- Backup configurazioni Device Manager in localStorage.
- Dashboard KPI Device Manager consolidata.

Non modificato:
- login
- utenti
- ruoli
- permessi
- profilo collaboratore
- backend
- Test Mode engine
- ricette
- report

Test consigliato:
1. Login admin.
2. Aprire Device Manager.
3. Verificare pannello Device Manager Enterprise.
4. Premere Aggiorna health.
5. Premere Lock/Unlock test visivo.
6. Premere Backup configurazioni.
7. Avviare Test Mode e verificare comportamento invariato rispetto 4.13R_N.
