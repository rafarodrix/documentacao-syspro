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

function Post-JsonWithRetry {
    param(
        [string]$Url,
        [hashtable]$Payload,
        [int]$MaxAttempts = 4,
        [string]$Operation = "http"
    )
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
                -TimeoutSec 25 `
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
            if ($shouldRetry -and $attempt -lt $MaxAttempts) {
                $sleep = $backoffSeconds[[Math]::Min($attempt, $backoffSeconds.Count - 1)]
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
            $shouldRetry = (($null -eq $statusCode) -or ($statusCode -eq 429) -or ($statusCode -ge 500))
            if ($shouldRetry -and $attempt -lt $MaxAttempts) {
                $sleep = $backoffSeconds[[Math]::Min($attempt, $backoffSeconds.Count - 1)]
                Write-Log "http retry op=$Operation reason=transient delay=${sleep}s"
                Start-Sleep -Seconds $sleep
                continue
            }
            return [ordered]@{ ok = $false; statusCode = $statusCode; body = $errBody; error = $errorMessage; attempts = $attempt }
        }
    }
    return [ordered]@{ ok = $false; statusCode = $null; body = $null; error = "max_attempts_exceeded"; attempts = $MaxAttempts }
}
