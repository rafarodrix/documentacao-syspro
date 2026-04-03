function Get-RustDeskFileVersion {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return "" }
    if (-not (Test-Path -LiteralPath $Path)) { return "" }
    try {
        $item = Get-Item -LiteralPath $Path -ErrorAction Stop
        $version = [string]$item.VersionInfo.FileVersion
        if ([string]::IsNullOrWhiteSpace($version)) { return "" }
        return $version.Trim()
    } catch {
        return ""
    }
}

function Resolve-UpgradePayload {
    param([object]$Command)
    $payload = Get-ObjectPropertyValue -Object $Command -Name "payload"
    if ($null -eq $payload) { $payload = @{} }

    $downloadUrl = [string](Get-ObjectPropertyValue -Object $payload -Name "downloadUrl")
    if ([string]::IsNullOrWhiteSpace($downloadUrl)) {
        $downloadUrl = [string](Get-ObjectPropertyValue -Object $payload -Name "url")
    }
    if ([string]::IsNullOrWhiteSpace($downloadUrl)) {
        $downloadUrl = [string](Get-ObjectPropertyValue -Object $payload -Name "installerUrl")
    }

    $targetVersion = [string](Get-ObjectPropertyValue -Object $payload -Name "targetVersion")
    $checksumSha256 = [string](Get-ObjectPropertyValue -Object $payload -Name "checksumSha256")
    if ([string]::IsNullOrWhiteSpace($checksumSha256)) {
        $checksumSha256 = [string](Get-ObjectPropertyValue -Object $payload -Name "sha256")
    }

    $packageType = [string](Get-ObjectPropertyValue -Object $payload -Name "packageType")
    if ([string]::IsNullOrWhiteSpace($packageType)) {
        $packageType = [string](Get-ObjectPropertyValue -Object $payload -Name "mode")
    }
    if ([string]::IsNullOrWhiteSpace($packageType)) {
        $packageType = "binary"
    }

    $silentArgs = [string](Get-ObjectPropertyValue -Object $payload -Name "silentArgs")
    if ([string]::IsNullOrWhiteSpace($silentArgs)) {
        $silentArgs = "/S"
    }

    return [ordered]@{
        downloadUrl   = $downloadUrl.Trim()
        targetVersion = $targetVersion.Trim()
        checksumSha256 = ($checksumSha256 -replace "\s+", "").ToLowerInvariant()
        packageType   = $packageType.Trim().ToLowerInvariant()
        silentArgs    = $silentArgs
    }
}

function Invoke-RustDeskUpgrade {
    param([object]$Command)

    $upgrade = Resolve-UpgradePayload -Command $Command
    if ([string]::IsNullOrWhiteSpace($upgrade.downloadUrl)) {
        throw "UPGRADE_CLIENT sem downloadUrl/url/installerUrl."
    }

    if ($upgrade.downloadUrl -notmatch '^https://') {
        throw "UPGRADE_CLIENT requer downloadUrl HTTPS."
    }
    if ([string]::IsNullOrWhiteSpace($upgrade.checksumSha256)) {
        throw "UPGRADE_CLIENT requer checksumSha256 para validacao de integridade."
    }

    Ensure-StateDir
    $downloadDir = Join-Path $StateDir "downloads"
    if (-not (Test-Path -LiteralPath $downloadDir)) {
        New-Item -Path $downloadDir -ItemType Directory -Force | Out-Null
    }

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $targetTag = if ([string]::IsNullOrWhiteSpace($upgrade.targetVersion)) { "unknown" } else { $upgrade.targetVersion }
    $packagePath = Join-Path $downloadDir ("rustdesk-upgrade-{0}-{1}.exe" -f $targetTag, $stamp)

    Write-Log ("upgrade_client: download iniciando url={0}" -f (Truncate-Text -Text $upgrade.downloadUrl -MaxLength 220))
    Invoke-WebRequest -Uri $upgrade.downloadUrl -OutFile $packagePath -UseBasicParsing -TimeoutSec 120 -ErrorAction Stop

    if (-not (Test-Path -LiteralPath $packagePath)) {
        throw "Falha ao baixar pacote de upgrade."
    }

    $downloadChecksum = ((Get-FileHash -LiteralPath $packagePath -Algorithm SHA256 -ErrorAction Stop).Hash).ToLowerInvariant()
    if ($downloadChecksum -ne $upgrade.checksumSha256) {
        throw "Checksum SHA256 divergente para pacote de upgrade."
    }
    $checksumValidated = $true

    $exePath = Get-RustDeskExePath
    $oldVersion = Get-RustDeskFileVersion -Path $exePath
    $serviceBefore = Get-ServiceStatus

    $serviceStoppedForUpgrade = $false
    if ($serviceBefore -eq "running") {
        try {
            Stop-Service -Name "RustDesk" -Force -ErrorAction Stop
            Start-Sleep -Seconds 2
            $serviceStoppedForUpgrade = $true
        } catch {
            throw "Falha ao parar servico RustDesk antes do upgrade: $($_.Exception.Message)"
        }
    }

    $installMode = if ($upgrade.packageType -eq "installer") { "installer" } else { "binary" }
    $installExitCode = 0
    $backupPath = ""
    if ($installMode -eq "installer") {
        $process = Start-Process -FilePath $packagePath -ArgumentList $upgrade.silentArgs -Wait -PassThru -WindowStyle Hidden -ErrorAction Stop
        $installExitCode = [int]$process.ExitCode
        if ($installExitCode -ne 0) {
            throw "Instalador retornou exit code $installExitCode."
        }
    } else {
        if (-not (Test-Path -LiteralPath $exePath)) {
            throw "Executavel alvo nao encontrado para upgrade em modo binary: $exePath"
        }
        $backupPath = "$exePath.bak"
        try {
            Copy-Item -LiteralPath $exePath -Destination $backupPath -Force -ErrorAction Stop
            Copy-Item -LiteralPath $packagePath -Destination $exePath -Force -ErrorAction Stop
        } catch {
            if (-not [string]::IsNullOrWhiteSpace($backupPath) -and (Test-Path -LiteralPath $backupPath)) {
                try { Copy-Item -LiteralPath $backupPath -Destination $exePath -Force -ErrorAction SilentlyContinue } catch {}
            }
            throw "Falha ao aplicar pacote binary: $($_.Exception.Message)"
        }
    }

    $serviceRestarted = $false
    try {
        Start-Service -Name "RustDesk" -ErrorAction Stop
        Start-Sleep -Seconds 2
        $serviceRestarted = ((Get-ServiceStatus) -eq "running")
    } catch {
        Write-Log "upgrade_client: falha ao iniciar servico RustDesk apos upgrade: $($_.Exception.Message)"
    }

    $newVersion = Get-RustDeskFileVersion -Path $exePath

    return [ordered]@{
        executed                = $true
        mode                    = $installMode
        targetVersion           = $upgrade.targetVersion
        oldVersion              = $oldVersion
        newVersion              = $newVersion
        versionChanged          = ($oldVersion -ne $newVersion)
        downloadUrl             = (Truncate-Text -Text $upgrade.downloadUrl -MaxLength 220)
        packagePath             = $packagePath
        packageSha256           = $downloadChecksum
        checksumValidated       = $checksumValidated
        installExitCode         = $installExitCode
        serviceStatusBefore     = $serviceBefore
        serviceStoppedForUpgrade = $serviceStoppedForUpgrade
        serviceStatusAfter      = (Get-ServiceStatus)
        serviceRestarted        = $serviceRestarted
        backupPath              = $backupPath
    }
}

