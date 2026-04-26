$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$installRoot = Resolve-Path (Join-Path $scriptRoot "..")
$uiExe = Join-Path $installRoot "agent-ui.exe"

# Em modo enterprise o servico TrillinkAgent roda como LocalSystem e inicia
# automaticamente com o Windows. Este script garante que esta rodando e abre a UI.
$svc = Get-Service -Name "TrillinkAgent" -ErrorAction SilentlyContinue
if ($svc) {
  if ($svc.Status -ne "Running") {
    Start-Service -Name "TrillinkAgent" -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800
  }
} else {
  # Fallback: modo desenvolvimento sem servico instalado.
  # Carrega .env manualmente e inicia agent-service.exe em modo debug.
  $serviceExe = Join-Path $installRoot "agent-service.exe"
  $dataRoot = Join-Path $env:ProgramData "Trilink\Agent"
  $targetEnv = Join-Path $dataRoot ".env"

  function Import-AgentEnvFile {
    param([string]$Path)
    Get-Content -Path $Path -ErrorAction SilentlyContinue | ForEach-Object {
      $line = $_.Trim()
      if (-not $line -or $line.StartsWith("#")) { return }
      $sep = $line.IndexOf("=")
      if ($sep -lt 1) { return }
      $name = $line.Substring(0, $sep).Trim()
      $value = $line.Substring($sep + 1).Trim()
      if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
      }
      [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
  }

  if (Test-Path $targetEnv) {
    Import-AgentEnvFile -Path $targetEnv
  }

  if (-not $env:AGENT_IPC_TOKEN) {
    $env:AGENT_IPC_TOKEN = [guid]::NewGuid().ToString("N")
  }

  if (-not (Get-Process -Name "agent-service" -ErrorAction SilentlyContinue)) {
    Start-Process -FilePath $serviceExe -ArgumentList "debug" -WindowStyle Hidden
    Start-Sleep -Milliseconds 1200
  }
}

# Inicia a interface (tray) na sessao do usuario atual
if (-not (Get-Process -Name "agent-ui" -ErrorAction SilentlyContinue)) {
  Start-Process -FilePath $uiExe
}
