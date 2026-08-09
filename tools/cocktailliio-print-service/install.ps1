$ErrorActionPreference = "Stop"

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ('"' + $MyInvocation.MyCommand.Path + '"'))
    exit
}

$sourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$installDir = Join-Path $env:LOCALAPPDATA "CocktailliioPrintService"
$compiler = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$startupDir = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupDir "Cocktailliio Print Service.lnk"

if (-not (Test-Path -LiteralPath $compiler)) {
    throw "The Windows .NET Framework C# compiler was not found at $compiler."
}

New-Item -ItemType Directory -Path $installDir -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $sourceDir "Program.cs") -Destination (Join-Path $installDir "Program.cs") -Force

& $compiler /nologo /target:winexe /optimize+ /out:"$installDir\CocktailliioPrintService.exe" /reference:System.Web.Extensions.dll "$installDir\Program.cs"
if ($LASTEXITCODE -ne 0) { throw "The local print service could not be compiled." }

$tokenBytes = New-Object byte[] 32
$random = [Security.Cryptography.RandomNumberGenerator]::Create()
$random.GetBytes($tokenBytes)
$random.Dispose()
$token = [Convert]::ToBase64String($tokenBytes)
$config = @{
    Token = $token
    # Add the final HTTPS deployment origin here before installing on production tills.
    AllowedOrigins = @("http://localhost:3000", "http://127.0.0.1:3000")
    Port = 17891
} | ConvertTo-Json
[IO.File]::WriteAllText((Join-Path $installDir "config.json"), $config, (New-Object Text.UTF8Encoding($false)))
[IO.File]::WriteAllText((Join-Path $installDir "token.txt"), $token, (New-Object Text.UTF8Encoding($false)))

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $installDir "CocktailliioPrintService.exe"
$shortcut.WorkingDirectory = $installDir
$shortcut.WindowStyle = 7
$shortcut.Description = "Cocktailliio secure ESC/POS print service"
$shortcut.Save()

& netsh http delete urlacl url=http://127.0.0.1:17891/ 2>$null | Out-Null
& netsh http add urlacl url=http://127.0.0.1:17891/ user="$env:USERDOMAIN\$env:USERNAME" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Could not reserve the loopback service address." }

Get-Process -Name "CocktailliioPrintService" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Process -FilePath (Join-Path $installDir "CocktailliioPrintService.exe") -WorkingDirectory $installDir -WindowStyle Hidden

Write-Host ""
Write-Host "Cocktailliio Print Service installed and started." -ForegroundColor Green
Write-Host "Copy this token into Cocktailliio POS > Settings > POS hardware:"
Write-Host $token -ForegroundColor Yellow
Write-Host ""
Write-Host "Token file: $installDir\token.txt"

