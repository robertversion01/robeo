$ErrorActionPreference = "Stop"

# ROBEO v1 — Next.js dev (localhost:3000). Mindig a repo gyökeréből indul.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $root

Write-Host ""
Write-Host "[ROBEO v1] Next.js dev — $root" -ForegroundColor Cyan
Write-Host "  URL: http://localhost:3000" -ForegroundColor DarkGray
Write-Host ""

if (-not (Test-Path (Join-Path $root "package.json"))) {
  Write-Host "[ERROR] Nem található package.json: $root" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path (Join-Path $root "next.config.ts"))) {
  Write-Host "[ERROR] Nem Next gyökér (hiányzik next.config.ts): $root" -ForegroundColor Red
  exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "[ERROR] npm nincs a PATH-on." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path (Join-Path $root "node_modules"))) {
  Write-Host "[ROBEO v1] npm install..." -ForegroundColor Yellow
  npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

npm run dev
