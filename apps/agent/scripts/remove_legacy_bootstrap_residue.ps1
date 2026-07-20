$ErrorActionPreference = "Stop"

param(
    [switch]$Silent
)

$programDataAgentDir = Join-Path $env:ProgramData "Trilink\\Agent"
$legacyRoots = @(
    (Join-Path ${env:ProgramFiles} "Trilink\\Agent"),
    (Join-Path ${env:ProgramFiles(x86)} "Trilink\\Agent")
) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

$helperHints = @(
    "configure_agent_helper.ps1",
    "configure-agent-helper.cmd",
    "start-agent-from-env.ps1",
    "start-agent-from-env.cmd",
    "remote_state.json",
    "trilink\\agent\\scripts",
    "remote_install_token",
    "installtoken",
    "/api/remote/agents/discover",
    "/api/remote/rustdesk/bootstrap"
)

function Write-Info {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    if (-not $Silent) {
        Write-Host $Message -ForegroundColor DarkGray
    }
}

function Test-LegacyHint {
    param(
        [AllowNull()]
        [string]$Value
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $false
    }

    $normalized = $Value.ToLowerInvariant()
    foreach ($hint in $helperHints) {
        if ($normalized.Contains($hint)) {
            return $true
        }
    }

    return $false
}

function Remove-EnvKeyFromFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$Key
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    $prefix = ($Key.Trim().ToUpperInvariant() + "=")
    $lines = Get-Content -LiteralPath $Path
    $filtered = foreach ($line in $lines) {
        $trimmed = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith("#")) {
            $line
            continue
        }

        if (-not $trimmed.ToUpperInvariant().StartsWith($prefix)) {
            $line
        }
    }

    Set-Content -LiteralPath $Path -Value $filtered -Encoding utf8
}

