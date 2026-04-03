$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$AgentRoot = if ([string]::IsNullOrWhiteSpace($PSScriptRoot)) {
  Split-Path -Parent $MyInvocation.MyCommand.Path
} else {
  $PSScriptRoot
}

$RequiredModules = @(
  "core/paths.ps1",
  "core/config.ps1",
  "core/utils.ps1",
  "core/logging.ps1",
  "core/lock.ps1",
  "core/state.ps1",
  "core/metrics.ps1",
  "core/tls.ps1",
  "infra/registry.ps1",
  "infra/http.ps1",
  "infra/files.ps1",
  "providers/rustdesk.ps1",
  "providers/syspro.ps1",
  "providers/system.ps1",
  "providers/network.ps1",
  "providers/software.ps1",
  "providers/hardware.ps1",
  "providers/windows-update.ps1",
  "providers/processes.ps1",
  "providers/disks.ps1",
  "application/discover.ps1",
  "application/bootstrap.ps1",
  "application/sync.ps1",
  "application/ack.ps1",
  "application/commands.ps1"
)

foreach ($rel in $RequiredModules) {
  $full = Join-Path $AgentRoot $rel
  if (-not (Test-Path -LiteralPath $full)) { throw "Modulo ausente: $full" }
  . $full
}

Initialize-TlsSecurity


# CICLO PRINCIPAL

$state = New-DefaultState

