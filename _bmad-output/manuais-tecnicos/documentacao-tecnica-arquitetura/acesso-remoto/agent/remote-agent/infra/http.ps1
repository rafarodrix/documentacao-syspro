function Get-HttpStatusCodeFromException {
    param([System.Exception]$Exception)
    if ($null -eq $Exception) { return $null }
    if ($Exception.PSObject.Properties.Match("Response").Count -eq 0) { return $null }
    if ($null -eq $Exception.Response) { return $null }
    if ($Exception.Response.PSObject.Properties.Match("StatusCode").Count -eq 0) { return $null }
    $statusCode = $Exception.Response.StatusCode
    if ($statusCode -is [int]) { return $statusCode }
    if ($statusCode.PSObject.Properties.Match("value__").Count -gt 0) {
        return [int]$statusCode.value__
    }
    return $null
}

function ConvertFrom-JsonSafe {
    param([string]$Text)
    if ([string]::IsNullOrWhiteSpace($Text)) { return $null }
    try { return $Text | ConvertFrom-Json } catch { return $null }
}


function Get-HttpRetryProfile {
    param([string]$Operation)
    $op = if ([string]::IsNullOrWhiteSpace($Operation)) { "http" } else { $Operation.ToLowerInvariant() }
    switch ($op) {
        "ack" { return [ordered]@{ maxAttempts = 3; timeoutSec = 20; maxStatusRetries = 2; maxNetworkRetries = 2 } }
        "discover" { return [ordered]@{ maxAttempts = 4; timeoutSec = 25; maxStatusRetries = 3; maxNetworkRetries = 3 } }
        "bootstrap" { return [ordered]@{ maxAttempts = 4; timeoutSec = 30; maxStatusRetries = 3; maxNetworkRetries = 3 } }
        "sync" { return [ordered]@{ maxAttempts = 4; timeoutSec = 30; maxStatusRetries = 3; maxNetworkRetries = 3 } }
        default { return [ordered]@{ maxAttempts = 4; timeoutSec = 25; maxStatusRetries = 3; maxNetworkRetries = 3 } }
    }
}
function Post-JsonWithRetry {
    param(
        [string]$Url,
        [hashtable]$Payload,
        [int]$MaxAttempts = 4,
        [string]$Operation = "http"
    )
        $profile = Get-HttpRetryProfile -Operation $Operation
    if ($MaxAttempts -le 0) {
        $MaxAttempts = [int]$profile.maxAttempts
    }
    $timeoutSec = [int]$profile.timeoutSec
    $maxStatusRetries = [int]$profile.maxStatusRetries
    $maxNetworkRetries = [int]$profile.maxNetworkRetries
    $statusRetryCount = 0
    $networkRetryCount = 0

    $json       = $Payload | ConvertTo-Json -Depth 20
    $jsonBytes  = [System.Text.Encoding]::UTF8.GetByteCount($json)
    $backoffSeconds = @(0, 3, 10, 25)
    $headers = @{
        "Accept"          = "application/json"
        "Accept-Encoding" = "gzip, deflate"
        "Cache-Control"   = "no-cache"
    }
    Write-Log "http request op=$Operation url=$Url payloadBytes=$jsonBytes maxAttempts=$MaxAttempts"

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            $response = Invoke-WebRequest `
                -Method Post `
                -Uri $Url `
                -Headers $headers `
                -ContentType "application/json; charset=utf-8" `
                -Body $json `
                -TimeoutSec $timeoutSec `
                -UseBasicParsing

            $statusCode  = [int]$response.StatusCode
            $body        = ConvertFrom-JsonSafe -Text ([string]$response.Content)
            $statusClass = [math]::Floor($statusCode / 100)
            $bodyKeys    = Get-TopLevelKeys -Object $body
            Write-Log "http response op=$Operation status=$statusCode attempt=$attempt/$MaxAttempts bodyKeys=$bodyKeys"

            if ($statusClass -eq 2) {
                if ($null -eq $body) {
                    $raw         = [string]$response.Content
                    $preview     = if ($raw.Length -gt 220) { $raw.Substring(0, 220) } else { $raw }
                    $preview     = $preview -replace "(\r|\n)+", " "
                    $contentType = [string]$response.Headers["Content-Type"]
                    Write-Log "http response op=$Operation body_parse_failed contentType=$contentType preview=$preview"
                    if ($attempt -lt $MaxAttempts) {
                        Start-Sleep -Seconds 2
                        continue
                    }
                    return [ordered]@{ ok = $false; statusCode = $statusCode; body = $null; error = "BODY_PARSE_FAILED"; attempts = $attempt }
                }
                return [ordered]@{ ok = $true; statusCode = $statusCode; body = $body; error = ""; attempts = $attempt }
            }

                        $shouldRetry = (($statusCode -eq 429) -or ($statusCode -ge 500))
            if ($shouldRetry -and $attempt -lt $MaxAttempts -and $statusRetryCount -lt $maxStatusRetries) {
                $statusRetryCount += 1
                $baseSleep = $backoffSeconds[[Math]::Min($attempt, $backoffSeconds.Count - 1)]
                $jitter = [Math]::Round((Get-Random -Minimum 0 -Maximum 2000) / 1000.0, 2)
                $sleep = $baseSleep + $jitter
                Write-Log "http retry op=$Operation reason=status_$statusCode delay=${sleep}s"
                Start-Sleep -Seconds $sleep
                continue
            }
            return [ordered]@{ ok = $false; statusCode = $statusCode; body = $body; error = "HTTP $statusCode"; attempts = $attempt }

        } catch {
            $statusCode   = Get-HttpStatusCodeFromException -Exception $_.Exception
            $errorMessage = $_.Exception.Message
            $errBody      = $null
            if ($null -ne $_.ErrorDetails -and -not [string]::IsNullOrWhiteSpace($_.ErrorDetails.Message)) {
                $errBody = ConvertFrom-JsonSafe -Text $_.ErrorDetails.Message
            }
            if ($statusCode) {
                Write-Log "http error op=$Operation status=$statusCode attempt=$attempt/$MaxAttempts message=$errorMessage"
            } else {
                Write-Log "http error op=$Operation status=network attempt=$attempt/$MaxAttempts message=$errorMessage"
            }
                        $isNetwork = ($null -eq $statusCode)
            $shouldRetry = ($isNetwork -or ($statusCode -eq 429) -or ($statusCode -ge 500))
            if ($shouldRetry -and $attempt -lt $MaxAttempts) {
                $canRetry = if ($isNetwork) { $networkRetryCount -lt $maxNetworkRetries } else { $statusRetryCount -lt $maxStatusRetries }
                if ($canRetry) {
                    if ($isNetwork) { $networkRetryCount += 1 } else { $statusRetryCount += 1 }
                    $baseSleep = $backoffSeconds[[Math]::Min($attempt, $backoffSeconds.Count - 1)]
                    $jitter = [Math]::Round((Get-Random -Minimum 0 -Maximum 2000) / 1000.0, 2)
                    $sleep = $baseSleep + $jitter
                    Write-Log "http retry op=$Operation reason=transient delay=${sleep}s"
                    Start-Sleep -Seconds $sleep
                    continue
                }
            }
            return [ordered]@{ ok = $false; statusCode = $statusCode; body = $errBody; error = $errorMessage; attempts = $attempt }
        }
    }
    return [ordered]@{ ok = $false; statusCode = $null; body = $null; error = "max_attempts_exceeded"; attempts = $MaxAttempts }
}



