param(
    [string]$RustDeskPassword = 'Trilink098',
    [string]$DiscoveryToken = '3dacac7beba253a33e953e6b2f970ac594c06b3152ab285e7015085b4494ee44',
    [string]$ApiBaseUrl = 'https://ajuda.trilinksoftware.com.br'
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$rendezvous     = 'acesso.trilinksoftware.com.br'
$serverConfig   = '==Qfi0TVnZTc3YHT1EldidXbJhkbRBzTJ5Wc4BjR4hlN3FHMYBnYit0KIFlbwZkNiojI5V2aiwiIiojIpBXYiwiIyJmLt92YuUmchdHdm92cr5Waslmc05ybzNXZjFmI6ISehxWZyJCLiInYu02bj5SZyF2d0Z2bztmbpxWayRnLvN3clNWYiojI0N3boJye'
$machineName    = $env:COMPUTERNAME
$agentDir       = 'C:\Trilink\Agent'
$transcriptPath = Join-Path $agentDir 'transcript.log'
$heartbeatPath  = Join-Path $agentDir 'heartbeat-discovery.ps1'
$taskName       = 'Trilink_RemoteAgent_Discovery'

function Write-Log {
    param([string]$Message, [ConsoleColor]$Color = "White")
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $Color
}

function Get-SysproUpdates {
    $updates = @()
    $paths = @("C:\syspro\sysptoserver.exe", "D:\syspro\sysptoserver.exe")

    foreach ($p in $paths) {
        if (Test-Path $p) {
            $f = Get-Item $p
            $updates += @{
                empresa = $env:COMPUTERNAME
                caminho = $p
                ultimaAtualizacao = $f.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
            }
        }
    }

    return $updates
}

function Resolve-RustDeskId {
    param([string]$ExePath)

    $tmpFile = "$env:TEMP\rd_id_capture.txt"
    try {
        Start-Process -FilePath $ExePath -ArgumentList "--get-id" -RedirectStandardOutput $tmpFile -NoNewWindow -Wait
        if (Test-Path $tmpFile) {
            $rawId = Get-Content $tmpFile -Raw
            Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
            if ($rawId -match '(\d{7,10})') {
                return $matches[1].Replace(" ", "").Trim()
            }
        }
    } catch {}

    $reg = "HKLM:\SOFTWARE\RustDesk"
    if (Test-Path $reg) {
        $val = Get-ItemProperty -Path $reg -Name "id" -ErrorAction SilentlyContinue
        if ($val.id -match '\d{7,10}') {
            return $val.id.ToString().Trim()
        }
    }

    return $null
}

function Install-OrUpdateRustDesk {
    $exePath = "C:\Program Files\RustDesk\rustdesk.exe"
    if (Test-Path $exePath) { return $exePath }

    Write-Log "Instalando RustDesk v1.4.6..." -Color Yellow
    $url = "https://github.com/rustdesk/rustdesk/releases/download/1.4.6/rustdesk-1.4.6-x86_64.msi"
    $msiPath = "$env:TEMP\rd.msi"

    try {
        Invoke-WebRequest -Uri $url -OutFile $msiPath -UseBasicParsing -TimeoutSec 120
        Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /qn /norestart" -Wait
        Start-Sleep -Seconds 15
    } finally {
        if (Test-Path $msiPath) {
            Remove-Item $msiPath -Force -ErrorAction SilentlyContinue
        }
    }

    return $exePath
}

function Invoke-DiscoveryPost {
    param(
        [string]$RustDeskId,
        [string]$MachineName,
        [string]$ServiceStatus,
        [string]$VersionTag
    )

    $payload = @{
        discoveryToken = $DiscoveryToken
        rustdeskId     = $RustDeskId
        machineName    = $MachineName
        agentVersion   = $VersionTag
        serviceStatus  = $ServiceStatus
        sysproUpdates  = Get-SysproUpdates
    } | ConvertTo-Json -Depth 5

    Invoke-RestMethod `
        -Uri "$ApiBaseUrl/api/remote/agents/discover" `
        -Method Post `
        -Body $payload `
        -ContentType "application/json" `
        -TimeoutSec 30
}

function Write-HeartbeatScript {
    $script = @"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
`$ErrorActionPreference = 'Stop'

`$DiscoveryToken = '$DiscoveryToken'
`$ApiBaseUrl = '$ApiBaseUrl'
`$agentDir = '$agentDir'
`$machineName = `$env:COMPUTERNAME

function Get-SysproUpdates {
    `$updates = @()
    `$paths = @("C:\syspro\sysptoserver.exe", "D:\syspro\sysptoserver.exe")
    foreach (`$p in `$paths) {
        if (Test-Path `$p) {
            `$f = Get-Item `$p
            `$updates += @{
                empresa = `$env:COMPUTERNAME
                caminho = `$p
                ultimaAtualizacao = `$f.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
            }
        }
    }
    return `$updates
}

function Resolve-RustDeskId {
    `$exePath = "C:\Program Files\RustDesk\rustdesk.exe"
    if (-not (Test-Path `$exePath)) { return `$null }

    `$tmpFile = "`$env:TEMP\rd_id_capture.txt"
    try {
        Start-Process -FilePath `$exePath -ArgumentList "--get-id" -RedirectStandardOutput `$tmpFile -NoNewWindow -Wait
        if (Test-Path `$tmpFile) {
            `$rawId = Get-Content `$tmpFile -Raw
            Remove-Item `$tmpFile -Force -ErrorAction SilentlyContinue
            if (`$rawId -match '(\d{7,10})') {
                return `$matches[1].Replace(" ", "").Trim()
            }
        }
    } catch {}

    `$reg = "HKLM:\SOFTWARE\RustDesk"
    if (Test-Path `$reg) {
        `$val = Get-ItemProperty -Path `$reg -Name "id" -ErrorAction SilentlyContinue
        if (`$val.id -match '\d{7,10}') {
            return `$val.id.ToString().Trim()
        }
    }

    return `$null
}

try {
    Get-ChildItem -Path `$agentDir -Filter "*.log" -ErrorAction SilentlyContinue |
        Where-Object { `$_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
        Remove-Item -Force -ErrorAction SilentlyContinue

    `$rustdeskId = Resolve-RustDeskId
    if (-not `$rustdeskId) { exit }

    `$payload = @{
        discoveryToken = `$DiscoveryToken
        rustdeskId     = `$rustdeskId
        machineName    = `$machineName
        agentVersion   = 'rustdesk-v3.2-heartbeat'
        serviceStatus  = 'running'
        sysproUpdates  = Get-SysproUpdates
    } | ConvertTo-Json -Depth 5

    Invoke-RestMethod `
        -Uri "`$ApiBaseUrl/api/remote/agents/discover" `
        -Method Post `
        -Body `$payload `
        -ContentType "application/json" `
        -TimeoutSec 30 | Out-Null
}
catch {
    `$err = "[`$((Get-Date).ToString('s'))] `$(`$_.Exception.Message)"
    Out-File -FilePath "`$agentDir\discovery_error.log" -InputObject `$err -Append -Encoding utf8
}
"@

    Set-Content -Path $heartbeatPath -Value $script -Encoding UTF8 -Force
}

function Register-HeartbeatTask {
    if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }

    $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$heartbeatPath`""
    $triggerStartup = New-ScheduledTaskTrigger -AtStartup
    $triggerRepeat = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
    $principal = New-ScheduledTaskPrincipal -UserId 'NT AUTHORITY\SYSTEM' -LogonType ServiceAccount -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -DontStopOnIdleEnd

    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($triggerStartup, $triggerRepeat) -Principal $principal -Settings $settings -Force | Out-Null
}

try {
    if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        $argList = "-ExecutionPolicy Bypass -File `"$PSCommandPath`" -RustDeskPassword `"$RustDeskPassword`" -DiscoveryToken `"$DiscoveryToken`" -ApiBaseUrl `"$ApiBaseUrl`""
        Start-Process powershell.exe -ArgumentList $argList -Verb RunAs
        exit
    }

    if (-not (Test-Path $agentDir)) {
        New-Item -ItemType Directory $agentDir -Force | Out-Null
    }

    Start-Transcript -Path $transcriptPath -Append -Force | Out-Null

    Write-Log "=== INICIO TRILINK v3.2 (PRODUCAO) ===" -Color Cyan

    $exe = Install-OrUpdateRustDesk
    Write-Log "Configurando RustDesk..."
    & $exe --password $RustDeskPassword | Out-Null
    & $exe --config $serverConfig | Out-Null

    Restart-Service RustDesk -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 5
    Start-Process -FilePath $exe -ArgumentList "--tray" -WindowStyle Hidden -ErrorAction SilentlyContinue

    $id = $null
    for ($i = 1; $i -le 10; $i++) {
        $id = Resolve-RustDeskId -ExePath $exe
        if ($id) { break }
        Write-Log "Tentativa ${i}: Aguardando geracao do ID..." -Color Yellow
        Start-Sleep -Seconds 10
    }

    if (-not $id) {
        throw "ID nao capturado apos instalacao."
    }

    Write-Log "ID DETECTADO: $id" -Color Green
    Write-Log "Enviando para API: $ApiBaseUrl/api/remote/agents/discover" -Color Cyan

    try {
        Invoke-DiscoveryPost -RustDeskId $id -MachineName $machineName -ServiceStatus "running" -VersionTag "rustdesk-v3.2-stable" | Out-Null
        Write-Log "REGISTRO CONCLUIDO COM SUCESSO!" -Color Green
    } catch {
        $statusCode = $null
        $responseBody = $null

        if ($_.Exception.Response) {
            try { $statusCode = [int]$_.Exception.Response.StatusCode } catch {}
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $responseBody = $reader.ReadToEnd()
                    $reader.Close()
                }
            } catch {}
        }

        Write-Log "ERRO NO ENVIO API: $($_.Exception.Message)" -Color Red
        if ($statusCode) { Write-Log "Status HTTP: $statusCode" -Color Red }
        if ($responseBody) { Write-Log "Resposta API: $responseBody" -Color Yellow }
    }

    Write-HeartbeatScript
    Register-HeartbeatTask

    Start-Process powershell.exe -ArgumentList "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$heartbeatPath`"" -WindowStyle Hidden

    Write-Log "Heartbeat configurado para iniciar com o Windows e repetir a cada 5 minutos." -Color Green
}
catch {
    Write-Log "ERRO: $($_.Exception.Message)" -Color Red
}
finally {
    try { Stop-Transcript | Out-Null } catch {}
    Read-Host "Pressione ENTER para fechar"
}