try {
    $cycleId      = ([Guid]::NewGuid().ToString("N")).Substring(0, 10)
    $cycleWatch   = [System.Diagnostics.Stopwatch]::StartNew()
    $phaseTimings = @{}
    $scriptVersion = Get-ScriptVersionId
    $maxDiscoverMs  = 25000
    $maxBootstrapMs = 30000
    $maxSyncMs      = 30000
    $maxAckMs       = 20000
    $bootstrapTriggered = $false
    $schemaVersions = [ordered]@{
        discover = "discover.payload.v1"
        sync     = "sync.payload.v1"
        ack      = "ack.payload.v1"
    }
    $bootstrapFlowResolved = ""
    $lastContractErrorCode = ""

    Write-Log "cycle start id=$cycleId computer=$env:COMPUTERNAME user=$env:USERNAME ps=$($PSVersionTable.PSVersion.ToString()) script=$PSCommandPath"

    $lockAcquired = Acquire-RunLock
    if (-not $lockAcquired) {
        Write-Log "Decision=cycle_skipped_lock_busy id=$cycleId user=$env:USERNAME"
        return
    }
    Write-Log "run lock acquired id=$cycleId mutex=$script:RunMutexName"

    Remove-OldLogs -DaysToKeep 10
    Rotate-LogIfNeeded -FilePath $LogFile      -MaxSizeKb 2048

    $state = Load-AgentState
    $bootstrapFlowResolved = [string]$state.lastBootstrapFlow
    $lastContractErrorCode = [string]$state.lastContractErrorCode
    Write-Log "state loaded id=$cycleId failures=$($state.consecutiveFailures) hasAgentToken=$(-not [string]::IsNullOrWhiteSpace($state.agentToken)) hostId=$($state.hostId) rebootstrapRequired=$($state.rebootstrapRequired) lastSnapshotDate=$($state.lastFullSnapshotDate)"

    # FIX: detectar atualizacao do script entre ciclos
    if (-not [string]::IsNullOrWhiteSpace($state.lastScriptHash) -and
        $state.lastScriptHash -ne $scriptVersion) {
        Write-Log "agent script atualizado. anterior=$($state.lastScriptHash) atual=$scriptVersion"
    }
    $state.lastScriptHash = $scriptVersion

    Apply-StartupJitter -MaxSeconds 60

    $persistentDelay = Get-PersistentBackoffSeconds -ConsecutiveFailures $state.consecutiveFailures
    if ($persistentDelay -gt 0) {
        Write-Log "Backoff persistente aplicado (${persistentDelay}s) por $($state.consecutiveFailures) falhas consecutivas."
        Start-Sleep -Seconds $persistentDelay
    }

    $portalBaseUrl    = Get-PortalBaseUrl
    $portalReadSource = Get-RegistryReadSource -SubKeyPath "SOFTWARE\Trilink\RemoteAgent" -ValueName "PortalBaseUrl"
    if ([string]::IsNullOrWhiteSpace($portalBaseUrl)) {
        Write-Log "PortalBaseUrl ausente no Registry ($RegPath). Fonte: $portalReadSource."
        exit 1
    }

    $discoveryToken  = Get-DiscoveryToken
    $tokenReadSource = Get-RegistryReadSource -SubKeyPath "SOFTWARE\Trilink\RemoteAgent" -ValueName "DiscoveryToken"
    if ([string]::IsNullOrWhiteSpace($discoveryToken)) {
        Write-Log "DiscoveryToken ausente no Registry ($RegPath). Fonte: $tokenReadSource."
        exit 1
    }

    $installToken    = Get-InstallToken
    $installReadSource = Get-InstallTokenReadSource

    Write-Log "PortalBaseUrl lido via $portalReadSource."
    Write-Log "DiscoveryToken lido via $tokenReadSource."
    if ($discoveryToken -like "rhost_*") { throw "DiscoveryToken invalido (parece InstallToken)." }
    if (-not [string]::IsNullOrWhiteSpace($installToken) -and ($installToken -notlike "rhost_*")) {
        throw "InstallToken invalido (esperado prefixo rhost_)."
    }
    if ([string]::IsNullOrWhiteSpace($installToken)) {
        Write-Log "InstallToken ausente (fonte $installReadSource). Bootstrap automatico pode ser bloqueado."
    } else {
        Write-Log "InstallToken lido via $installReadSource mask=$(Mask-Secret -Value $installToken)"
    }

    $selfHeal = Try-RecoverRustDeskService
    if ($selfHeal.selfHealAttempted) {
        Write-Log "Self-healing: before=$($selfHeal.serviceStatusBefore) result=$($selfHeal.selfHealResult) after=$($selfHeal.serviceStatusAfter)"
    }

    $rustdeskId = Get-RustDeskId
    if ([string]::IsNullOrWhiteSpace($rustdeskId))      { throw "RustDesk ID vazio." }
    if ($rustdeskId -notmatch "^\d{7,12}$")             { throw "RustDesk ID invalido: $rustdeskId" }

    # Syspro
    $sysproUpdatesFull = @(Get-SysproUpdates)

    # FIX: hash apenas dos campos semanticos - exclui datas para evitar falsos positivos
    $sysproHashFields = $sysproUpdatesFull | ForEach-Object {
        [ordered]@{
            clientName   = $_.clientName
            version      = $_.version
            revisaoAtual = $_.revisaoAtual
            installPath  = $_.installPath
        }
    }
    $sysproJson  = $sysproHashFields | ConvertTo-Json -Depth 5 -Compress
    $sysproHash  = Get-Sha256Hex -InputText $sysproJson
    $todayUtc    = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd")

    $sendFullSnapshot = $false
    if ([string]::IsNullOrWhiteSpace($state.lastSysproHash)) { $sendFullSnapshot = $true }
    if ($state.lastSysproHash -ne $sysproHash)               { $sendFullSnapshot = $true }
    if ($state.lastFullSnapshotDate -ne $todayUtc)           { $sendFullSnapshot = $true }

    $sysproUpdatesToSend = @()
    if ($sendFullSnapshot) {
        $sysproUpdatesToSend = $sysproUpdatesFull
        Write-Log "sysproUpdates: enviando snapshot completo. count=$(@($sysproUpdatesToSend).Count) hash=$sysproHash today=$todayUtc"
    } else {
        Write-Log "sysproUpdates: sem mudanca, enviando array vazio. hash=$sysproHash previous=$($state.lastSysproHash)"
    }

    # Bootstrap orchestration (token-first)
    $agentToken = [string]$state.agentToken
    if ($state.rebootstrapRequired) {
        Write-Log "Estado local exige rebootstrap; token atual sera ignorado."
        $agentToken = ""
    }

    $hasUsableToken = -not [string]::IsNullOrWhiteSpace($agentToken)
    $orchestrationStrategy = if ($hasUsableToken) { "sync_token_first" } else { "discover_bootstrap" }
    if ($hasUsableToken) {
        $bootstrapFlowResolved = "linked_host_detected"
        Write-Log "Decision=sync_token_first (token local reutilizado mask=$(Mask-Secret -Value $agentToken))."
    } else {
        # Discover (somente quando nao ha token local utilizavel)
        $discoverPayload = @{
            schemaVersion    = "discover.payload.v1"
            discoveryToken    = $discoveryToken
            rustdeskId        = $rustdeskId
            machineName       = $env:COMPUTERNAME
            agentVersion      = $AgentVersion
            serviceStatus     = [string]$selfHeal.serviceStatusAfter
            serviceStatusBefore = [string]$selfHeal.serviceStatusBefore
            selfHealAttempted = [bool]$selfHeal.selfHealAttempted
            selfHealResult    = [string]$selfHeal.selfHealResult
            serviceStatusAfter = [string]$selfHeal.serviceStatusAfter
            sysproUpdates     = $sysproUpdatesToSend
        }

        Write-Log "discover request: rustdeskId=$rustdeskId machine=$env:COMPUTERNAME serviceAfter=$($selfHeal.serviceStatusAfter) updatesCount=$(@($sysproUpdatesToSend).Count)"
        $phaseDiscoverSw = [System.Diagnostics.Stopwatch]::StartNew()
        $discover = Invoke-AgentDiscover -PortalBaseUrl $portalBaseUrl -Payload $discoverPayload
        $phaseTimings.discover = [int]$phaseDiscoverSw.ElapsedMilliseconds
        Assert-PhaseWatchdog -PhaseName "discover" -ElapsedMs $phaseTimings.discover -MaxMs $maxDiscoverMs

        if (-not $discover.ok) {
            $lastContractErrorCode = "DISCOVER_HTTP_$($discover.statusCode)"
            Write-Log "Decision=discover_failed status=$($discover.statusCode) error=$($discover.error)"
            Mark-FailureAndSave -State $state
            return
        }

        $discoverData = Normalize-ApiData -Body $discover.body
        $summary      = Get-DiscoverSummary -DiscoverData $discoverData
        $bootstrapFlowResolved = [string]$summary.bootstrapFlow
        $lastContractErrorCode = ""
        Write-Log "discover response: mode=$($summary.mode) bootstrapFlow=$($summary.bootstrapFlow) allowDiscoveryHeartbeat=$($summary.allowDiscoveryHeartbeat) nextEndpoint=$($summary.nextEndpoint)"

        if ($summary.bootstrapFlow -eq "pending_link") {
            Write-Log "Decision=triagem (pending_link). Sem bootstrap/sync neste ciclo."
            if ($sendFullSnapshot) {
                $state.lastSysproHash       = $sysproHash
                $state.lastFullSnapshotDate = $todayUtc
            }
            $state.consecutiveFailures = 0
            $state.lastBootstrapFlow = $bootstrapFlowResolved
            $state.lastContractErrorCode = $lastContractErrorCode
            Save-AgentState -State $state
            return
        }

        # Bootstrap (somente em fluxos explicitos)
        $bootstrapFlow = [string]$summary.bootstrapFlow
        $bootstrapAllowed = ($bootstrapFlow -eq "host_bootstrap_required" -or $bootstrapFlow -eq "token_invalid")
        if (-not $bootstrapAllowed) {
            Write-Log "Decision=skip_bootstrap_non_explicit_flow flow=$bootstrapFlow"
            $state.consecutiveFailures = 0
            $state.lastBootstrapFlow = $bootstrapFlowResolved
            $state.lastContractErrorCode = $lastContractErrorCode
            Save-AgentState -State $state
            return
        }

        if ([string]::IsNullOrWhiteSpace($installToken)) {
            Write-Log "Decision=triagem_await_install_token (bootstrap bloqueado; aguardando InstallToken para continuar)."
            if ($sendFullSnapshot) {
                $state.lastSysproHash       = $sysproHash
                $state.lastFullSnapshotDate = $todayUtc
            }
            $state.consecutiveFailures = 0
            $state.lastBootstrapFlow = "triagem_await_install_token"
            $state.lastContractErrorCode = $lastContractErrorCode
            Save-AgentState -State $state
            return
        }

        Write-Log "Decision=bootstrap (flow=$bootstrapFlow)."
        $bootstrapPayload = @{
            installToken = $installToken
            rustdeskId   = $rustdeskId
            machineName  = $env:COMPUTERNAME
            agentVersion = $AgentVersion
            environment  = "Producao"
        }

        Write-Log "bootstrap request: rustdeskId=$rustdeskId machine=$env:COMPUTERNAME installTokenMask=$(Mask-Secret -Value $installToken)"
        $phaseBootstrapSw = [System.Diagnostics.Stopwatch]::StartNew()
        $bootstrap = Invoke-AgentBootstrap -PortalBaseUrl $portalBaseUrl -Payload $bootstrapPayload
        $phaseTimings.bootstrap = [int]$phaseBootstrapSw.ElapsedMilliseconds
        Assert-PhaseWatchdog -PhaseName "bootstrap" -ElapsedMs $phaseTimings.bootstrap -MaxMs $maxBootstrapMs

        if (-not $bootstrap.ok) {
            $lastContractErrorCode = "BOOTSTRAP_HTTP_$($bootstrap.statusCode)"
            if ($bootstrap.statusCode -eq 401 -or $bootstrap.statusCode -eq 403) {
                $state.agentToken           = ""
                $state.rebootstrapRequired  = $true
                Write-Log "bootstrap retornou $($bootstrap.statusCode). Estado marcado como rebootstrapRequired."
            }
            Write-Log "Decision=bootstrap_failed status=$($bootstrap.statusCode) error=$($bootstrap.error)"
            Mark-FailureAndSave -State $state
            return
        }

        $bootstrapData     = Normalize-ApiData -Body $bootstrap.body
        $agentTokenFromApi = [string](Get-ObjectPropertyValue -Object $bootstrapData -Name "agentToken")
        if ([string]::IsNullOrWhiteSpace($agentTokenFromApi)) {
            $agentTokenFromApi = [string](Get-ObjectPropertyValue -Object $bootstrapData -Name "token")
        }
        if ([string]::IsNullOrWhiteSpace($agentTokenFromApi)) {
            $agentTokenFromApi = [string](Get-NestedPropertyValue -Object $bootstrap.body -Path @("data", "agentToken"))
        }
        if ([string]::IsNullOrWhiteSpace($agentTokenFromApi)) {
            $lastContractErrorCode = "BOOTSTRAP_MISSING_TOKEN"
            Write-Log "Decision=bootstrap_failed_missing_token"
            Mark-FailureAndSave -State $state
            return
        }

        $state.agentToken          = $agentTokenFromApi
        $state.rebootstrapRequired = $false
        $hostIdFromBootstrap = [string](Get-ObjectPropertyValue -Object $bootstrapData -Name "hostId")
        if (-not [string]::IsNullOrWhiteSpace($hostIdFromBootstrap)) {
            $state.hostId = $hostIdFromBootstrap
        }
        $agentToken = $agentTokenFromApi
        $bootstrapTriggered = $true
        $lastContractErrorCode = ""
        Write-Log "bootstrap concluido com sucesso. agentTokenMask=$(Mask-Secret -Value $agentToken) hostId=$($state.hostId)"
    }

    # Software snapshot
    $softwareSnapshotHash    = [string]$state.lastSoftwareHash
    $softwareSnapshotChanged = $false
    $softwareSnapshotToSend  = @()
    $softwareScanPerformed   = $false
    $softwareScanDue = ([string]::IsNullOrWhiteSpace($state.lastSoftwareHash) -or
                        (Is-RefreshDue -LastTimestampUtc $state.lastSoftwareScanUtc -WindowMinutes 360))
    if ($softwareScanDue) {
        $softwareSnapshotFull    = Get-InstalledSoftwareSnapshot -MaxItems 200
        $softwareSnapshotJson    = $softwareSnapshotFull | ConvertTo-Json -Depth 6 -Compress
        $softwareSnapshotHash    = Get-Sha256Hex -InputText $softwareSnapshotJson
        $softwareSnapshotChanged = ($state.lastSoftwareHash -ne $softwareSnapshotHash)
        $softwareSnapshotToSend  = if ($softwareSnapshotChanged) { $softwareSnapshotFull } else { @() }
        $softwareScanPerformed   = $true
        Write-Log "softwareSnapshot: scan_due=true changed=$softwareSnapshotChanged count=$(@($softwareSnapshotToSend).Count)"
    } else {
        Write-Log "softwareSnapshot: scan_due=false changed=false count=0"
    }

    # System snapshot
    $systemSnapshotFull  = Get-SystemSnapshot -ServiceStatus ([string]$selfHeal.serviceStatusAfter)
    $systemStaticFields  = [ordered]@{
        osCaption         = [string]$systemSnapshotFull.osCaption
        osVersion         = [string]$systemSnapshotFull.osVersion
        osBuild           = [string]$systemSnapshotFull.osBuild
        osArchitecture    = [string]$systemSnapshotFull.osArchitecture
        totalRamMb        = [int]$systemSnapshotFull.totalRamMb
        cpuName           = [string]$systemSnapshotFull.cpuName
        cpuCores          = [int]$systemSnapshotFull.cpuCores
        diskTotalGb       = [int]$systemSnapshotFull.diskTotalGb
        timezone          = [string]$systemSnapshotFull.timezone
        domainOrWorkgroup = [string]$systemSnapshotFull.domainOrWorkgroup
    }
    $systemSnapshotJson    = $systemStaticFields | ConvertTo-Json -Depth 3 -Compress
    $systemSnapshotHash    = Get-Sha256Hex -InputText $systemSnapshotJson
    $systemRefreshDue      = Is-RefreshDue -LastTimestampUtc $state.lastSystemSnapshotUtc -WindowMinutes 30
    $systemSnapshotChanged = (($state.lastSystemHash -ne $systemSnapshotHash) -or $systemRefreshDue)
    $systemSnapshotToSend  = if ($systemSnapshotChanged) { $systemSnapshotFull } else { $null }
    Write-Log "systemSnapshot: changed=$systemSnapshotChanged refreshDue=$systemRefreshDue osBuild=$($systemSnapshotFull.osBuild) diskFreeGb=$($systemSnapshotFull.diskFreeGb) lastBootUtc=$($systemSnapshotFull.lastBootUtc)"

    # Network snapshot
    $networkSnapshotFull    = Get-NetworkSnapshot
    $networkSnapshotJson    = $networkSnapshotFull | ConvertTo-Json -Depth 4 -Compress
    $networkSnapshotHash    = Get-Sha256Hex -InputText $networkSnapshotJson
    $networkSnapshotChanged = ($state.lastNetworkHash -ne $networkSnapshotHash)
    $networkSnapshotToSend  = if ($networkSnapshotChanged) { $networkSnapshotFull } else { $null }
    Write-Log "networkSnapshot: changed=$networkSnapshotChanged adapters=$(@($networkSnapshotFull.adapters).Count)"

    # Novas coletas
    $hardwareIdentity    = Get-HardwareIdentity
    Write-Log "hardwareIdentity: serial=$($hardwareIdentity.biosSerial) model=$($hardwareIdentity.systemModel) manufacturer=$($hardwareIdentity.systemManufacturer)"

    $diskSnapshot = Get-DiskSnapshot
    Write-Log "diskSnapshot: drives=$(@($diskSnapshot).Count)"

    $sysproProcesses = Get-SysproProcessStatus
    foreach ($proc in $sysproProcesses) {
        Write-Log "sysproProcess: name=$($proc.processName) running=$($proc.running) count=$($proc.count)"
    }

    $windowsUpdateStatus = Get-WindowsUpdateStatus
    Write-Log "windowsUpdate: pending=$($windowsUpdateStatus.pendingCount) rebootRequired=$($windowsUpdateStatus.rebootRequired)"

    # Flush da fila local de ACK antes do sync (quando token valido existe)
    $flushStats = Flush-PendingAckQueue -State $state -PortalBaseUrl $portalBaseUrl -AgentToken $agentToken
    if (@($flushStats).Count -gt 0) {
        Write-Log "ack queue flush: sent=$($flushStats.sent) failed=$($flushStats.failed) remaining=$($flushStats.remaining)"
    }

    Register-CycleHistorySample -State $state -BootstrapTriggered $bootstrapTriggered
    $bootstrapRate24h = Get-BootstrapRate24h -State $state

    # Metricas e payload de sync
    $metricsPreSync = New-AgentMetrics -CycleStopwatch $cycleWatch -PhaseTimings $phaseTimings -SelfHeal $selfHeal -ScriptVersion $scriptVersion -OrchestrationStrategy $orchestrationStrategy -BootstrapTriggered $bootstrapTriggered -BootstrapRate24h $bootstrapRate24h -SchemaVersions $schemaVersions -PendingAckQueueSize ([int]@($state.pendingAckQueue).Count) -AckQueueFlush $flushStats -LastBootstrapFlow $bootstrapFlowResolved -LastContractErrorCode $lastContractErrorCode

    $syncPayload = New-AgentSyncPayload `
        -AgentToken $agentToken `
        -RustDeskId $rustdeskId `
        -AgentVersion $AgentVersion `
        -ServiceStatus ([string]$selfHeal.serviceStatusAfter) `
        -SysproUpdates $sysproUpdatesToSend `
        -SystemSnapshot $systemSnapshotToSend `
        -NetworkSnapshot $networkSnapshotToSend `
        -SoftwareSnapshot $softwareSnapshotToSend `
        -HardwareIdentity $hardwareIdentity `
        -DiskSnapshot $diskSnapshot `
        -SysproProcesses $sysproProcesses `
        -WindowsUpdateStatus $windowsUpdateStatus `
        -AgentMetrics $metricsPreSync

    Write-Log "sync request: rustdeskId=$rustdeskId machine=$env:COMPUTERNAME tokenMask=$(Mask-Secret -Value $agentToken) updatesCount=$(@($sysproUpdatesToSend).Count)"
    $phaseSyncSw = [System.Diagnostics.Stopwatch]::StartNew()
    $sync = Invoke-AgentSync -PortalBaseUrl $portalBaseUrl -Payload $syncPayload
    $phaseTimings.sync = [int]$phaseSyncSw.ElapsedMilliseconds
    Assert-PhaseWatchdog -PhaseName "sync" -ElapsedMs $phaseTimings.sync -MaxMs $maxSyncMs

    if (-not $sync.ok) {
        $lastContractErrorCode = "SYNC_HTTP_$($sync.statusCode)"
        if ($sync.statusCode -eq 401 -or $sync.statusCode -eq 403) {
            $state.agentToken          = ""
            $state.rebootstrapRequired = $true
            Write-Log "sync retornou $($sync.statusCode). Token limpo e rebootstrap marcado."
        }
        Write-Log "Decision=sync_failed status=$($sync.statusCode) error=$($sync.error)"
        Mark-FailureAndSave -State $state
        return
    }
    $lastContractErrorCode = ""

    $syncData       = Normalize-ApiData -Body $sync.body
    $hostIdFromSync = [string](Get-ObjectPropertyValue -Object $syncData -Name "hostId")
    if (-not [string]::IsNullOrWhiteSpace($hostIdFromSync)) {
        $state.hostId = $hostIdFromSync
    }

    $queue = Extract-CommandQueue -SyncData $syncData
    Write-Log "sync OK. commandQueue=$(@($queue).Count)"

    # ACK loop
    $phaseAckTotal = 0
    $tokenForAck = [string]$state.agentToken
    $pendingTokenInvalidation = $false
    foreach ($cmd in $queue) {
        $commandId = Resolve-AgentCommandId -Command $cmd
        if ([string]::IsNullOrWhiteSpace($commandId)) {
            Write-Log "Comando sem id ignorado no ack."
            continue
        }

        $exec = Execute-RemoteCommand -Command $cmd -State $state
        $ackPayload = @{
            schemaVersion = "ack.payload.v1"
            agentToken = $tokenForAck
            commandId  = $commandId
            status     = [string]$exec.status
            reasonCode = [string]$exec.reasonCode
            message    = [string]$exec.message
            details    = $exec.details
        }

        Write-Log "ack request: commandId=$commandId status=$($exec.status) tokenMask=$(Mask-Secret -Value $tokenForAck)"
        $phaseAckSw = [System.Diagnostics.Stopwatch]::StartNew()
        $ack = Invoke-AgentAck -PortalBaseUrl $portalBaseUrl -Payload $ackPayload
        $ackElapsed = [int]$phaseAckSw.ElapsedMilliseconds
        $phaseAckTotal += $ackElapsed
        Assert-PhaseWatchdog -PhaseName "ack" -ElapsedMs $ackElapsed -MaxMs $maxAckMs

        if (-not $ack.ok) {
            $lastContractErrorCode = "ACK_HTTP_$($ack.statusCode)"
            if ($ack.statusCode -eq 401 -or $ack.statusCode -eq 403) {
                $pendingTokenInvalidation = $true
                Write-Log "ack $commandId retornou $($ack.statusCode). Rebootstrap sera aplicado apos a fila de ACK."
            }
            if (Should-QueueAckForRetry -AckResponse $ack) {
                Add-PendingAckToState -State $state -AckPayload $ackPayload
                Write-Log "Decision=ack_queued_for_retry commandId=$commandId status=$($ack.statusCode)"
            }
            Write-Log "Decision=ack_failed commandId=$commandId status=$($ack.statusCode) error=$($ack.error)"
        } else {
            $lastContractErrorCode = ""
            Write-Log "Decision=ack_sent commandId=$commandId status=$($exec.status)"
        }

        if (To-Bool $exec.details.invalidateTokenAfterAck) {
            $pendingTokenInvalidation = $true
            Write-Log "Decision=rebootstrap_required_after_ack commandId=$commandId"
        }
    }
    if ($pendingTokenInvalidation) {
        $state.agentToken          = ""
        $state.rebootstrapRequired = $true
        Write-Log "Decision=rebootstrap_required_after_ack_queue"
    }
    $phaseTimings.ack      = [int]$phaseAckTotal
    $phaseTimings.ackCount = [int]@($queue).Count
    Write-Log "ack loop: commands=$(@($queue).Count) totalMs=$phaseAckTotal"

    # Persistir estado
    if ($sendFullSnapshot) {
        $state.lastSysproHash       = $sysproHash
        $state.lastFullSnapshotDate = $todayUtc
    }
    if ($softwareSnapshotChanged) { $state.lastSoftwareHash      = $softwareSnapshotHash }
    if ($systemSnapshotChanged)   { $state.lastSystemHash        = $systemSnapshotHash }
    if ($networkSnapshotChanged)  { $state.lastNetworkHash       = $networkSnapshotHash }
    if ($softwareScanPerformed)   { $state.lastSoftwareScanUtc   = (Get-Date).ToUniversalTime().ToString("o") }
    if ($systemSnapshotChanged)   { $state.lastSystemSnapshotUtc = (Get-Date).ToUniversalTime().ToString("o") }
    $state.lastBootstrapFlow = [string]$bootstrapFlowResolved
    $state.lastContractErrorCode = [string]$lastContractErrorCode

    # FIX: acesso seguro a phaseTimings - chaves podem nao existir se fase foi pulada
    $tDiscover  = if ($phaseTimings.ContainsKey('discover'))  { $phaseTimings['discover'] }  else { 0 }
    $tBootstrap = if ($phaseTimings.ContainsKey('bootstrap')) { $phaseTimings['bootstrap'] } else { "-" }
    $tSync      = if ($phaseTimings.ContainsKey('sync'))      { $phaseTimings['sync'] }      else { 0 }
    $tAck       = if ($phaseTimings.ContainsKey('ack'))       { $phaseTimings['ack'] }       else { 0 }
    Write-Log "cycle timings: discover=${tDiscover}ms bootstrap=${tBootstrap}ms sync=${tSync}ms ack=${tAck}ms total=$($cycleWatch.ElapsedMilliseconds)ms"

    $state.consecutiveFailures = 0
    Save-AgentState -State $state
    Write-Log "cycle success id=$cycleId hostId=$($state.hostId) hasAgentToken=$(-not [string]::IsNullOrWhiteSpace($state.agentToken)) snapshotDate=$($state.lastFullSnapshotDate)"

} catch {
    $exceptionMessage = [string]$_.Exception.Message
    if ($exceptionMessage -like "PHASE_TIMEOUT_*") {
        $state.lastContractErrorCode = $exceptionMessage
    } elseif (-not [string]::IsNullOrWhiteSpace($lastContractErrorCode)) {
        $state.lastContractErrorCode = $lastContractErrorCode
    }
    Mark-FailureAndSave -State $state
    # FIX: inclui numero da linha para facilitar diagnostico
    $errLine = if ($_.InvocationInfo) { " line=$($_.InvocationInfo.ScriptLineNumber)" } else { "" }
    Write-Log "cycle failure message=$exceptionMessage$errLine"
} finally {
    Release-RunLock
}

