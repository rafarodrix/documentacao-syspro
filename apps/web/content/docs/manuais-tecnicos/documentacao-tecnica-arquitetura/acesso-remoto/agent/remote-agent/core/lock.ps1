function Acquire-RunLock {
    param(
        [string]$MutexName = "Global\TrilinkRemoteAgentMutex",
        [int]$TimeoutMilliseconds = 1500
    )
    try {
        $createdNew = $false
        $script:RunMutex = New-Object System.Threading.Mutex($false, $MutexName, [ref]$createdNew)
        try {
            $acquired = $script:RunMutex.WaitOne($TimeoutMilliseconds, $false)
            if ($acquired) {
                $script:HasRunMutex = $true
                return $true
            }
            return $false
        } catch [System.Threading.AbandonedMutexException] {
            $script:HasRunMutex = $true
            Write-Log "run lock abandonado detectado (mutex=$MutexName). Execucao atual assumiu o lock."
            return $true
        }
    } catch {
        Write-Log "Falha ao adquirir run lock: $($_.Exception.Message)"
        return $false
    }
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
}
