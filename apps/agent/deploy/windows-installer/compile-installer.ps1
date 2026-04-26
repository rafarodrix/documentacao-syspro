param(
  [string]$Version = ""
)

$ErrorActionPreference = "Stop"

$root       = Split-Path -Parent $MyInvocation.MyCommand.Path
$issFile    = Join-Path $root "AgenteTrilink.iss"
$packScript = Join-Path $root "build-installer-package.ps1"

if (-not (Test-Path $issFile)) {
  throw "Arquivo .iss nao encontrado: $issFile"
}
if (-not (Test-Path $packScript)) {
  throw "Script de empacotamento nao encontrado: $packScript"
}

# Resolve versao: parametro > git tag > fallback
if (-not $Version) {
  try {
    $tag = git -C $root describe --tags --match "v*" --abbrev=0 2>$null
    if ($tag -match '^v?(\d+\.\d+\.\d+)') {
      $Version = $Matches[1]
    }
  } catch {}
}
if (-not $Version) { $Version = "1.0.0" }

Write-Host "Versao do instalador: $Version"
Write-Host "Montando pacote de staging..."
& powershell -ExecutionPolicy Bypass -File $packScript

$candidates = @(
  "C:\Program Files (x86)\Inno Setup 7\ISCC.exe",
  "C:\Program Files\Inno Setup 7\ISCC.exe",
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
& $iscc "/DMyAppVersion=$Version" $issFile

$agentRoot  = Resolve-Path (Join-Path $root "..\..")
$outputDir  = Join-Path $agentRoot "dist\windows-installer\output"
Write-Host ""
Write-Host "Instalador gerado em: $outputDir\agente-trilink-setup-$Version.exe"
