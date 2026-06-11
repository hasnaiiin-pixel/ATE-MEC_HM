# Driver strumenti

Metti qui eventuali driver `.inf` autorizzati/distribuibili.

Strumenti previsti:
- ESP32-S3 DevKitC-1 N16R8 USB/COM
- Alimentatore PL303 USB/COM o Ethernet
- Keysight via SCPI/VISA/TCP
- Scanner QR USB HID/Webcam

Per installazione automatica dei `.inf`:
```powershell
pnputil /add-driver drivers\*.inf /subdirs /install
```
