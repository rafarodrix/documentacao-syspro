$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$installRoot = Resolve-Path (Join-Path $scriptRoot "..")
$dataRoot = Join-Path $env:ProgramData "Trilink\Agent"
$stateDir = Join-Path $dataRoot "runtime-state"
$logsDir = Join-Path $stateDir "logs"
$configDir = Join-Path $installRoot "config"
$seedEnv = Join-Path $configDir ".env"
$seedEnvExample = Join-Path $configDir ".env.example"
$targetEnv = Join-Path $dataRoot ".env"
$serviceExe = Join-Path $installRoot "agent-service.exe"
$uiExe = Join-Path $installRoot "agent-ui.exe"

New-Item -ItemType Directory -Force -Path $dataRoot | Out-Null
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

if (-not (Test-Path $targetEnv)) {
  if (Test-Path $seedEnv) {
    Copy-Item -LiteralPath $seedEnv -Destination $targetEnv
  } elseif (Test-Path $seedEnvExample) {
    Copy-Item -LiteralPath $seedEnvExample -Destination $targetEnv
  }
}

function Import-AgentEnvFile {
  param([Parameter(Mandatory = $true)][string]$Path)

  Get-Content -Path $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }

    $separatorIndex = $line.IndexOf("=")
    if ($separatorIndex -lt 1) { return }

    $name = $line.Substring(0, $separatorIndex).Trim()
    $value = $line.Substring($separatorIndex + 1).Trim()

    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

function Assert-RequiredEnv {
  param([Parameter(Mandatory = $true)][string]$Name)
  $value = [System.Environment]::GetEnvironmentVariable($Name, "Process")
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Variavel obrigatoria nao configurada: $Name. Edite $targetEnv"
  }
}

if (Test-Path $targetEnv) {
  Import-AgentEnvFile -Path $targetEnv
}

if (-not $env:AGENT_STATE_DIR) {
  $env:AGENT_STATE_DIR = $stateDir
}
if (-not $env:AGENT_IPC_ADDRESS) {
  $env:AGENT_IPC_ADDRESS = "\\.\pipe\trilink-agent-ipc"
}
if (-not $env:AGENT_IPC_TOKEN) {
  $env:AGENT_IPC_TOKEN = [guid]::NewGuid().ToString("N")
}

$bundledRustDeskInstaller =
  (Get-ChildItem -Path (Join-Path $installRoot "rustdesk") -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^rustdesk.*\.msi$' } |
    Select-Object -First 1)
if (-not $bundledRustDeskInstaller) {
  $bundledRustDeskInstaller =
    (Get-ChildItem -Path (Join-Path $installRoot "rustdesk") -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match '^rustdesk.*\.exe$' } |
      Select-Object -First 1)
}
if ($bundledRustDeskInstaller -and -not $env:REMOTE_RUSTDESK_INSTALLER_URL) {
  $env:REMOTE_RUSTDESK_INSTALLER_URL = $bundledRustDeskInstaller.FullName
}
if (-not $env:REMOTE_RUSTDESK_INSTALL_ARGS -and $env:REMOTE_RUSTDESK_INSTALLER_URL) {
  if ($env:REMOTE_RUSTDESK_INSTALLER_URL -match '\.msi(\?|$)') {
    $env:REMOTE_RUSTDESK_INSTALL_ARGS = "/qn /norestart"
  } else {
    $env:REMOTE_RUSTDESK_INSTALL_ARGS = "/S"
  }
}

Assert-RequiredEnv -Name "PORTAL_BASE_URL"
Assert-RequiredEnv -Name "PORTAL_API_KEY"
if (($env:REMOTE_ENABLED ?? "true").ToLowerInvariant() -eq "true") {
  Assert-RequiredEnv -Name "REMOTE_DISCOVERY_TOKEN"
}

if (-not (Get-Process -Name "agent-service" -ErrorAction SilentlyContinue)) {
  Start-Process -FilePath $serviceExe -WindowStyle Hidden
  Start-Sleep -Milliseconds 1200
}

if (-not (Get-Process -Name "agent-ui" -ErrorAction SilentlyContinue)) {
  Start-Process -FilePath $uiExe
}
