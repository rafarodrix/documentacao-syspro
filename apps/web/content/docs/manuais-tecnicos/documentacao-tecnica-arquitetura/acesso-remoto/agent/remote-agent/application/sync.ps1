function New-AgentSyncPayload {
    param(
        [string]$AgentToken,
        [string]$RustDeskId,
        [string]$AgentVersion,
        [string]$ServiceStatus,
        [array]$SysproUpdates,
        [object]$SystemSnapshot,
        [object]$NetworkSnapshot,
        [array]$SoftwareSnapshot,
        [object]$HardwareIdentity,
        [array]$DiskSnapshot,
        [array]$SysproProcesses,
        [object]$WindowsUpdateStatus,
        [object]$AgentMetrics
    )

    return @{
        agentToken          = $AgentToken
        rustdeskId          = $RustDeskId
        machineName         = $env:COMPUTERNAME
        agentVersion        = $AgentVersion
        serviceStatus       = $ServiceStatus
        sysproUpdates       = $SysproUpdates
        systemSnapshot      = $SystemSnapshot
        networkSnapshot     = $NetworkSnapshot
        softwareSnapshot    = $SoftwareSnapshot
        hardwareIdentity    = $HardwareIdentity
        diskSnapshot        = $DiskSnapshot
        sysproProcesses     = $SysproProcesses
        windowsUpdateStatus = $WindowsUpdateStatus
        rebootPending       = $WindowsUpdateStatus.rebootRequired
        agentMetrics        = $AgentMetrics
    }
}

function Invoke-AgentSync {
    param(
        [string]$PortalBaseUrl,
        [hashtable]$Payload
    )
    return Post-JsonWithRetry `
        -Url "$PortalBaseUrl/api/remote/rustdesk/sync" `
        -Payload $Payload `
        -Operation "sync"
}
