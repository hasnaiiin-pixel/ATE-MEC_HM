Write-Host "AT-MEC HM 3.0 - Installazione driver assistita"
Write-Host "1) ESP32-S3: se Windows non crea la porta COM, installare driver USB-UART dal produttore della scheda."
Write-Host "2) PL303/Keysight USB: installare driver VISA/USB del produttore se necessari."
Write-Host "3) Se hai file .inf in drivers\\, puoi installarli con:"
Write-Host "   pnputil /add-driver drivers\\*.inf /subdirs /install"
if (Test-Path "$PSScriptRoot\..\drivers") {
  $inf = Get-ChildItem "$PSScriptRoot\..\drivers" -Filter *.inf -Recurse -ErrorAction SilentlyContinue
  if ($inf.Count -gt 0) {
    Write-Host "Trovati driver .inf. Avvio pnputil come amministratore..."
    Start-Process pnputil -ArgumentList "/add-driver `"$PSScriptRoot\..\drivers\*.inf`" /subdirs /install" -Verb RunAs
  } else {
    Write-Host "Nessun .inf trovato nella cartella drivers."
  }
}
