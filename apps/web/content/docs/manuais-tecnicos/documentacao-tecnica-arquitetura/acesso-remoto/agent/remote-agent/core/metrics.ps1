function New-AgentMetrics {
    param(
        [System.Diagnostics.Stopwatch]$CycleStopwatch,
        [hashtable]$PhaseTimings,
        [hashtable]$SelfHeal,
        [string]$ScriptVersion,
        [string]$OrchestrationStrategy
    )
    return [ordered]@{
        cycleElapsedMs    = [int]$CycleStopwatch.ElapsedMilliseconds
        phaseTimings      = $PhaseTimings
        psVersion         = [string]$PSVersionTable.PSVersion.ToString()
        scriptVersion     = [string]$ScriptVersion
        orchestrationStrategy = [string]$OrchestrationStrategy
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
