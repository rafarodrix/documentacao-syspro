function Acquire-RunLock {
    param(
        [string]$MutexName = "Global\TrilinkRemoteAgentMutex",
        [int]$TimeoutMilliseconds = 1500
    )
    $candidates = @($MutexName)
    if ($MutexName -like "Global\*") {
        $candidates += ($MutexName -replace "^Global\\", "Local\")
    }

    foreach ($candidate in $candidates) {
        try {
            $createdNew = $false
            $script:RunMutex = New-Object System.Threading.Mutex($false, $candidate, [ref]$createdNew)
            try {
                $acquired = $script:RunMutex.WaitOne($TimeoutMilliseconds, $false)
                if ($acquired) {
                    $script:HasRunMutex = $true
                    $script:RunMutexName = $candidate
                    return $true
                }
                if ($null -ne $script:RunMutex) {
                    try { $script:RunMutex.Dispose() } catch {}
                }
                $script:RunMutex = $null
                continue
            } catch [System.Threading.AbandonedMutexException] {
                $script:HasRunMutex = $true
                $script:RunMutexName = $candidate
                Write-Log "run lock abandonado detectado (mutex=$candidate). Execucao atual assumiu o lock."
                return $true
            }
        } catch [System.UnauthorizedAccessException] {
            Write-Log "Sem permissao para mutex '$candidate'. Tentando fallback."
            continue
        } catch {
            Write-Log "Falha ao adquirir run lock (mutex=$candidate): $($_.Exception.Message)"
            continue
        }
    }

    return $false
}

function Release-RunLock {
    if ($script:HasRunMutex -and $null -ne $script:RunMutex) {
        try { $script:RunMutex.ReleaseMutex() } catch {}
    }
    if ($null -ne $script:RunMutex) {
        try { $script:RunMutex.Dispose() } catch {}
    }
    $script:RunMutex = $null
    $script:HasRunMutex = $false
    $script:RunMutexName = ""
}
