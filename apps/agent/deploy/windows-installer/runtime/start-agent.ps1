param(
  [switch]$BootstrapServiceOnly
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$installRoot = Resolve-Path (Join-Path $scriptRoot "..")
$uiExe = Join-Path $installRoot "agent-ui.exe"
$serviceExe = Join-Path $installRoot "agent-service.exe"
$dataRoot = Join-Path $env:ProgramData "Trilink\Agent"
$sourceEnv = Join-Path $installRoot "config\.env"
$targetEnv = Join-Path $dataRoot ".env"

function Test-IsAdministrator {
  $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Ensure-ServiceConfig {
  New-Item -ItemType Directory -Force -Path $dataRoot | Out-Null
  if ((Test-Path $sourceEnv) -and -not (Test-Path $targetEnv)) {
    Copy-Item -LiteralPath $sourceEnv -Destination $targetEnv -Force
  }
}

function Ensure-ServiceInstalledAndRunning {
  $svc = Get-Service -Name "TrillinkAgent" -ErrorAction SilentlyContinue
  if (-not $svc) {
    & $serviceExe install
    $svc = Get-Service -Name "TrillinkAgent" -ErrorAction SilentlyContinue
  }

  if (-not $svc) {
    throw "Nao foi possivel registrar o servico TrillinkAgent."
  }

  if ($svc.Status -ne "Running") {
    & $serviceExe start
    Start-Sleep -Milliseconds 1000
  }
}

if ($BootstrapServiceOnly) {
  Ensure-ServiceConfig
  Ensure-ServiceInstalledAndRunning
  exit 0
}

$svc = Get-Service -Name "TrillinkAgent" -ErrorAction SilentlyContinue
if (-not $svc -or $svc.Status -ne "Running") {
  if (-not (Test-IsAdministrator)) {
    Start-Process powershell -Verb RunAs -Wait -ArgumentList @(
      "-ExecutionPolicy", "Bypass",
      "-File", "`"$PSCommandPath`"",
      "-BootstrapServiceOnly"
    )
  } else {
    Ensure-ServiceConfig
    Ensure-ServiceInstalledAndRunning
  }
}

if (-not (Get-Process -Name "agent-ui" -ErrorAction SilentlyContinue)) {
  Start-Process -FilePath $uiExe
}
