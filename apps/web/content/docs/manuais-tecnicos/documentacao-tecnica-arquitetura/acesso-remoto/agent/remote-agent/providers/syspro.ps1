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
        $targetFolder = "$($drive.Name):\Syspro\Server"
        $exePath      = Join-Path $targetFolder "SysproServer.exe"

        if (Test-Path $exePath) {
            try {
                $fileInfo         = Get-Item $exePath
                $versionInfo      = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($exePath)
                $clientName       = "Syspro-Server-$($drive.Name)"
                $changelogVersion = Get-SysproChangelogVersion -InstallPath $targetFolder

                $results += [ordered]@{
                    clientName        = $clientName
                    installPath       = $targetFolder
                    version           = $versionInfo.FileVersion
                    revisaoAtual      = $changelogVersion
                    lastUpdateUtc     = $fileInfo.LastWriteTime.ToUniversalTime().ToString("o")
                    empresa           = $clientName
                    caminho           = $exePath
                    ultimaAtualizacao = $fileInfo.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
                }

                Write-Log "Syspro detectado em: $targetFolder | versao=$($versionInfo.FileVersion) | revisao=$changelogVersion | alterado=$($fileInfo.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'))"
            } catch {
                Write-Log "Erro ao ler metadados de ${exePath}: $($_.Exception.Message)"
            }
        }
    }

    Write-Log "Verificacao concluida. Total encontrado: $($results.Count)"
    return $results
}
