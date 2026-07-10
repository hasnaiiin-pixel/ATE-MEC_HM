$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LogDir = Join-Path $Root "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Log = Join-Path $LogDir "driver_check_10.0.log"
"AT-MEC HM 10.0 Driver Check - $(Get-Date -Format s)" | Out-File $Log -Encoding UTF8
function Line($status,$name,$detail){ $m = ("{0,-8} {1} - {2}" -f $status,$name,$detail); Write-Host $m; $m | Out-File $Log -Append -Encoding UTF8 }
try {
  $ports = Get-CimInstance Win32_PnPEntity | Where-Object { $_.Name -match 'COM[0-9]+' }
  if($ports){ Line 'PASS' 'Porte COM' (($ports | Select-Object -ExpandProperty Name) -join '; ') } else { Line 'WARNING' 'Porte COM' 'Nessuna porta COM rilevata' }
  $all = Get-CimInstance Win32_PnPEntity
  $ftdi = $all | Where-Object { $_.Name -match 'FTDI|USB Serial Converter|USB Serial Port' }
  if($ftdi){ Line 'PASS' 'FTDI/USB Serial' (($ftdi | Select-Object -First 3 -ExpandProperty Name) -join '; ') } else { Line 'MISSING' 'FTDI/USB Serial' 'Non rilevato' }
  $cp = $all | Where-Object { $_.Name -match 'CP210|Silicon Labs' }
  if($cp){ Line 'PASS' 'CP210x' (($cp | Select-Object -First 3 -ExpandProperty Name) -join '; ') } else { Line 'MISSING' 'CP210x' 'Non rilevato' }
  $ch = $all | Where-Object { $_.Name -match 'CH340|CH341|WCH' }
  if($ch){ Line 'PASS' 'CH340/CH341' (($ch | Select-Object -First 3 -ExpandProperty Name) -join '; ') } else { Line 'MISSING' 'CH340/CH341' 'Non rilevato' }
  $visaPaths = @('C:\Program Files\IVI Foundation\VISA','C:\Program Files (x86)\IVI Foundation\VISA','C:\Program Files\Keysight\IO Libraries Suite')
  $visa = $visaPaths | Where-Object { Test-Path $_ }
  if($visa){ Line 'PASS' 'VISA/SCPI Runtime' ($visa -join '; ') } else { Line 'WARNING' 'VISA/SCPI Runtime' 'NI-VISA/Keysight IO Libraries non rilevati' }
  Line 'INFO' 'PL303QMD-P' 'Verificare COM/VISA configurato in config/app_settings.json'
  Line 'INFO' 'Multimetro' 'Verificare driver specifico e mapping strumento nell’app'
} catch { Line 'ERROR' 'Driver check' $_.Exception.Message; exit 1 }
