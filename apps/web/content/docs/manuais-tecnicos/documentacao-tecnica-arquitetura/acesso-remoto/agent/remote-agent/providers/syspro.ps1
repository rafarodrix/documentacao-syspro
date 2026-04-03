function Get-SysproChangelogVersion {
    param([string]$InstallPath)
    try {
        $changelogPath = Join-Path $InstallPath "Update\change-log.txt"
        if (-not (Test-Path $changelogPath)) {
            Write-Log "changelog nao encontrado: $changelogPath"
            return ""
        }

        # FIX: fallback para ANSI/Default - arquivos legados Syspro podem nao ser UTF-8
        $content = $null
        try {
            $content = Get-Content -Path $changelogPath -Raw -Encoding UTF8 -ErrorAction Stop
            if ($content -match ([char]0x00C3)) {
                $ansiContent = Get-Content -Path $changelogPath -Raw -Encoding Default -ErrorAction Stop
                if (-not [string]::IsNullOrWhiteSpace($ansiContent)) {
                    $content = $ansiContent
                }
            }
        } catch {
            try {
                $content = Get-Content -Path $changelogPath -Raw -Encoding Default -ErrorAction Stop
            } catch {}
        }

        if ([string]::IsNullOrWhiteSpace($content)) { return "" }

        # FIX: $regexMatch em vez de $match (variavel automatica reservada do PS)
        $regexMatch = [regex]::Match(
            $content,
            'Revis\w*\s+Atual\s*[:\s]\s*(\d+)',
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )
        if ($regexMatch.Success) { return $regexMatch.Groups[1].Value.Trim() }
        return ""
    } catch {
        Write-Log "changelog erro leitura: $InstallPath | $($_.Exception.Message)"
        return ""
    }
}

function Get-FirebirdVersion {
    param([string]$InstallPath)

    $candidates = @(
        (Join-Path $InstallPath "fbserver.exe"),
        (Join-Path $InstallPath "fb_inet_server.exe"),
        (Join-Path $InstallPath "..\Firebird\fbserver.exe"),
        (Join-Path $InstallPath "..\Firebird\fb_inet_server.exe")
    )

    foreach ($candidate in $candidates) {
        try {
            if (-not (Test-Path -LiteralPath $candidate)) { continue }
            $resolved = (Resolve-Path -LiteralPath $candidate -ErrorAction Stop).Path
            $versionInfo = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($resolved)
            $version = [string]$versionInfo.FileVersion
            if (-not [string]::IsNullOrWhiteSpace($version)) {
                return [ordered]@{
                    version        = $version
                    executablePath = $resolved
                }
            }
        } catch {}
    }

    return [ordered]@{
        version        = ""
        executablePath = ""
    }
}

function Get-SysproUpdates {
    Write-Log "Iniciando verificacao de caminho fixo: \Syspro\Server"
    $results = @()

    $drives = @(Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -match "^[A-Za-z]$"
    })

    if (-not $drives -or $drives.Count -eq 0) {
        Write-Log "Nenhuma unidade de sistema de arquivos encontrada para verificacao."
        return $results
    }

    foreach ($drive in $drives) {
        $sysproRoot   = "$($drive.Name):\Syspro"
        $targetFolder = Join-Path $sysproRoot "Server"
        $exePath      = Join-Path $targetFolder "SysproServer.exe"
        $hasClient    = Test-Path -LiteralPath (Join-Path $sysproRoot "Client") -PathType Container
        $hasDll       = (Test-Path -LiteralPath (Join-Path $sysproRoot "Dll") -PathType Container) -or
                        (Test-Path -LiteralPath (Join-Path $sysproRoot "Dlls") -PathType Container)

        if (Test-Path $exePath) {
            try {
                $fileInfo         = Get-Item $exePath
                $versionInfo      = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($exePath)
                $clientName       = "Syspro-Server-$($drive.Name)"
                $changelogVersion = Get-SysproChangelogVersion -InstallPath $targetFolder
                $firebird         = Get-FirebirdVersion -InstallPath $targetFolder

                $results += [ordered]@{
                    clientName        = $clientName
                    installPath       = $targetFolder
                    version           = $versionInfo.FileVersion
                    revisaoAtual      = $changelogVersion
                    lastUpdateUtc     = $fileInfo.LastWriteTime.ToUniversalTime().ToString("o")
                    empresa           = $clientName
                    caminho           = $exePath
                    ultimaAtualizacao = $fileInfo.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
                    isServerHost      = $true
                    hasClientFolder   = [bool]$hasClient
                    hasDllFolder      = [bool]$hasDll
                    firebirdVersion   = [string]$firebird.version
                    firebirdPath      = [string]$firebird.executablePath
                }

                Write-Log "Syspro detectado em: $targetFolder | versao=$($versionInfo.FileVersion) | revisao=$changelogVersion | alterado=$($fileInfo.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')) | firebird=$($firebird.version)"
            } catch {
                Write-Log "Erro ao ler metadados de ${exePath}: $($_.Exception.Message)"
            }
        }
    }

    Write-Log "Verificacao concluida. Total encontrado: $($results.Count)"
    return $results
}
