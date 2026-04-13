$ModuleRoot = Split-Path -Parent $PSScriptRoot

function Import-AgentModuleIfExists {
    param([Parameter(Mandatory = $true)][string]$RelativePath)

    $fullPath = Join-Path $ModuleRoot $RelativePath
    if (Test-Path -LiteralPath $fullPath) {
        . $fullPath
        return $true
    }

    Write-Verbose "Modulo nao encontrado (skip): $RelativePath"
    return $false
}

# Fase 1 (disponivel agora)
$phase1Modules = @(
    "core/paths.ps1",
    "core/config.ps1",
    "core/utils.ps1",
    "core/logging.ps1",
    "core/lock.ps1",
    "core/state.ps1",
    "core/metrics.ps1",
    "core/tls.ps1",
    "infra/registry.ps1",
    "infra/http.ps1",
    "infra/files.ps1",
    "providers/rustdesk.ps1",
    "providers/syspro.ps1",
    "providers/system.ps1"
)

# Fases seguintes (arquivos podem ainda nao existir; import condicional)
$nextPhaseModules = @(
    "providers/network.ps1",
    "providers/software.ps1",
    "providers/hardware.ps1",
    "providers/windows-update.ps1",
    "providers/processes.ps1",
    "providers/disks.ps1",
    "application/discover.ps1",
    "application/bootstrap.ps1",
    "application/sync.ps1",
    "application/ack.ps1",
    "application/commands.ps1",
    "application/health.ps1"
)

foreach ($module in ($phase1Modules + $nextPhaseModules)) {
    Import-AgentModuleIfExists -RelativePath $module | Out-Null
}
