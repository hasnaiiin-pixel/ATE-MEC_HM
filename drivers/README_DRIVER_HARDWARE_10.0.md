# Driver hardware AT-MEC HM 10.0

Questa cartella contiene la struttura per installare/verificare driver hardware di produzione.

Categorie previste:
- USB/Seriale: FTDI VCP, Silicon Labs CP210x, WCH CH340/CH341.
- RS485: adattatori USB-RS485 e porte COM.
- VISA/SCPI: NI-VISA o Keysight IO Libraries per strumenti SCPI/VISA.
- Strumenti: PL303QMD-P, multimetro digitale, scanner/strumenti USB.
- Industrial I/O: moduli I/O industriali futuri.

Gli installer proprietari non vengono inclusi se non presenti nella cartella. Inserire solo driver ufficiali e distribuibili.

Script:
- `INSTALLA_DRIVER_HARDWARE_10.0.bat`: installazione assistita.
- `CHECK_DRIVER_HARDWARE_10.0.bat`: controllo dispositivi/driver.

Log:
- `logs/driver_install_10.0.log`
- `logs/driver_check_10.0.log`
