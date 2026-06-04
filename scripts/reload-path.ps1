# scripts/reload-path.ps1
# Ujratolti az aktualis shell PATH-jat HKLM (Machine) + HKCU (User) regisztribol.
#
# Hasznald, ha kintrol PATH-ot modositottal (pl. install-node-portable.ps1
# vagy installer), de mar nyitva van a terminalod es nem akarsz uj
# ablakot/Cursor restartot.
#
# Hasznalat:
#   . scripts/reload-path.ps1            # DOT-source! Igy az aktualis shell-be tolti vissza.
#   pwsh -ExecutionPolicy Bypass -File scripts/reload-path.ps1   # NEM dot-source = csak a child processznek hasznal.

$machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")

$combined = @($machinePath, $userPath) | Where-Object { $_ } | ForEach-Object { $_ -split ";" } | Where-Object { $_ -ne "" }

# Deduplikalas a sorrend megtartasaval
$seen = @{}
$unique = foreach ($p in $combined) {
    $key = $p.TrimEnd('\').ToLowerInvariant()
    if (-not $seen.ContainsKey($key)) { $seen[$key] = $true; $p }
}

$env:Path = ($unique -join ";")

Write-Host "PATH ujratoltve. $($unique.Count) egyedi bejegyzes." -ForegroundColor Green

# Portable Node.js (zip-bol kicsomagolt) MotW unblock: ha a felhasznalo
# nodejs konyvtaraban .ps1 fajlok vannak Zone.Identifier-rel, levesszuk
# rolat. Nelkule "is not digitally signed" hiba dobodna.
$portableNodeDir = "C:\Users\hevesitr\nodejs\node-v24.15.0-win-x64"
if (Test-Path $portableNodeDir) {
    $blockedScripts = Get-ChildItem -Path "$portableNodeDir\*.ps1" -ErrorAction SilentlyContinue |
        Where-Object { Get-Item $_.FullName -Stream Zone.Identifier -ErrorAction SilentlyContinue }
    if ($blockedScripts) {
        $blockedScripts | Unblock-File
        Write-Host "Unblock-File: $($blockedScripts.Count) Node .ps1 fajl unblockolva (MotW)." -ForegroundColor Green
    }
}

# Quick check a fontosabb dev toolokra
$tools = @("node", "npm", "git", "ollama")
foreach ($t in $tools) {
    $cmd = Get-Command $t -ErrorAction SilentlyContinue
    if ($cmd) {
        Write-Host "  [OK]  $t -> $($cmd.Source)" -ForegroundColor Green
    } else {
        Write-Host "  [--]  $t nincs PATH-on" -ForegroundColor DarkGray
    }
}
