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

        $patterns = @(
            'Revis[aã]o\s+Atual\s*[:\-\s]\s*(\d+)',
            'Revis[aã]o\s*[:\-\s]\s*(\d+)',
            'Rev\.?\s+Atual\s*[:\-\s]\s*(\d+)',
            'Atual\s*[:\-\s]\s*(\d+)\s*$'
        )

        foreach ($pattern in $patterns) {
            $regexMatch = [regex]::Match(
                $content,
                $pattern,
                [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Multiline
            )
            if ($regexMatch.Success) {
                return $regexMatch.Groups[1].Value.Trim()
            }
        }

        Write-Log "revisao nao encontrada no changelog: $changelogPath"
        return ""
    } catch {
        Write-Log "changelog erro leitura: $InstallPath | $($_.Exception.Message)"
        return ""
    }
}

function Resolve-ExecutablePathFromServiceCommandLine {
    param([string]$CommandLine)
    if ([string]::IsNullOrWhiteSpace($CommandLine)) { return "" }
    $trimmed = $CommandLine.Trim()

    if ($trimmed.StartsWith('"')) {
        $endQuote = $trimmed.IndexOf('"', 1)
        if ($endQuote -gt 1) {
            return $trimmed.Substring(1, $endQuote - 1)
        }
    }

    $exeMatch = [regex]::Match($trimmed, '^[^\s]+?\.exe', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($exeMatch.Success) {
        return $exeMatch.Value
    }

    return ""
}

function Get-FirebirdExecutableFromService {
    $serviceNames = @(
        "FirebirdServerDefaultInstance",
        "FirebirdServer",
        "FBServer"
    )

    foreach ($serviceName in $serviceNames) {
        try {
            $service = Get-CimInstance -ClassName Win32_Service -Filter "Name='$serviceName'" -ErrorAction Stop
            if ($null -eq $service) { continue }
            $exePath = Resolve-ExecutablePathFromServiceCommandLine -CommandLine ([string]$service.PathName)
            if ([string]::IsNullOrWhiteSpace($exePath)) { continue }
            if (-not (Test-Path -LiteralPath $exePath -PathType Leaf)) { continue }
            return $exePath
        } catch {}
    }

    return ""
}

function Get-FirebirdVersion {
    param(
        [string]$InstallPath,
        [string]$SysproRoot
    )

    $candidates = @(
        (Join-Path $InstallPath "fbserver.exe"),
        (Join-Path $InstallPath "fb_inet_server.exe"),
        (Join-Path $InstallPath "..\Firebird\fbserver.exe"),
        (Join-Path $InstallPath "..\Firebird\fb_inet_server.exe"),
        (Join-Path $InstallPath "..\..\Firebird\fbserver.exe"),
        (Join-Path $InstallPath "..\..\Firebird\fb_inet_server.exe")
    )

    if (-not [string]::IsNullOrWhiteSpace($SysproRoot)) {
        $candidates += @(
            (Join-Path $SysproRoot "Firebird\fbserver.exe"),
            (Join-Path $SysproRoot "Firebird\fb_inet_server.exe"),
            (Join-Path $SysproRoot "Dll\fbserver.exe"),
            (Join-Path $SysproRoot "Dlls\fbserver.exe")
        )
    }

    $firebirdRoots = @(
        (Join-Path $env:ProgramFiles "Firebird"),
        (Join-Path ${env:ProgramFiles(x86)} "Firebird")
    ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

    foreach ($root in $firebirdRoots) {
        try {
            if (-not (Test-Path -LiteralPath $root -PathType Container)) { continue }
            $candidateDirs = Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending
            foreach ($dir in $candidateDirs) {
                $candidates += @(
                    (Join-Path $dir.FullName "bin\fbserver.exe"),
                    (Join-Path $dir.FullName "bin\fb_inet_server.exe"),
                    (Join-Path $dir.FullName "fbserver.exe"),
                    (Join-Path $dir.FullName "fb_inet_server.exe")
                )
            }
        } catch {}
    }

    $serviceExe = Get-FirebirdExecutableFromService
    if (-not [string]::IsNullOrWhiteSpace($serviceExe)) {
        $candidates += $serviceExe
    }

    $visited = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
    foreach ($candidate in $candidates) {
        try {
            if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
            $resolved = (Resolve-Path -LiteralPath $candidate -ErrorAction Stop).Path
            if (-not $visited.Add($resolved)) { continue }
            if (-not (Test-Path -LiteralPath $resolved -PathType Leaf)) { continue }
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
                $firebird         = Get-FirebirdVersion -InstallPath $targetFolder -SysproRoot $sysproRoot

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
                if ([string]::IsNullOrWhiteSpace([string]$firebird.version)) {
                    Write-Log "Firebird nao encontrado para instalacao: $targetFolder"
                }
            } catch {
                Write-Log "Erro ao ler metadados de ${exePath}: $($_.Exception.Message)"
            }
        }
    }

    Write-Log "Verificacao concluida. Total encontrado: $($results.Count)"
    return $results
}
