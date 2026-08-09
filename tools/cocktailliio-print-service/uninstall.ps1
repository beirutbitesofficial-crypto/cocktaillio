$ErrorActionPreference = "Stop"
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ('"' + $MyInvocation.MyCommand.Path + '"'))
    exit
}
$installDir = Join-Path $env:LOCALAPPDATA "CocktailliioPrintService"
$shortcutPath = Join-Path ([Environment]::GetFolderPath("Startup")) "Cocktailliio Print Service.lnk"

Get-Process -Name "CocktailliioPrintService" -ErrorAction SilentlyContinue | Stop-Process -Force
& netsh http delete urlacl url=http://127.0.0.1:17891/ 2>$null | Out-Null
if (Test-Path -LiteralPath $shortcutPath) { Remove-Item -LiteralPath $shortcutPath -Force }
if (Test-Path -LiteralPath $installDir) {
    $resolved = (Resolve-Path -LiteralPath $installDir).Path
    $expected = Join-Path $env:LOCALAPPDATA "CocktailliioPrintService"
    if ($resolved -ne $expected) { throw "Refusing to remove unexpected path: $resolved" }
    Remove-Item -LiteralPath $resolved -Recurse -Force
}
Write-Host "Cocktailliio Print Service removed." -ForegroundColor Green


