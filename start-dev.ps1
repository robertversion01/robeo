<#
ROBEO – helyi fejlesztői szerver (Next.js a repó gyökerében).
Használat: a repó gyökeréből futtasd: .\start-dev.ps1
A szerver minden interfészen hallgat (0.0.0.0:3000), így a telefon a LAN IP-n is eléri: http://<PC_LAN_IP>:3000
#>

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js nincs a PATH-on. Telepítsd a Node LTS-t, majd próbáld újra." -ForegroundColor Red
    exit 1
}

Write-Host "ROBEO dev – Node $(node --version), npm $(npm --version)" -ForegroundColor Cyan
Write-Host "Könyvtár: $root"
Write-Host "Indítás: npm run dev (0.0.0.0:3000 – elérhető LAN-ról is)" -ForegroundColor Green
Write-Host ""

npm run dev
