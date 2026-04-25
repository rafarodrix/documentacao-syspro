$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$issFile = Join-Path $root "AgenteTrilink.iss"
$packScript = Join-Path $root "build-installer-package.ps1"

if (-not (Test-Path $issFile)) {
  throw "Arquivo .iss nao encontrado: $issFile"
}

if (-not (Test-Path $packScript)) {
  throw "Script de empacotamento nao encontrado: $packScript"
}

Write-Host "Montando pacote de staging do instalador..."
& powershell -ExecutionPolicy Bypass -File $packScript

$candidates = @(
  "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
  "C:\Program Files\Inno Setup 6\ISCC.exe",
  "C:\Program Files (x86)\Inno Setup 5\ISCC.exe",
  "C:\Program Files\Inno Setup 5\ISCC.exe"
)

$iscc = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $iscc) {
  throw "ISCC.exe nao encontrado. Instale o Inno Setup 6 e rode novamente."
}

Write-Host "Compilando instalador com: $iscc"
& $iscc $issFile

Write-Host ""
Write-Host "Instalador gerado em:"
Write-Host "  C:\DEV\documentacao-syspro\apps\agent\dist\windows-installer\output"
