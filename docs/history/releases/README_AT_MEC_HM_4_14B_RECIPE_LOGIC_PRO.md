# AT-MEC_HM_4.14B_RECIPE_LOGIC_PRO

Base: AT-MEC_HM_4.14A_RECIPE_VARIABLES_PRO.

Modifiche:
- aggiunto Recipe Logic Pro nel Recipe Editor;
- aggiunto blocco IF / ELSE / END IF;
- condizioni su variabili `${VAR}` e valori fissi;
- operatori: ==, !=, >, <, >=, <=, CONTAINS, EXISTS, EMPTY;
- simulazione logica prima dell'avvio;
- compilazione sicura della ricetta su copia prima di `api.startTest`;
- nessuna modifica a backend, login, utenti, ruoli, permessi, Device Manager, report o hardware.

Limite voluto:
- le condizioni sono valutate prima dell'avvio test usando variabili già disponibili.
- IF su misure live/runtime verrà gestito nella prossima fase Recipe Flow Pro.

Test consigliati:
1. Aprire Recipe Editor.
2. Aggiungere variabili preset.
3. Aggiungere IF/ELSE.
4. Simulare logica.
5. Avviare Test Mode e verificare che il test parta come nella 4.14A.
