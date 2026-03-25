param(
    [string]$RustDeskPassword = 'Trilink098'
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$rendezvous     = 'acesso.trilinksoftware.com.br'
$serverConfig   = '==Qfi0TVnZTc3YHT1EldidXbJhkbRBzTJ5Wc4BjR4hlN3FHMYBnYit0KIFlbwZkNiojI5V2aiwiIiojIpBXYiwiIyJmLt92YuUmchdHdm92cr5Waslmc05ybzNXZjFmI6ISehxWZyJCLiInYu02bj5SZyF2d0Z2bztmbpxWayRnLvN3clNWYiojI0N3boJye'
$machineName    = $env:COMPUTERNAME
$agentDir       = 'C:\Trilink\Agent'
$transcriptPath = Join-Path $agentDir 'transcript.log'

function Write-Log {
    param([string]$Message)
    Write-Host $Message
}

function Test-IsAdmin {
    $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Ensure-AgentDir {
    if (-not (Test-Path $agentDir)) {
        New-Item -ItemType Directory -Path $agentDir -Force | Out-Null
    }
}

function Test-RustDeskExecutable {
    param([string]$Path)

    if (-not (Test-Path $Path)) { return $false }

    try {
        $null = & $Path --version 2>$null
        return $true
    } catch {
        return $false
    }
}

function Get-RustDeskExePath {
    $possiblePaths = @(
        "$env:ProgramFiles\RustDesk\rustdesk.exe",
        "$env:ProgramFiles(x86)\RustDesk\rustdesk.exe",
        "$env:LocalAppData\Programs\RustDesk\rustdesk.exe",
        "$env:LocalAppData\rustdesk\rustdesk.exe"
    )

    foreach ($path in $possiblePaths) {
        if (Test-RustDeskExecutable -Path $path) {
            Write-Log "RustDesk valido encontrado: $path"
            return $path
        }
    }

    Write-Log "Nenhum executavel RustDesk valido encontrado."
    return $null
}

function Test-RustDeskService {
    $service = Get-Service -Name RustDesk -ErrorAction SilentlyContinue
    return ($null -ne $service)
}

function Get-LatestRustDeskAsset {
    $apiUrl = 'https://api.github.com/repos/rustdesk/rustdesk/releases/latest'
    $headers = @{
        'User-Agent' = 'Trilink-Agent/1.0'
        'Accept'     = 'application/vnd.github+json'
    }

    $release = Invoke-RestMethod -Uri $apiUrl -Headers $headers -Method Get
    $asset = $release.assets |
        Where-Object { $_.name -match '^rustdesk-[\d\.]+-x86_64\.msi$' } |
        Select-Object -First 1

    if (-not $asset) {
        throw "Nao foi possivel localizar o instalador MSI x86_64 do RustDesk."
    }

    return [PSCustomObject]@{
        DownloadUrl = $asset.browser_download_url
        FileName    = $asset.name
    }
}

function Install-OrUpdateRustDesk {
    $exeExistente = Get-RustDeskExePath
    $serviceExists = Test-RustDeskService

    if ($exeExistente -and $serviceExists) {
        Write-Log "RustDesk valido encontrado com servico: $exeExistente"
        return $exeExistente
    }

    if ($exeExistente -and -not $serviceExists) {
        Write-Log "Executavel encontrado sem servico. Reinstalando..."
    } else {
        Write-Log "RustDesk nao encontrado de forma valida. Instalando..."
    }

    Write-Log "Encerrando processos antigos..."
    Get-Process rustdesk -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3

    Write-Log "Removendo residuos antigos..."
    Remove-Item "$env:LocalAppData\rustdesk" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item "$env:AppData\RustDesk" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item "C:\Program Files\RustDesk" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item "C:\Program Files (x86)\RustDesk" -Recurse -Force -ErrorAction SilentlyContinue

    $latest = Get-LatestRustDeskAsset
    $tempInstaller = Join-Path $env:TEMP $latest.FileName

    Write-Log "Baixando MSI: $($latest.DownloadUrl)"
    Invoke-WebRequest -Uri $latest.DownloadUrl -OutFile $tempInstaller -UseBasicParsing

    Write-Log "Executando msiexec silencioso..."
    $arguments = "/i `"$tempInstaller`" /qn /norestart"
    $proc = Start-Process -FilePath "msiexec.exe" -ArgumentList $arguments -PassThru -Wait

    Write-Log "MSI finalizado com ExitCode: $($proc.ExitCode)"

    if ($proc.ExitCode -notin @(0, 3010)) {
        throw "Falha na instalacao MSI do RustDesk. ExitCode: $($proc.ExitCode)"
    }

    Start-Sleep -Seconds 15

    $exe = Get-RustDeskExePath
    if (-not $exe) {
        throw "Nao foi encontrada uma instalacao valida do RustDesk apos a instalacao."
    }

    if (-not (Test-RustDeskService)) {
        throw "RustDesk foi instalado, mas o servico nao foi criado."
    }

    return $exe
}

function Apply-RustDeskConfig {
    param(
        [string]$ExePath,
        [string]$Password,
        [string]$ServerConfigString,
        [string]$RendezvousHost,
        [string]$Alias
    )

    Write-Log "Aplicando senha local..."
    try {
        & $ExePath --password $Password | Out-Null
    } catch {
        Write-Log "Falha ao aplicar senha local: $($_.Exception.Message)"
    }

    $configApplied = $false

    Write-Log "Aplicando config exportada..."
    try {
        & $ExePath --config $ServerConfigString | Out-Null
        $configApplied = $true
        Write-Log "Config exportada aplicada com sucesso."
    } catch {
        Write-Log "Falha ao aplicar config exportada: $($_.Exception.Message)"
    }

    if (-not $configApplied) {
        Write-Log "Aplicando fallback custom-rendezvous-server..."
        try {
            & $ExePath --option custom-rendezvous-server $RendezvousHost | Out-Null
            Write-Log "Fallback aplicado."
        } catch {
            Write-Log "Falha no fallback: $($_.Exception.Message)"
        }
    }

    Write-Log "Aplicando alias..."
    try {
        & $ExePath --option custom-alias $Alias | Out-Null
    } catch {
        Write-Log "Falha ao aplicar alias: $($_.Exception.Message)"
    }

    Write-Log "Encerrando processos antigos do RustDesk..."
    try {
        Get-Process rustdesk -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    } catch {}

    Start-Sleep -Seconds 3

    $service = Get-Service -Name RustDesk -ErrorAction SilentlyContinue
    if ($service) {
        Write-Log "Reiniciando servico RustDesk..."
        try { Stop-Service -Name RustDesk -Force -ErrorAction SilentlyContinue } catch {}
        Start-Sleep -Seconds 3
        try { Start-Service -Name RustDesk -ErrorAction SilentlyContinue } catch {}
        Start-Sleep -Seconds 5
    } else {
        Write-Log "Servico RustDesk nao encontrado para reinicio."
    }

    Write-Log "Inicializando RustDesk em background para gerar ID..."
    try {
        Start-Process -FilePath $ExePath -ArgumentList "--tray" -WindowStyle Hidden
    } catch {
        Write-Log "Falha ao iniciar processo RustDesk: $($_.Exception.Message)"
    }

    Start-Sleep -Seconds 10
}

function Resolve-RustDeskId {
    param([string]$ExePath)

    try {
        $cliId = & $ExePath --get-id 2>$null
        if (-not [string]::IsNullOrWhiteSpace($cliId)) {
            return $cliId.Trim()
        }
    } catch {}

    $paths = @(
        'C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk2.toml',
        'C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk.toml',
        "$env:APPDATA\RustDesk\config\RustDesk2.toml",
        "$env:APPDATA\RustDesk\config\RustDesk.toml"
    )

    foreach ($p in $paths) {
        if (Test-Path $p) {
            try {
                $content = Get-Content $p -Raw
                if ($content -match "(?m)^id\s*=\s*['`"]?([A-Za-z0-9]+)['`"]?") {
                    return $matches[1].Trim()
                }
            } catch {}
        }
    }

    return $null
}

