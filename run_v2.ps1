$ErrorActionPreference = "Stop"

# ROBEO v2 isolated launcher (PowerShell)
# Starts frontend and backend in separate PowerShell windows.

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontend = Join-Path $root "frontend"
$backend = Join-Path $root "backend\src\Marketplace.API"

Write-Host ""
Write-Host "[ROBEO v2] Starting isolated project..." -ForegroundColor Cyan
Write-Host "Root: $root"
Write-Host ""

if (-not (Test-Path (Join-Path $frontend "package.json"))) {
  Write-Host "[ERROR] Frontend folder not found: $frontend" -ForegroundColor Red
  exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "[ERROR] npm is not installed or not in PATH." -ForegroundColor Red
  exit 1
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontend'; npm install; npm run dev"

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
  Write-Host "[INFO] .NET SDK not found. Backend was not started." -ForegroundColor Yellow
  Write-Host "[INFO] Install .NET 8 SDK, then run dotnet in $backend" -ForegroundColor Yellow
  exit 0
}

if (Test-Path (Join-Path $backend "Marketplace.API.csproj")) {
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backend'; dotnet run"
} else {
  Write-Host "[WARN] Backend project not found: $backend" -ForegroundColor Yellow
}

Write-Host "[OK] v2 launch commands sent." -ForegroundColor Green
Write-Host "Telefon / LAN: a böngészőben a PC helyi IP-je, pl. http://192.168.x.x:5173 (Vite) és az API a gépen fut (5055)." -ForegroundColor DarkGray
