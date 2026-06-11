$WshShell = New-Object -comObject WScript.Shell
$Desktop = [Environment]::GetFolderPath("Desktop")
$Shortcut = $WshShell.CreateShortcut((Join-Path $Desktop "AT-MEC HM 3.0.lnk"))
$Shortcut.TargetPath = (Join-Path $PSScriptRoot "..\AVVIA_AT_MEC_HM_3.0.bat")
$Shortcut.WorkingDirectory = (Resolve-Path (Join-Path $PSScriptRoot ".."))
$Shortcut.Description = "AT-MEC HM 3.0"
$Shortcut.Save()
