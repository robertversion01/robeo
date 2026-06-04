# scripts/docs-to-pdf-all.ps1
# Convert all docs/*.md (and optionally root *.md) to PDF using md-to-pdf.ps1
# Usage:
#   pwsh -File scripts/docs-to-pdf-all.ps1                # docs/*.md only
#   pwsh -File scripts/docs-to-pdf-all.ps1 -IncludeRoot   # also root *.md

param(
    [switch]$IncludeRoot
)

$ErrorActionPreference = "Continue"
$RepoRoot = (Resolve-Path "$PSScriptRoot\..").Path
$SingleScript = Join-Path $PSScriptRoot "md-to-pdf.ps1"

if (-not (Test-Path $SingleScript)) {
    throw "md-to-pdf.ps1 not found at $SingleScript"
}

$files = @()
$files += Get-ChildItem -Path (Join-Path $RepoRoot "docs") -Filter "*.md" -File

if ($IncludeRoot) {
    $files += Get-ChildItem -Path $RepoRoot -Filter "*.md" -File
}

if ($files.Count -eq 0) {
    Write-Host "No markdown files found."
    exit 0
}

Write-Host "Converting $($files.Count) markdown file(s) to PDF..." -ForegroundColor Cyan
Write-Host ("-" * 60)

$success = 0
$failed = @()

foreach ($f in $files) {
    $pdfPath = [System.IO.Path]::ChangeExtension($f.FullName, ".pdf")
    $relInput = $f.FullName.Substring($RepoRoot.Length + 1)
    $relOutput = $pdfPath.Substring($RepoRoot.Length + 1)
    Write-Host ""
    Write-Host "==> $relInput -> $relOutput" -ForegroundColor Yellow
    try {
        & $SingleScript -InputMd $f.FullName -OutputPdf $pdfPath
        $success++
    } catch {
        Write-Host "FAILED: $_" -ForegroundColor Red
        $failed += $relInput
    }
}

Write-Host ""
Write-Host ("=" * 60)
Write-Host "Done. Success: $success / $($files.Count)" -ForegroundColor Green
if ($failed.Count -gt 0) {
    Write-Host "Failed files:" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}
