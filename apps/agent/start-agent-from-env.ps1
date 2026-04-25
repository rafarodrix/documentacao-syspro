$ErrorActionPreference = "Stop"

$agentRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $agentRoot ".env"
$deployScript = Join-Path $agentRoot "dist\test-deploy\windows-amd64\start-test-agent.ps1"

if (-not (Test-Path $envFile)) {
  throw "Arquivo nao encontrado: $envFile"
}

if (-not (Test-Path $deployScript)) {
  throw "Arquivo nao encontrado: $deployScript"
}

function Import-AgentEnvFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  Get-Content -Path $Path | ForEach-Object {
    $line = $_.Trim()

    if (-not $line) {
      return
    }

    if ($line.StartsWith("#")) {
      return
    }

    $separatorIndex = $line.IndexOf("=")
    if ($separatorIndex -lt 1) {
      return
    }

    $name = $line.Substring(0, $separatorIndex).Trim()
    $value = $line.Substring($separatorIndex + 1).Trim()

    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

Write-Host "Carregando configuracao do agente a partir de $envFile"
Import-AgentEnvFile -Path $envFile

Write-Host "Executando deploy local do agente com variaveis carregadas..."
& $deployScript
