# scripts/install-node-portable.ps1
# Per-user portable Node.js telepito (NEM kell admin jog).
#
# Mit csinal:
#   1. Letolti a legfrissebb Node.js LTS-t (vagy a -Version-nel megadottat) zip-ben
#   2. Kicsomagolja %USERPROFILE%\nodejs ala (vagy a -InstallDir-be)
#   3. Hozzaadja a HKCU User PATH-hoz (perzisztens, no admin)
#   4. Frissiti az aktualis session PATH-at is
#   5. Ellenorzi: node -v, npm -v
#
# Hasznalat:
#   pwsh -ExecutionPolicy Bypass -File scripts/install-node-portable.ps1
#   pwsh -ExecutionPolicy Bypass -File scripts/install-node-portable.ps1 -Version v22.11.0
#   pwsh -ExecutionPolicy Bypass -File scripts/install-node-portable.ps1 -InstallDir "D:\tools\nodejs"

param(
    [string]$Version = "",
    [string]$InstallDir = "",
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# 1. Verzio meghatarozasa
if (-not $Version) {
    Write-Host "Lekerem a legfrissebb LTS verziot..." -ForegroundColor Cyan
    $index = Invoke-WebRequest -Uri "https://nodejs.org/dist/index.json" -UseBasicParsing -TimeoutSec 15
    $data = $index.Content | ConvertFrom-Json
    $lts = $data | Where-Object { $_.lts -ne $false } | Select-Object -First 1
    $Version = $lts.version
    Write-Host "  -> $Version ($($lts.lts))" -ForegroundColor Green
}
if (-not $Version.StartsWith("v")) { $Version = "v$Version" }

# 2. Install dir
if (-not $InstallDir) {
    $InstallDir = Join-Path $env:USERPROFILE "nodejs"
}
$ResolvedDir = if (Test-Path $InstallDir) { (Resolve-Path $InstallDir).Path } else { $InstallDir }

if ((Test-Path $ResolvedDir) -and -not $Force) {
    $existing = Get-ChildItem -Path $ResolvedDir -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($existing) {
        Write-Host "FIGYELEM: $ResolvedDir mar tartalmaz node.exe-t." -ForegroundColor Yellow
        Write-Host "Tovabblepes csak -Force kapcsoloval." -ForegroundColor Yellow
        Write-Host "Meglevo: $($existing.FullName)" -ForegroundColor Yellow
        exit 1
    }
}

# 3. Letoltes
$ZipUrl = "https://nodejs.org/dist/$Version/node-$Version-win-x64.zip"
$ZipPath = Join-Path $env:TEMP "node-$Version-win-x64.zip"

Write-Host ""
Write-Host "Letoltes: $ZipUrl" -ForegroundColor Cyan
Write-Host "  -> $ZipPath"

$sw = [Diagnostics.Stopwatch]::StartNew()
Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipPath -UseBasicParsing -TimeoutSec 600
$sw.Stop()
$size = [Math]::Round((Get-Item $ZipPath).Length / 1MB, 1)
Write-Host "  -> Letoltve $size MB / $([Math]::Round($sw.Elapsed.TotalSeconds, 1))s" -ForegroundColor Green

# 4. Kicsomagolas
Write-Host ""
Write-Host "Kicsomagolas: $ResolvedDir" -ForegroundColor Cyan
$TempExtract = Join-Path $env:TEMP "node-extract-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $TempExtract -Force | Out-Null
Expand-Archive -Path $ZipPath -DestinationPath $TempExtract -Force

# A zip-ben egyetlen gyokerkonyvtar van: node-vXX.X.X-win-x64
$extractedRoot = Get-ChildItem -Path $TempExtract -Directory | Select-Object -First 1
if (-not $extractedRoot) { throw "Kicsomagolasi hiba" }

# Atmasoljuk a celkonyvtarba
if (Test-Path $ResolvedDir) { Remove-Item $ResolvedDir -Recurse -Force }
New-Item -ItemType Directory -Path (Split-Path $ResolvedDir -Parent) -Force | Out-Null
Move-Item -Path $extractedRoot.FullName -Destination $ResolvedDir -Force
Remove-Item $TempExtract -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $ZipPath -Force -ErrorAction SilentlyContinue

Write-Host "  -> Telepitve: $ResolvedDir" -ForegroundColor Green

# 5. PATH frissites (HKCU - user szinten, NO ADMIN)
Write-Host ""
Write-Host "User PATH frissitese (HKCU\Environment)..." -ForegroundColor Cyan

$currentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ([string]::IsNullOrEmpty($currentUserPath)) { $currentUserPath = "" }
$pathSegments = $currentUserPath -split ";" | Where-Object { $_ -ne "" }

if ($pathSegments -notcontains $ResolvedDir) {
    $newUserPath = ($pathSegments + $ResolvedDir) -join ";"
    [Environment]::SetEnvironmentVariable("Path", $newUserPath, "User")
    Write-Host "  -> Hozzaadva: $ResolvedDir" -ForegroundColor Green
} else {
    Write-Host "  -> Mar a PATH-on van." -ForegroundColor Yellow
}

# Aktualis session PATH is
if (($env:Path -split ";") -notcontains $ResolvedDir) {
    $env:Path = "$env:Path;$ResolvedDir"
}

# 6. Ellenorzes
Write-Host ""
Write-Host "Ellenorzes:" -ForegroundColor Cyan
$nodeExe = Join-Path $ResolvedDir "node.exe"
$npmCmd = Join-Path $ResolvedDir "npm.cmd"

if (-not (Test-Path $nodeExe)) { throw "node.exe nem talalhato: $nodeExe" }
if (-not (Test-Path $npmCmd)) { throw "npm.cmd nem talalhato: $npmCmd" }

$nodeVer = & $nodeExe -v
$npmVer = & $npmCmd -v
Write-Host "  node: $nodeVer" -ForegroundColor Green
Write-Host "  npm:  v$npmVer" -ForegroundColor Green

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "KESZ! A Node.js portable telepitve es a User PATH-on van." -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "FONTOS: Az aktualis shell session ('npm' parancshoz) MAR mukodik." -ForegroundColor Yellow
Write-Host "        UJ shell / Cursor terminal / VS Code = uj PATH-ot olvas." -ForegroundColor Yellow
Write-Host ""
Write-Host "Probald most:" -ForegroundColor Cyan
Write-Host "  npm install" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
