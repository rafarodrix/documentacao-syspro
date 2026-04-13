function Get-ObjectPropertyValue {
    param([object]$Object, [string]$Name)
    if ($null -eq $Object) { return $null }
    if ($Object -is [hashtable]) {
        if ($Object.ContainsKey($Name)) { return $Object[$Name] }
        return $null
    }
    $prop = $Object.PSObject.Properties[$Name]
    if ($null -eq $prop) { return $null }
    return $prop.Value
}

function Get-NestedPropertyValue {
    param([object]$Object, [string[]]$Path)
    $current = $Object
    foreach ($segment in $Path) {
        $current = Get-ObjectPropertyValue -Object $current -Name $segment
        if ($null -eq $current) { return $null }
    }
    return $current
}

function Normalize-ApiData {
    param([object]$Body)
    $data = Get-ObjectPropertyValue -Object $Body -Name "data"
    if ($null -ne $data) { return $data }
    return $Body
}

function Get-DiscoverSummary {
    param([object]$DiscoverData)
    $mode = [string](Get-ObjectPropertyValue -Object $DiscoverData -Name "mode")
    $flow = [string](Get-ObjectPropertyValue -Object $DiscoverData -Name "bootstrapFlow")
    if ([string]::IsNullOrWhiteSpace($flow)) {
        $flow = [string](Get-NestedPropertyValue -Object $DiscoverData -Path @("transition", "bootstrapFlow"))
    }
    $allow = To-Bool (Get-NestedPropertyValue -Object $DiscoverData -Path @("transition", "allowDiscoveryHeartbeat"))
    $nextEndpoint = [string](Get-NestedPropertyValue -Object $DiscoverData -Path @("transition", "nextEndpoint"))
    if ([string]::IsNullOrWhiteSpace($nextEndpoint)) {
        $nextEndpoint = [string](Get-ObjectPropertyValue -Object $DiscoverData -Name "nextEndpoint")
    }
    return [ordered]@{
        mode                    = $mode
        bootstrapFlow           = $flow
        allowDiscoveryHeartbeat = $allow
        nextEndpoint            = $nextEndpoint
    }
}

function Invoke-AgentDiscover {
    param(
        [string]$PortalBaseUrl,
        [hashtable]$Payload
    )
    return Post-JsonWithRetry `
        -Url "$PortalBaseUrl/api/remote/agents/discover" `
        -Payload $Payload `
        -Operation "discover"
}
