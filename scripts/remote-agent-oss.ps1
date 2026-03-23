param(
  [Parameter(Mandatory = $true)]
  [string]$PortalBaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$InstallToken,

  [string]$RustDeskId,
  [string]$MachineName = $env:COMPUTERNAME,
  [string]$AgentVersion = "rustdesk-oss-local",
  [string]$Environment,
  [switch]$HeartbeatOnly,
  [switch]$InstallScheduledTask,
  [string]$TaskName = "TrilinkRemoteAgentHeartbeat",
  [int]$HeartbeatIntervalMinutes = 5
)

$ErrorActionPreference = "Stop"

function Normalize-RustDeskId {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $null
  }

  return (($Value -replace "\s+", "").Trim())
}

function Invoke-RemotePortalEndpoint {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url,

    [Parameter(Mandatory = $true)]
    [hashtable]$Body
  )

  $jsonBody = $Body | ConvertTo-Json -Depth 6
  return Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body $jsonBody
}

function Install-RemoteAgentScheduledTask {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PortalBaseUrlValue,

    [Parameter(Mandatory = $true)]
    [string]$InstallTokenValue,

    [string]$RustDeskIdValue,
    [string]$MachineNameValue,
    [string]$AgentVersionValue,
    [string]$EnvironmentValue,
    [string]$TaskNameValue,
    [int]$HeartbeatIntervalMinutesValue
  )

  $scriptPath = $PSCommandPath
  if ([string]::IsNullOrWhiteSpace($scriptPath)) {
    throw "Nao foi possivel resolver o caminho do script atual para instalar a tarefa agendada."
  }

  $argumentParts = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", ('"{0}"' -f $scriptPath),
    "-PortalBaseUrl", ('"{0}"' -f $PortalBaseUrlValue),
    "-InstallToken", ('"{0}"' -f $InstallTokenValue),
    "-MachineName", ('"{0}"' -f $MachineNameValue),
    "-AgentVersion", ('"{0}"' -f $AgentVersionValue),
    "-HeartbeatOnly"
  )

  if (-not [string]::IsNullOrWhiteSpace($RustDeskIdValue)) {
    $argumentParts += @("-RustDeskId", ('"{0}"' -f $RustDeskIdValue))
  }

  if (-not [string]::IsNullOrWhiteSpace($EnvironmentValue)) {
    $argumentParts += @("-Environment", ('"{0}"' -f $EnvironmentValue))
  }

  $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument ($argumentParts -join " ")
  $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1)
  $trigger.RepetitionInterval = "PT{0}M" -f $HeartbeatIntervalMinutesValue
  $trigger.RepetitionDuration = "P1D"
  $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

  Register-ScheduledTask -TaskName $TaskNameValue -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
  Write-Host "Tarefa agendada instalada: $TaskNameValue"
}

$normalizedPortalBaseUrl = $PortalBaseUrl.TrimEnd("/")
$normalizedInstallToken = $InstallToken.Trim()
$normalizedRustDeskId = Normalize-RustDeskId -Value $RustDeskId

$registerPayload = @{
  installToken = $normalizedInstallToken
  rustdeskId = $normalizedRustDeskId
  machineName = $MachineName
  agentVersion = $AgentVersion
  environment = $Environment
}

$heartbeatPayload = @{
  installToken = $normalizedInstallToken
  rustdeskId = $normalizedRustDeskId
  machineName = $MachineName
  agentVersion = $AgentVersion
}

if (-not $HeartbeatOnly) {
  $registerUrl = "$normalizedPortalBaseUrl/api/remote/agents/register"
  Write-Host "Registrando agente no portal: $registerUrl"
  $registerResult = Invoke-RemotePortalEndpoint -Url $registerUrl -Body $registerPayload
  Write-Host "Registro concluido."
  $registerResult | ConvertTo-Json -Depth 6
}

$heartbeatUrl = "$normalizedPortalBaseUrl/api/remote/agents/heartbeat"
Write-Host "Enviando heartbeat para: $heartbeatUrl"
$heartbeatResult = Invoke-RemotePortalEndpoint -Url $heartbeatUrl -Body $heartbeatPayload
Write-Host "Heartbeat concluido."
$heartbeatResult | ConvertTo-Json -Depth 6

if ($InstallScheduledTask) {
  Install-RemoteAgentScheduledTask `
    -PortalBaseUrlValue $normalizedPortalBaseUrl `
    -InstallTokenValue $normalizedInstallToken `
    -RustDeskIdValue $normalizedRustDeskId `
    -MachineNameValue $MachineName `
    -AgentVersionValue $AgentVersion `
    -EnvironmentValue $Environment `
    -TaskNameValue $TaskName `
    -HeartbeatIntervalMinutesValue $HeartbeatIntervalMinutes
}
