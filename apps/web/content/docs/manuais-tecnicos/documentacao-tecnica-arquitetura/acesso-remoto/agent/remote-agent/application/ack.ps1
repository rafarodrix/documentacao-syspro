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

function Should-QueueAckForRetry {
    param($AckResponse)
    if ($null -eq $AckResponse) { return $true }
    $statusCode = $AckResponse.statusCode
    if ($null -eq $statusCode) { return $true }
    if ($statusCode -eq 429) { return $true }
    if ($statusCode -ge 500) { return $true }
    return $false
}

function Add-PendingAckToState {
    param(
        [hashtable]$State,
        [hashtable]$AckPayload,
        [int]$MaxQueueItems = 20
    )

    $queue = @(Normalize-StateArrayValue -Value $State.pendingAckQueue)
    $payloadCopy = [ordered]@{
        schemaVersion = [string]$AckPayload.schemaVersion
        agentToken    = [string]$AckPayload.agentToken
        commandId     = [string]$AckPayload.commandId
        status        = [string]$AckPayload.status
        reasonCode    = [string]$AckPayload.reasonCode
        message       = [string]$AckPayload.message
        details       = $AckPayload.details
        enqueuedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    }
    $queue += ,$payloadCopy
    if (@($queue).Count -gt $MaxQueueItems) {
        $queue = @($queue | Select-Object -Last $MaxQueueItems)
    }
    $State.pendingAckQueue = @($queue)
}

function Flush-PendingAckQueue {
    param(
        [hashtable]$State,
        [string]$PortalBaseUrl,
        [string]$AgentToken
    )

    $queue = @(Normalize-StateArrayValue -Value $State.pendingAckQueue)
    if (@($queue).Count -eq 0) {
        return [ordered]@{ sent = 0; failed = 0; remaining = 0 }
    }
    if ([string]::IsNullOrWhiteSpace($AgentToken)) {
        return [ordered]@{ sent = 0; failed = 0; remaining = @($queue).Count }
    }

    $sent = 0
    $failed = 0
    $remaining = @()

    foreach ($item in $queue) {
        $payload = [ordered]@{
            schemaVersion = "ack.payload.v1"
            agentToken    = $AgentToken
            commandId     = [string](Get-ObjectPropertyValue -Object $item -Name "commandId")
            status        = [string](Get-ObjectPropertyValue -Object $item -Name "status")
            reasonCode    = [string](Get-ObjectPropertyValue -Object $item -Name "reasonCode")
            message       = [string](Get-ObjectPropertyValue -Object $item -Name "message")
            details       = (Get-ObjectPropertyValue -Object $item -Name "details")
        }

        if ([string]::IsNullOrWhiteSpace($payload.commandId)) { continue }
        if ([string]::IsNullOrWhiteSpace($payload.status)) { continue }

        $ack = Invoke-AgentAck -PortalBaseUrl $PortalBaseUrl -Payload $payload
        if ($ack.ok) {
            $sent += 1
            continue
        }

        $failed += 1
        if ($ack.statusCode -eq 401 -or $ack.statusCode -eq 403) {
            $State.agentToken = ""
            $State.rebootstrapRequired = $true
            $remaining += ,$item
            continue
        }

        if (Should-QueueAckForRetry -AckResponse $ack) {
            $remaining += ,$item
        }
    }

    $State.pendingAckQueue = @($remaining)
    return [ordered]@{
        sent = $sent
        failed = $failed
        remaining = @($remaining).Count
    }
}
