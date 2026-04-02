function New-DefaultState {
    return @{
        agentToken            = ""
        hostId                = ""
        rebootstrapRequired   = $false
        lastSysproHash        = ""
        lastSoftwareHash      = ""
        lastSystemHash        = ""
        lastNetworkHash       = ""
        lastSoftwareScanUtc   = ""
        lastSystemSnapshotUtc = ""
        lastFullSnapshotDate  = ""
        consecutiveFailures   = 0
        lastScriptHash        = ""   # FIX: detectar atualizacao do script entre ciclos
    }
}

function Load-AgentState {
    Ensure-StateDir
    if (-not (Test-Path $StateFile)) { return New-DefaultState }
    try {
        $raw = Get-Content -Raw -Path $StateFile
        $obj = $raw | ConvertFrom-Json
        $state = New-DefaultState
        if ($null -ne $obj.agentToken)            { $state.agentToken            = [string]$obj.agentToken }
        if ($null -ne $obj.hostId)                { $state.hostId                = [string]$obj.hostId }
        if ($null -ne $obj.rebootstrapRequired)   { $state.rebootstrapRequired   = To-Bool $obj.rebootstrapRequired }
        if ($null -ne $obj.lastSysproHash)        { $state.lastSysproHash        = [string]$obj.lastSysproHash }
        if ($null -ne $obj.lastSoftwareHash)      { $state.lastSoftwareHash      = [string]$obj.lastSoftwareHash }
        if ($null -ne $obj.lastSystemHash)        { $state.lastSystemHash        = [string]$obj.lastSystemHash }
        if ($null -ne $obj.lastNetworkHash)       { $state.lastNetworkHash       = [string]$obj.lastNetworkHash }
        if ($null -ne $obj.lastSoftwareScanUtc)   { $state.lastSoftwareScanUtc   = [string]$obj.lastSoftwareScanUtc }
        if ($null -ne $obj.lastSystemSnapshotUtc) { $state.lastSystemSnapshotUtc = [string]$obj.lastSystemSnapshotUtc }
        if ($null -ne $obj.lastFullSnapshotDate)  { $state.lastFullSnapshotDate  = [string]$obj.lastFullSnapshotDate }
        if ($null -ne $obj.lastScriptHash)        { $state.lastScriptHash        = [string]$obj.lastScriptHash }
        if ($null -ne $obj.consecutiveFailures) {
            $failures = 0
            [int]::TryParse([string]$obj.consecutiveFailures, [ref]$failures) | Out-Null
            $state.consecutiveFailures = [Math]::Max(0, $failures)
        }
        return $state
    } catch {
        Write-Log "Falha ao ler estado local. Estado reiniciado."
        return New-DefaultState
    }
}

function Save-AgentState {
    param([hashtable]$State)
    Ensure-StateDir
    $payload = [ordered]@{
        agentToken            = [string]$State.agentToken
        hostId                = [string]$State.hostId
        rebootstrapRequired   = [bool]$State.rebootstrapRequired
        lastSysproHash        = [string]$State.lastSysproHash
        lastSoftwareHash      = [string]$State.lastSoftwareHash
        lastSystemHash        = [string]$State.lastSystemHash
        lastNetworkHash       = [string]$State.lastNetworkHash
        lastSoftwareScanUtc   = [string]$State.lastSoftwareScanUtc
        lastSystemSnapshotUtc = [string]$State.lastSystemSnapshotUtc
        lastFullSnapshotDate  = [string]$State.lastFullSnapshotDate
        consecutiveFailures   = [int]$State.consecutiveFailures
        lastScriptHash        = [string]$State.lastScriptHash
        updatedAtUtc          = (Get-Date).ToUniversalTime().ToString("o")
    }
    $payload | ConvertTo-Json -Depth 10 | Set-Content -Path $StateFile -Encoding utf8
}

function Is-RefreshDue {
    param([string]$LastTimestampUtc, [int]$WindowMinutes)
    if ($WindowMinutes -le 0) { return $true }
    if ([string]::IsNullOrWhiteSpace($LastTimestampUtc)) { return $true }
    $parsed = [DateTime]::MinValue
    if (-not [DateTime]::TryParse([string]$LastTimestampUtc, [ref]$parsed)) { return $true }
    $elapsed = (Get-Date).ToUniversalTime() - $parsed.ToUniversalTime()
    return ($elapsed.TotalMinutes -ge $WindowMinutes)
}

function Mark-FailureAndSave {
    param([hashtable]$State)
    $State.consecutiveFailures = [int]$State.consecutiveFailures + 1
    Save-AgentState -State $State
}
