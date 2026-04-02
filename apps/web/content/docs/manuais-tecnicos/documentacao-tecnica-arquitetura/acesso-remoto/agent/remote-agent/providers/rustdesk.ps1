function Get-RustDeskExePath {
    $local = Join-Path $PSScriptRoot "rustdesk.exe"
    if (Test-Path $local) { return $local }
    return "C:\Trilink\Remote\RustDesk\rustdesk.exe"
}

function Get-ScriptVersionId {
    try {
        if (-not (Test-Path $PSCommandPath)) { return $AgentVersion }
        $hash = Get-FileHash -Path $PSCommandPath -Algorithm SHA256 -ErrorAction Stop
        if ($null -eq $hash -or [string]::IsNullOrWhiteSpace($hash.Hash)) { return $AgentVersion }
        return "sha256:$([string]$hash.Hash)"
    } catch {
        return $AgentVersion
    }
}

function Get-RustDeskId {
    $exe = Get-RustDeskExePath
    if (-not (Test-Path $exe)) {
        throw "rustdesk.exe nao encontrado: $exe"
    }
    $maxAttempts = 8
    $waitSeconds = 2
    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
        # FIX: filtra ErrorRecord para nao poluir o log com stderr do processo
        $id = (& $exe --get-id 2>&1 |
            Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] } |
            Out-String).Trim()
        $id = ($id -replace "\s+", "")
        if (-not [string]::IsNullOrWhiteSpace($id)) { return $id }
        if ($attempt -lt $maxAttempts) {
            Write-Log "RustDesk ID indisponivel (tentativa $attempt/$maxAttempts). Aguardando ${waitSeconds}s."
            Start-Sleep -Seconds $waitSeconds
        }
    }
    throw "RustDesk ID nao disponivel apos $maxAttempts tentativas."
}

function Get-ServiceStatus {
    $svc = Get-Service -Name "RustDesk" -ErrorAction SilentlyContinue
    if ($null -eq $svc) { return "not_found" }
    if ($svc.Status -eq "Running") { return "running" }
    return "stopped"
}

function Try-RecoverRustDeskService {
    $before = Get-ServiceStatus
    $result = [ordered]@{
        serviceStatusBefore = $before
        selfHealAttempted   = $false
        selfHealResult      = "not_needed"
        serviceStatusAfter  = $before
    }
    if ($before -eq "running") { return $result }
    $result.selfHealAttempted = $true
    if ($before -eq "not_found") {
        Write-Log "Self-healing: servico RustDesk nao encontrado para start."
        $result.selfHealResult = "failed"
        return $result
    }
    for ($attempt = 1; $attempt -le 2; $attempt++) {
        try {
            Write-Log "Self-healing: tentativa ${attempt}/2 para iniciar servico RustDesk."
            Start-Service -Name "RustDesk" -ErrorAction Stop
            Start-Sleep -Seconds 2
        } catch {
            Write-Log "Self-healing: falha na tentativa ${attempt}/2: $($_.Exception.Message)"
        }
        $afterAttempt = Get-ServiceStatus
        if ($afterAttempt -eq "running") {
            $result.serviceStatusAfter = "running"
            $result.selfHealResult = "recovered"
            Write-Log "Self-healing: servico RustDesk recuperado."
            return $result
        }
    }
    $result.serviceStatusAfter = Get-ServiceStatus
    $result.selfHealResult = "failed"
    Write-Log "Self-healing: nao foi possivel recuperar o servico RustDesk."
    return $result
}
