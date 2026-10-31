<#
  Installa o aggiorna Deskly su Windows: scarica l'ultima release da GitHub, la estrae nella cartella
  dell'estensione e apre chrome://extensions. Resta un solo gesto manuale: "Ricarica" (o, la prima volta,
  "Carica estensione non pacchettizzata"). Chrome non permette installazioni silenziose fuori dal Web Store.

  Uso:   powershell -ExecutionPolicy Bypass -File install.ps1 [-Path D:\Deskly\deskly]
  Online: irm https://raw.githubusercontent.com/ImDennTV/Deskly/main/install.ps1 | iex
#>
param(
  [switch]$NoBrowser,
  [string]$Path = $(if (Test-Path 'D:\Deskly\deskly') { 'D:\Deskly\deskly' } else { Join-Path $env:LOCALAPPDATA 'Deskly\extension' })
)

$ErrorActionPreference = 'Stop'
$repo = 'ImDennTV/Deskly'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host 'Cerco l''ultima versione di Deskly...'
$rel = Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest" -Headers @{ 'User-Agent' = 'deskly-install' }
$asset = $rel.assets | Where-Object { $_.name -like '*.zip' } | Select-Object -First 1
if (-not $asset) { throw 'La release non contiene uno zip.' }

$tmp = Join-Path $env:TEMP ("deskly-install-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory $tmp | Out-Null
try {
  $zip = Join-Path $tmp $asset.name
  Write-Host "Scarico $($asset.name) ($($rel.tag_name))..."
  Invoke-WebRequest $asset.browser_download_url -OutFile $zip -Headers @{ 'User-Agent' = 'deskly-install' }

  $out = Join-Path $tmp 'x'
  Expand-Archive $zip -DestinationPath $out
  if (-not (Test-Path (Join-Path $out 'manifest.json'))) { throw 'manifest.json non trovato nello zip.' }

  Write-Host "Aggiorno la cartella $Path"
  New-Item -ItemType Directory -Force $Path | Out-Null
  robocopy $out $Path /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "Copia non riuscita (robocopy $LASTEXITCODE)." }
} finally {
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host "Fatto: Deskly $($rel.tag_name) e' in $Path" -ForegroundColor Green
Write-Host 'Ora in chrome://extensions premi "Ricarica" sulla scheda di Deskly.'
Write-Host '(Prima installazione: attiva "Modalita'' sviluppatore", poi "Carica estensione non pacchettizzata" e scegli quella cartella.)'

$chrome = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe' -ErrorAction SilentlyContinue).'(default)'
if ($NoBrowser) { }
elseif ($chrome -and (Test-Path $chrome)) { Start-Process $chrome 'chrome://extensions' }
else { Write-Host 'Apri a mano chrome://extensions.' }