function Execute-RemoteCommand {
    param([object]$Command, [hashtable]$State)
    $cmdType = [string](Get-ObjectPropertyValue -Object $Command -Name "type")
    if ([string]::IsNullOrWhiteSpace($cmdType)) {
        $cmdType = [string](Get-ObjectPropertyValue -Object $Command -Name "commandType")
    }
    $result = [ordered]@{
        status     = "ACKNOWLEDGED"
        reasonCode = "COMMAND_PROCESSED"
        message    = "Comando processado."
        details = [ordered]@{
            commandType             = $cmdType
            executedAtUtc           = (Get-Date).ToUniversalTime().ToString("o")
            executed                = $false
            invalidateTokenAfterAck = $false
        }
    }

    try {
        switch ($cmdType.ToUpperInvariant()) {
            "REAPPLY_ALIAS" {
                $result.reasonCode = "REAPPLY_ALIAS_NOOP"
                $result.message = "REAPPLY_ALIAS recebido; sem acao local no agente."
                break
            }
            "REAPPLY_CONFIG" {
                $result.reasonCode = "REAPPLY_CONFIG_NOOP"
                $result.message = "REAPPLY_CONFIG recebido; sem acao local no agente."
                break
            }
            "UPGRADE_CLIENT" {
                $upgradeResult = Invoke-RustDeskUpgrade -Command $Command
                $result.details.executed = $true
                $result.details.upgrade = $upgradeResult
                $result.reasonCode = "UPGRADE_CLIENT_SUCCESS"
                $result.message = "UPGRADE_CLIENT executado com sucesso."
                break
            }
            "ROTATE_TOKEN_REQUIRED" {
                $result.reasonCode = "ROTATE_TOKEN_REQUIRED"
                $result.message = "ROTATE_TOKEN_REQUIRED recebido; token local invalidado para rebootstrap."
                $result.details.executed = $true
                $result.details.invalidateTokenAfterAck = $true
                break
            }
            default {
                $result.reasonCode = "COMMAND_UNKNOWN"
                $result.message = "Comando desconhecido tratado sem execucao local."
                break
            }
        }
    } catch {
        $result.status = "FAILED"
        $result.reasonCode = "COMMAND_EXECUTION_FAILED"
        $result.message = "Falha ao executar comando ${cmdType}: $($_.Exception.Message)"
        $result.details.error = [ordered]@{
            message = [string]$_.Exception.Message
        }
        if ($_.InvocationInfo) {
            $result.details.error.line = [int]$_.InvocationInfo.ScriptLineNumber
        }
    }

    return $result
}


