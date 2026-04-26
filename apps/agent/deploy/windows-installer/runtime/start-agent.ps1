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

function Initialize-ServiceConfig {
  New-Item -ItemType Directory -Force -Path $dataRoot | Out-Null
  if ((Test-Path $sourceEnv) -and -not (Test-Path $targetEnv)) {
    Copy-Item -LiteralPath $sourceEnv -Destination $targetEnv -Force
  }
}

function Get-EnvValueFromFile {
  param(
    [string]$Path,
    [string]$Key
  )

  if (-not (Test-Path $Path)) {
    return $null
  }

  foreach ($line in Get-Content -Path $Path -ErrorAction SilentlyContinue) {
    if ($line -match '^\s*#') {
      continue
    }

    $parts = $line -split '=', 2
    if ($parts.Count -ne 2) {
      continue
    }

    if ($parts[0].Trim() -eq $Key) {
      return $parts[1].Trim().Trim("'`"")
    }
  }

  return $null
}

function Wait-AgentIPCReady {
  $ipcAddress = Get-EnvValueFromFile -Path $targetEnv -Key "AGENT_IPC_ADDRESS"
  if ([string]::IsNullOrWhiteSpace($ipcAddress)) {
    $ipcAddress = "\\.\pipe\trilink-agent-ipc"
  }

  if ($ipcAddress -notlike "\\.\pipe\*") {
    Start-Sleep -Seconds 3
    return
  }

  $pipeName = $ipcAddress.Substring("\\.\pipe\".Length)
  for ($attempt = 1; $attempt -le 20; $attempt++) {
    try {
      $pipe = New-Object System.IO.Pipes.NamedPipeClientStream(".", $pipeName, [System.IO.Pipes.PipeDirection]::InOut)
      try {
        $pipe.Connect(500)
        if ($pipe.IsConnected) {
          $pipe.Dispose()
          return
        }
      } finally {
        if ($null -ne $pipe) {
          $pipe.Dispose()
        }
      }
    } catch {
    }

    Start-Sleep -Milliseconds 500
  }

  Start-Sleep -Seconds 2
}

function Start-AgentServiceRuntime {
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
  }

  for ($attempt = 1; $attempt -le 15; $attempt++) {
    $svc = Get-Service -Name "TrillinkAgent" -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -eq "Running") {
      Wait-AgentIPCReady
      return
    }
    Start-Sleep -Seconds 1
  }

  throw "Servico TrillinkAgent nao entrou em estado Running a tempo."
}

if ($BootstrapServiceOnly) {
  Initialize-ServiceConfig
  Start-AgentServiceRuntime
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
    Initialize-ServiceConfig
    Start-AgentServiceRuntime
  }
}

if (-not (Get-Process -Name "agent-ui" -ErrorAction SilentlyContinue)) {
  Start-Process -FilePath $uiExe
}