function Stop-LegacyBootstrapProcesses {
    try {
        $processes = Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object {
            $_.ProcessId -ne $PID -and (Test-LegacyHint $_.CommandLine)
        }

        foreach ($process in $processes) {
            Write-Info ("Encerrando processo legado: " + $process.Name + " PID=" + $process.ProcessId)
            Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Info ("Falha ao varrer processos legados: " + $_.Exception.Message)
    }
}

function Remove-LegacyRunEntries {
    $runPaths = @(
        "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
        "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce",
        "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
        "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce",
        "HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run",
        "HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\RunOnce"
    )

    foreach ($path in $runPaths) {
        if (-not (Test-Path -LiteralPath $path)) {
            continue
        }

        try {
            $item = Get-Item -LiteralPath $path -ErrorAction Stop
            foreach ($property in $item.Property) {
                $value = $item.GetValue($property, $null, "DoNotExpandEnvironmentNames")
                if ($value -is [string] -and (Test-LegacyHint $value)) {
                    Write-Info ("Removendo autorun legado: " + $path + " -> " + $property)
                    Remove-ItemProperty -LiteralPath $path -Name $property -ErrorAction SilentlyContinue
                }
            }
        } catch {
            Write-Info ("Falha ao revisar autoruns em " + $path + ": " + $_.Exception.Message)
        }
    }
}

function Remove-LegacyScheduledTasks {
    try {
        $tasks = Get-ScheduledTask -ErrorAction Stop
    } catch {
        Write-Info ("Falha ao listar tarefas agendadas: " + $_.Exception.Message)
        return
    }

    foreach ($task in $tasks) {
        $matches = $false
        foreach ($action in @($task.Actions)) {
            if (Test-LegacyHint $action.Execute -or Test-LegacyHint $action.Arguments) {
                $matches = $true
                break
            }
        }

        if (-not $matches) {
            continue
        }

        try {
            Write-Info ("Removendo tarefa agendada legada: " + $task.TaskPath + $task.TaskName)
            Unregister-ScheduledTask -TaskName $task.TaskName -TaskPath $task.TaskPath -Confirm:$false -ErrorAction Stop
        } catch {
            Write-Info ("Falha ao remover tarefa " + $task.TaskName + ": " + $_.Exception.Message)
        }
    }
}

function Remove-LegacyStartupArtifacts {
    $startupDirs = @(
        [Environment]::GetFolderPath("Startup"),
        [Environment]::GetFolderPath("CommonStartup")
    ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

    $shell = $null
    try {
        $shell = New-Object -ComObject WScript.Shell
    } catch {
        Write-Info ("Falha ao criar WScript.Shell para atalhos: " + $_.Exception.Message)
    }

    foreach ($dir in $startupDirs) {
        if (-not (Test-Path -LiteralPath $dir)) {
            continue
        }

        foreach ($entry in Get-ChildItem -LiteralPath $dir -Force -ErrorAction SilentlyContinue) {
            $remove = Test-LegacyHint $entry.FullName
            if (-not $remove -and $entry.Extension -ieq ".lnk" -and $shell) {
                try {
                    $shortcut = $shell.CreateShortcut($entry.FullName)
                    $targetText = ($shortcut.TargetPath + " " + $shortcut.Arguments).Trim()
                    $remove = Test-LegacyHint $targetText
                } catch {
                    Write-Info ("Falha ao ler atalho " + $entry.FullName + ": " + $_.Exception.Message)
                }
            }

            if ($remove) {
                Write-Info ("Removendo artefato de inicializacao legado: " + $entry.FullName)
                Remove-Item -LiteralPath $entry.FullName -Force -Recurse -ErrorAction SilentlyContinue
            }
        }
    }
}

function Remove-LegacyHelperFiles {
    foreach ($root in $legacyRoots) {
        foreach ($relativePath in @(
            "scripts\\configure_agent_helper.ps1",
            "scripts\\configure-agent-helper.cmd",
            "start-agent-from-env.ps1",
            "start-agent-from-env.cmd"
        )) {
            $target = Join-Path $root $relativePath
            if (Test-Path -LiteralPath $target) {
                Write-Info ("Removendo helper legado: " + $target)
                Remove-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

function Remove-LegacyInstallRoots {
    foreach ($root in $legacyRoots) {
        if (-not (Test-Path -LiteralPath $root)) {
            continue
        }

        try {
            Write-Info ("Removendo arvore legado: " + $root)
            Remove-Item -LiteralPath $root -Force -Recurse -ErrorAction Stop
        } catch {
            Write-Info ("Falha ao remover arvore legada " + $root + ": " + $_.Exception.Message)
        }
    }
}

function SanitizeLegacyRemoteState {
    [Environment]::SetEnvironmentVariable("REMOTE_INSTALL_TOKEN", $null, "Machine")
    [Environment]::SetEnvironmentVariable("REMOTE_INSTALL_TOKEN", $null, "User")
    Remove-Item Env:REMOTE_INSTALL_TOKEN -ErrorAction SilentlyContinue

    if (-not (Test-Path -LiteralPath $programDataAgentDir)) {
        return
    }

    Remove-EnvKeyFromFile -Path (Join-Path $programDataAgentDir ".env") -Key "REMOTE_INSTALL_TOKEN"

    foreach ($fileName in @(
        "remote_state.json",
        "pending_ack_queue.json",
        "telemetry_outbox.json"
    )) {
        $target = Join-Path $programDataAgentDir $fileName
        if (Test-Path -LiteralPath $target) {
            Write-Info ("Removendo estado remoto legado: " + $target)
            Remove-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Info "Limpando residuos de bootstrap legado..."
Stop-LegacyBootstrapProcesses
Remove-LegacyRunEntries
Remove-LegacyScheduledTasks
Remove-LegacyStartupArtifacts
Remove-LegacyHelperFiles
Remove-LegacyInstallRoots
SanitizeLegacyRemoteState
Write-Info "Limpeza de residuos legados concluida."
