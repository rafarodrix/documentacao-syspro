function Extract-CommandQueue {
    param([object]$SyncData)
    $raw = Get-ObjectPropertyValue -Object $SyncData -Name "commandQueue"
    if ($null -eq $raw) { return @() }
    $queue = @()
    if (($raw -is [System.Collections.IEnumerable]) -and (-not ($raw -is [string]))) {
        foreach ($cmd in $raw) { $queue += ,$cmd }
        return $queue
    }
    $queue += ,$raw
    return $queue
}

function Resolve-AgentCommandId {
    param([object]$Command)
    $commandId = [string](Get-ObjectPropertyValue -Object $Command -Name "id")
    if ([string]::IsNullOrWhiteSpace($commandId)) {
        $commandId = [string](Get-ObjectPropertyValue -Object $Command -Name "commandId")
    }
    return $commandId
}

function Invoke-AgentAck {
    param(
        [string]$PortalBaseUrl,
        [hashtable]$Payload
    )
    return Post-JsonWithRetry `
        -Url "$PortalBaseUrl/api/remote/rustdesk/ack" `
        -Payload $Payload `
        -Operation "ack"
}
