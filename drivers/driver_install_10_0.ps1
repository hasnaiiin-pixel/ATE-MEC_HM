$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LogDir = Join-Path $Root "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Log = Join-Path $LogDir "driver_install_10.0.log"
"AT-MEC HM 10.0 Driver Install - $(Get-Date -Format s)" | Out-File $Log -Encoding UTF8
function Write-Step($m){ Write-Host $m; $m | Out-File $Log -Append -Encoding UTF8 }
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){
  Write-Step "WARNING: PowerShell non avviato come amministratore. PnPUtil potrebbe non installare driver."
}
$DriversRoot = Join-Path $Root "drivers"
$inf = Get-ChildItem $DriversRoot -Recurse -Filter *.inf -ErrorAction SilentlyContinue
if($inf.Count -gt 0){
  Write-Step "INF trovati: $($inf.Count). Installazione con pnputil..."
  foreach($f in $inf){
    Write-Step "INSTALL INF: $($f.FullName)"
    pnputil /add-driver "$($f.FullName)" /install | Tee-Object -FilePath $Log -Append
  }
}else{ Write-Step "Nessun file .inf trovato. Inserire driver ufficiali nelle sottocartelle drivers/." }
$installers = Get-ChildItem $DriversRoot -Recurse -Include *.exe,*.msi -ErrorAction SilentlyContinue | Where-Object { $_.Name -notmatch 'CHECK_DRIVER|INSTALLA_DRIVER' }
if($installers.Count -gt 0){
  Write-Step "Installer trovati: $($installers.Count). Avvio assistito, uno per volta."
  foreach($i in $installers){
    Write-Step "INSTALLER DISPONIBILE: $($i.FullName)"
    Write-Host "Avviare installer? $($i.Name) [S/N]"
    $ans = Read-Host
    if($ans -match '^[sSyY]'){
      Start-Process -FilePath $i.FullName -Wait
      Write-Step "Eseguito installer: $($i.Name)"
    } else { Write-Step "Saltato installer: $($i.Name)" }
  }
}else{ Write-Step "Nessun installer .exe/.msi trovato. Driver opzionali saltati." }
Write-Step "Installazione driver completata. Log: $Log"
