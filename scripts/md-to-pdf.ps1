# scripts/md-to-pdf.ps1
# Markdown -> styled HTML -> PDF (Edge headless)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/md-to-pdf.ps1 -InputMd docs/PROJECT-OVERVIEW.md -OutputPdf docs/PROJECT-OVERVIEW.pdf

param(
    [Parameter(Mandatory=$true)][string]$InputMd,
    [Parameter(Mandatory=$true)][string]$OutputPdf
)

$ErrorActionPreference = "Stop"

# Resolve paths
$InputMdFull = (Resolve-Path $InputMd).Path
$OutputPdfFull = [System.IO.Path]::GetFullPath($OutputPdf)
$TempHtml = [System.IO.Path]::GetTempFileName() + ".html"

Write-Host "Reading markdown: $InputMdFull"
$mdContent = Get-Content -Raw -Path $InputMdFull -Encoding UTF8

Write-Host "Converting markdown to HTML..."
$converted = ConvertFrom-Markdown -InputObject $mdContent
$htmlBody = $converted.Html

$css = @"
<style>
  @page { size: A4; margin: 18mm 16mm; }
  body {
    font-family: 'Segoe UI', 'Inter', system-ui, -apple-system, sans-serif;
    color: #1a1a1a;
    line-height: 1.55;
    font-size: 11pt;
    max-width: 100%;
  }
  h1 { font-size: 22pt; color: #0f172a; border-bottom: 2px solid #0ea5e9; padding-bottom: 6pt; margin-top: 18pt; }
  h2 { font-size: 16pt; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4pt; margin-top: 18pt; page-break-after: avoid; }
  h3 { font-size: 13pt; color: #1e293b; margin-top: 14pt; page-break-after: avoid; }
  h4 { font-size: 11.5pt; color: #334155; margin-top: 10pt; page-break-after: avoid; }
  p { margin: 6pt 0; }
  ul, ol { margin: 6pt 0 6pt 18pt; padding: 0; }
  li { margin: 2pt 0; }
  code {
    font-family: 'Cascadia Mono', 'Consolas', 'Courier New', monospace;
    background: #f1f5f9;
    color: #0f172a;
    padding: 1pt 4pt;
    border-radius: 3pt;
    font-size: 9.5pt;
  }
  pre {
    background: #0f172a;
    color: #e2e8f0;
    padding: 10pt 12pt;
    border-radius: 6pt;
    overflow-x: auto;
    font-size: 9pt;
    line-height: 1.45;
    page-break-inside: avoid;
  }
  pre code { background: transparent; color: inherit; padding: 0; }
  blockquote {
    border-left: 4pt solid #0ea5e9;
    background: #f0f9ff;
    padding: 8pt 12pt;
    margin: 8pt 0;
    color: #0c4a6e;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8pt 0;
    page-break-inside: avoid;
    font-size: 10pt;
  }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 4pt 8pt;
    text-align: left;
    vertical-align: top;
  }
  th { background: #e2e8f0; font-weight: 600; }
  tr:nth-child(even) td { background: #f8fafc; }
  hr { border: none; border-top: 1px solid #cbd5e1; margin: 14pt 0; }
  a { color: #0284c7; text-decoration: none; }
  strong { color: #0f172a; }
  em { color: #475569; }
</style>
"@

$html = @"
<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="UTF-8">
<title>Robeo - Project Overview</title>
$css
</head>
<body>
$htmlBody
</body>
</html>
"@

Write-Host "Writing temp HTML: $TempHtml"
[System.IO.File]::WriteAllText($TempHtml, $html, [System.Text.Encoding]::UTF8)

# Find a Chromium-based browser. Prefer Chrome (Edge headless may be blocked by group policy).
$browserPaths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)
$edge = $browserPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { throw "No Chromium-based browser found" }

Write-Host "Using browser: $edge"
Write-Host "Generating PDF: $OutputPdfFull"

# Edge headless print-to-pdf
$fileUri = "file:///" + ($TempHtml -replace '\\', '/')
$userDataDir = Join-Path $env:TEMP "edge-pdf-profile-$([guid]::NewGuid())"
Write-Host "Edge user data dir: $userDataDir"

$edgeArgs = @(
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--user-data-dir=$userDataDir",
    "--print-to-pdf=$OutputPdfFull",
    "--print-to-pdf-no-header",
    $fileUri
)

Write-Host "Edge args: $($edgeArgs -join ' ')"
$proc = Start-Process -FilePath $edge -ArgumentList $edgeArgs -NoNewWindow -Wait -PassThru -RedirectStandardError "$env:TEMP\edge-pdf-err.txt" -RedirectStandardOutput "$env:TEMP\edge-pdf-out.txt"
Write-Host "Edge exit code: $($proc.ExitCode)"

if (Test-Path "$env:TEMP\edge-pdf-err.txt") {
    $errContent = Get-Content "$env:TEMP\edge-pdf-err.txt" -Raw
    if ($errContent.Trim()) { Write-Host "Edge stderr: $errContent" }
}

Start-Sleep -Milliseconds 500

if (Test-Path $OutputPdfFull) {
    $size = (Get-Item $OutputPdfFull).Length
    Write-Host "SUCCESS: PDF created at $OutputPdfFull ($([math]::Round($size/1KB, 1)) KB)"
} else {
    throw "PDF was not created"
}

Remove-Item $TempHtml -ErrorAction SilentlyContinue
Remove-Item $userDataDir -Recurse -Force -ErrorAction SilentlyContinue
