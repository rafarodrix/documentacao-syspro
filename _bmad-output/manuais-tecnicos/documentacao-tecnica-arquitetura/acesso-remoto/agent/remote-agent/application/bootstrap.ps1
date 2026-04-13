function Invoke-AgentBootstrap {
    param(
        [string]$PortalBaseUrl,
        [hashtable]$Payload
    )
    return Post-JsonWithRetry `
        -Url "$PortalBaseUrl/api/remote/rustdesk/bootstrap" `
        -Payload $Payload `
        -Operation "bootstrap"
}