try {
    Ensure-AgentDir
    Start-Transcript -Path $transcriptPath -Append -Force | Out-Null

    if (-not (Test-IsAdmin)) {
        Write-Log "Solicitando elevacao de privilegios..."
        $argList = "-ExecutionPolicy Bypass -File `"$($MyInvocation.MyCommand.Path)`" -RustDeskPassword `"$RustDeskPassword`""
        Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $argList
        exit
    }

    Write-Log "=== INICIO INSTALADOR TRILINK ==="

    $exe = Install-OrUpdateRustDesk
    Write-Log "Executavel final: $exe"

    Apply-RustDeskConfig `
        -ExePath $exe `
        -Password $RustDeskPassword `
        -ServerConfigString $serverConfig `
        -RendezvousHost $rendezvous `
        -Alias "$machineName - Trilink"

    $id = $null
    for ($i = 1; $i -le 6; $i++) {
        $id = Resolve-RustDeskId -ExePath $exe
        if ($id) { break }
        Write-Log "Tentativa $i sem ID ainda. Aguardando..."
        Start-Sleep -Seconds 5
    }

    if ($id) {
        Write-Log "ID detectado: $id"
    } else {
        throw "ID do RustDesk nao foi gerado."
    }

    Write-Log "=== FIM INSTALADOR TRILINK ==="
    Read-Host "Pressione ENTER para fechar"
}
catch {
    Write-Host ""
    Write-Host "ERRO DURANTE A EXECUCAO:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host "Pressione ENTER para fechar"
}
finally {
    try { Stop-Transcript | Out-Null } catch {}
}