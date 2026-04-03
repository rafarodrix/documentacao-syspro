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

function Get-SystemMetrics {
    $cpu = Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average | Select-Object -ExpandProperty Average
    $mem = Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory
    $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" | Select-Object Size, FreeSpace

    return @{
        cpuLoad      = [int]$cpu
        memTotalKb   = [long]$mem.TotalVisibleMemorySize
        memFreeKb    = [long]$mem.FreePhysicalMemory
        diskSize     = [long]$disk.Size
        diskFree     = [long]$disk.FreeSpace
        lastUpdate   = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss")
    }
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
        systemMetrics  = Get-SystemMetrics
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

function Get-SystemMetrics {
    try {
        `$cpu = Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average | Select-Object -ExpandProperty Average
        `$mem = Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory
        `$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" | Select-Object Size, FreeSpace
        return @{
            cpuLoad      = [int]`$cpu
            memTotalKb   = [long]`$mem.TotalVisibleMemorySize
            memFreeKb    = [long]`$mem.FreePhysicalMemory
            diskSize     = [long]`$disk.Size
            diskFree     = [long]`$disk.FreeSpace
            lastUpdate   = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss")
        }
    } catch { return `$null }
}

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
    # Auto-Heal: Verifica se o servico RustDesk esta rodando
    `$rdService = Get-Service -Name RustDesk -ErrorAction SilentlyContinue
    if (`$rdService -and `$rdService.Status -ne 'Running') {
        Start-Service RustDesk -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 5
    }

    Get-ChildItem -Path `$agentDir -Filter "*.log" -ErrorAction SilentlyContinue |
        Where-Object { `$_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
        Remove-Item -Force -ErrorAction SilentlyContinue

    `$rustdeskId = Resolve-RustDeskId
    if (-not `$rustdeskId) { exit }

    `$payload = @{
        discoveryToken = `$DiscoveryToken
        rustdeskId     = `$rustdeskId
        machineName    = `$machineName
        agentVersion   = 'rustdesk-v3.3-heartbeat'
        serviceStatus  = 'running'
        sysproUpdates  = Get-SysproUpdates
        systemMetrics  = Get-SystemMetrics
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

    Write-Log "=== INICIO TRILINK v3.3 (ENRIQUECIDO) ===" -Color Cyan

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
        Invoke-DiscoveryPost -RustDeskId $id -MachineName $machineName -ServiceStatus "running" -VersionTag "rustdesk-v3.3-stable" | Out-Null
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

    Write-Log "Heartbeat enriquecido v3.3 configurado (Startup + 5min)." -Color Green
}
catch {
    Write-Log "ERRO: $($_.Exception.Message)" -Color Red
}
finally {
    try { Stop-Transcript | Out-Null } catch {}
    Read-Host "Pressione ENTER para fechar"
}

