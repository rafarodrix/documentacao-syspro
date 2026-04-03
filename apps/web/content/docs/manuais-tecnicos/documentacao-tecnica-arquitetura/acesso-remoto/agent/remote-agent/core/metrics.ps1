function New-AgentMetrics {
    param(
        [System.Diagnostics.Stopwatch]$CycleStopwatch,
        [hashtable]$PhaseTimings,
        [hashtable]$SelfHeal,
        [string]$ScriptVersion,
        [string]$OrchestrationStrategy,
        [bool]$BootstrapTriggered,
        [hashtable]$BootstrapRate24h,
        [hashtable]$SchemaVersions,
        [int]$PendingAckQueueSize,
        [hashtable]$AckQueueFlush,
        [string]$LastBootstrapFlow,
        [string]$LastContractErrorCode
    )
    return [ordered]@{
        cycleElapsedMs    = [int]$CycleStopwatch.ElapsedMilliseconds
        phaseTimings      = $PhaseTimings
        psVersion         = [string]$PSVersionTable.PSVersion.ToString()
        scriptVersion     = [string]$ScriptVersion
        orchestrationStrategy = [string]$OrchestrationStrategy
        bootstrapTriggered   = [bool]$BootstrapTriggered
        bootstrapRate24h     = $BootstrapRate24h
        schemaVersions       = $SchemaVersions
        pendingAckQueueSize  = [int]$PendingAckQueueSize
        ackQueueFlush        = $AckQueueFlush
        lastBootstrapFlow    = [string]$LastBootstrapFlow
        lastContractErrorCode = [string]$LastContractErrorCode
        selfHealAttempted = [bool]$SelfHeal.selfHealAttempted
        selfHealResult    = [string]$SelfHeal.selfHealResult
    }
}

function Apply-StartupJitter {
    param([int]$MaxSeconds = 60)
    if ($MaxSeconds -le 0) { return }
    $delay = Get-Random -Minimum 0 -Maximum ($MaxSeconds + 1)
    if ($delay -le 0) { return }
    Write-Log "Jitter inicial aplicado: aguardando ${delay}s antes do ciclo."
    Start-Sleep -Seconds $delay
}

function Get-PersistentBackoffSeconds {
    param([int]$ConsecutiveFailures)
    if ($ConsecutiveFailures -le 0) { return 0 }
    $steps = @(0, 10, 20, 40, 60, 90)
    $idx = [Math]::Min($ConsecutiveFailures, $steps.Count - 1)
    return [int]$steps[$idx]
}

function Assert-PhaseWatchdog {
    param(
        [string]$PhaseName,
        [int]$ElapsedMs,
        [int]$MaxMs
    )
    if ($MaxMs -le 0) { return }
    if ($ElapsedMs -le $MaxMs) { return }
    $phaseCode = if ([string]::IsNullOrWhiteSpace($PhaseName)) {
        "UNKNOWN"
    } else {
        $PhaseName.ToUpperInvariant()
    }
    throw "PHASE_TIMEOUT_${phaseCode}"
}
