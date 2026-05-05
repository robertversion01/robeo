<#
ROBEO Fejlesztői Szerver Indító Script
Automatikusan beállítja a Node.js útvonalat és elindítja a projekt
#>

Write-Host "🚀 ROBEO Fejlesztői Szerver Indítása" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Node.js portable mappa útvonala
$nodePath = "C:\Users\hevesitr\Desktop\node-portable\node-v22.14.0-win-x64"

# Ellenőrizzük hogy létezik-e a mappa
if (-not (Test-Path $nodePath)) {
    Write-Host "❌ Hiba: Node.js portable mappa nem található!" -ForegroundColor Red
    Write-Host "   Elvárt hely: $nodePath" -ForegroundColor Gray
    Write-Host ""
    Read-Host "Nyomj Entert a kilépéshez"
    exit 1
}

# Hozzáadjuk a PATH-hoz az aktuális munkamenethez
$env:PATH = "$nodePath;$env:PATH"

Write-Host "✅ Node.js útvonal beállítva" -ForegroundColor Green
Write-Host ""

# Verzió ellenőrzés
node --version
npm --version

Write-Host ""
Write-Host "📦 Projekt indítása..." -ForegroundColor Yellow
Write-Host ""

# Indítjuk a fejlesztői szervert
npm run dev

Write-Host ""
Read-Host "Nyomj Entert a kilépéshez"