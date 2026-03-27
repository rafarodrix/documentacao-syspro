import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { getRemoteModuleSettingsSnapshot } from "@/features/remote/application/module-settings";

export const dynamic = "force-dynamic";

function canManageHost(role: string): boolean {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
}

function escapePowerShell(value: string | null | undefined) {
  return (value ?? "").replace(/'/g, "''");
}

function buildDiscoveryScript(input: {
  portalBaseUrl: string;
  discoveryToken: string;
  rustDeskServerHost: string;
  rustDeskServerConfig: string;
  rustDeskPublicKey: string;
  rustDeskVersion: string;
  heartbeatIntervalMinutes: number;
  defaultPassword: string;
}) {
  const escapedPortalBaseUrl = escapePowerShell(input.portalBaseUrl);
  const escapedDiscoveryToken = escapePowerShell(input.discoveryToken);
  const escapedServerHost = escapePowerShell(input.rustDeskServerHost);
  const escapedServerConfig = escapePowerShell(input.rustDeskServerConfig);
  const escapedPublicKey = escapePowerShell(input.rustDeskPublicKey);
  const escapedVersion = escapePowerShell(input.rustDeskVersion);
  const heartbeatIntervalMinutes = Math.max(1, Math.min(120, input.heartbeatIntervalMinutes));
  const escapedDefaultPassword = escapePowerShell(input.defaultPassword);

  return `param(
    [string]$RustDeskPassword = '${escapedDefaultPassword}'
)

# Trilink Remote Agent OSS - Script Padrao de Descoberta
# Fluxo: instala a maquina no portal sem pre-cadastro e envia heartbeat continuo

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host 'Solicitando elevacao para administrador...' -ForegroundColor Yellow
    try {
        $scriptPath = $MyInvocation.MyCommand.Path
        if ([string]::IsNullOrWhiteSpace($scriptPath)) {
            throw 'Caminho do script nao identificado.'
        }
        Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList "-NoExit -ExecutionPolicy Bypass -File \`"$scriptPath\`""
        Write-Host 'Uma nova janela administrativa foi aberta.' -ForegroundColor Green
        Write-Host 'Aprove o UAC e acompanhe a instalacao nela.' -ForegroundColor Cyan
        Write-Host 'Pressione qualquer tecla para fechar esta janela auxiliar.' -ForegroundColor DarkGray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    } catch {
        Write-Host "Nao foi possivel solicitar elevacao automatica: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host 'Clique com o botao direito no arquivo e execute como administrador.' -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    exit
}

$ErrorActionPreference = 'Stop'
$portalBaseUrl = '${escapedPortalBaseUrl}'
$discoveryToken = '${escapedDiscoveryToken}'
$expectedRustDeskVersion = '${escapedVersion}'
$rustDeskDownloadUrl = "https://github.com/rustdesk/rustdesk/releases/download/$expectedRustDeskVersion/rustdesk-$expectedRustDeskVersion-x86_64.msi"
$customRendezvousServer = '${escapedServerHost}'
$serverConfig = '${escapedServerConfig}'
$customServerKey = '${escapedPublicKey}'
$machineName = $env:COMPUTERNAME
$agentVersion = 'rustdesk-oss-discovery'
$aliasMaquina = "$machineName - Trilink Discovery"
$agentDir = 'C:\\Trilink\\Agent'
$heartbeatScriptPath = "$agentDir\\heartbeat-discovery.ps1"
$taskName = 'Trilink_RemoteAgent_Discovery'
$discoveryLogPath = "$agentDir\\discovery_install.log"
$errorLogPath = "$agentDir\\discovery_error.log"

$servidoresSyspro = @(
    @{ Empresa = $machineName; Caminho = 'C:\\syspro\\sysptoserver.exe' }
    # @{ Empresa = 'Empresa Y'; Caminho = 'D:\\syspro_clienteY\\sysptoserver.exe' }
)

function Normalize-RustDeskId {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    $normalized = (($Value -replace '\\s+', '').Trim())
    if ($normalized -match '^\d{7,12}$') { return $normalized }
    return $null
}

function Prompt-RustDeskId {
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        $rawInput = Read-Host 'Informe o RustDesk ID manualmente'
        $digitsOnly = (([string]$rawInput) -replace '\D', '').Trim()
        $normalized = Normalize-RustDeskId -Value $digitsOnly
        if ($normalized) {
            return $normalized
        }

        Write-Host 'RustDesk ID invalido. Informe apenas numeros com 7 a 12 digitos.' -ForegroundColor Yellow
    }

    return $null
}

function Resolve-ExecutablePathCandidate {
    param([string]$RawValue)

    if ([string]::IsNullOrWhiteSpace($RawValue)) { return $null }

    $value = $RawValue.Trim() -replace '^\\\\\?\\', ''
    $patterns = @(
        '"([^"]+?\\.exe)"',
        '([A-Za-z]:\\[^"]+?\\.exe)',
        '([A-Za-z]:\\[^\\r\\n]+?\\.exe)'
    )

    foreach ($pattern in $patterns) {
        if ($value -match $pattern) {
            $candidate = $matches[1].Trim().Trim('"')
            if ($candidate -match '(?i)rustdesk\\.exe$') {
                return $candidate
            }
        }
    }

    return $null
}

function Find-RustDeskExecutable {
    $paths = @(
        'C:\\Program Files\\RustDesk\\rustdesk.exe',
        'C:\\Program Files (x86)\\RustDesk\\rustdesk.exe'
    )
    foreach ($path in $paths) {
        if (Test-Path -LiteralPath $path) { return $path }
    }

    $service = Get-CimInstance Win32_Service -Filter "Name = 'RustDesk'" -ErrorAction SilentlyContinue
    if ($service -and $service.PathName) {
        $servicePath = Resolve-ExecutablePathCandidate -RawValue ([string]$service.PathName)
        if ($servicePath -and (Test-Path -LiteralPath $servicePath)) {
            return $servicePath
        }
    }

    $uninstallKeys = @(
        'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
        'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
    )

    foreach ($key in $uninstallKeys) {
        $entries = Get-ItemProperty -Path $key -ErrorAction SilentlyContinue
        foreach ($entry in $entries) {
            if (($entry.DisplayName -like 'RustDesk*') -or ($entry.Publisher -like '*RustDesk*')) {
                if ($entry.DisplayIcon) {
                    $candidate = Resolve-ExecutablePathCandidate -RawValue ([string]$entry.DisplayIcon)
                    if ($candidate -and (Test-Path -LiteralPath $candidate)) {
                        return $candidate
                    }
                }

                if ($entry.InstallLocation) {
                    $candidate = Join-Path ([string]$entry.InstallLocation) 'rustdesk.exe'
                    if (Test-Path -LiteralPath $candidate) {
                        return $candidate
                    }
                }
            }
        }
    }

    return $null
}

function Get-RustDeskVersion {
    param([string]$ExecutablePath)
    if (-not (Test-Path -LiteralPath $ExecutablePath)) { return $null }
    return (Get-Item $ExecutablePath).VersionInfo.ProductVersion
}

function Install-Or-Update-RustDesk {
    $rustdeskExe = Find-RustDeskExecutable
    $currentVersion = if ($rustdeskExe) { Get-RustDeskVersion -ExecutablePath $rustdeskExe } else { $null }
    $needsInstall = (-not $rustdeskExe)

    if ($needsInstall) {
        Write-Host 'RustDesk nao encontrado. Baixando instalador...' -ForegroundColor Yellow
        Write-InstallLog -Message "Instalando RustDesk na versao $expectedRustDeskVersion."

        $tempInstaller = "$env:TEMP\\rustdesk_installer.msi"
        try {
            Invoke-WebRequest -Uri $rustDeskDownloadUrl -OutFile $tempInstaller -UseBasicParsing -TimeoutSec 120
            $msiArgs = "/i \`"$tempInstaller\`" /qn /norestart"
            $installProcess = Start-Process -FilePath "msiexec.exe" -ArgumentList $msiArgs -Wait -WindowStyle Hidden -PassThru
            if ($installProcess.ExitCode -ne 0) {
                throw "MSI retornou codigo $($installProcess.ExitCode)."
            }
        } finally {
            if (Test-Path $tempInstaller) {
                Remove-Item -Path $tempInstaller -Force -ErrorAction SilentlyContinue
            }
        }
    } elseif ($currentVersion -and $currentVersion -ne $expectedRustDeskVersion) {
        Write-Host "RustDesk ja instalado na versao $currentVersion. Upgrade automatico ignorado para preservar a instalacao existente." -ForegroundColor Yellow
        Write-InstallLog -Message "Instalacao existente detectada na versao $currentVersion. Upgrade automatico ignorado; mantendo a instalacao atual."
    } else {
        Write-Host "RustDesk ja esta na versao esperada ($expectedRustDeskVersion)." -ForegroundColor Green
        Write-InstallLog -Message "RustDesk ja esta na versao esperada ($expectedRustDeskVersion)."
    }

    for ($attempt = 1; $attempt -le 6; $attempt++) {
        $resolvedExe = Find-RustDeskExecutable
        if ($resolvedExe) {
            return $resolvedExe
        }

        Start-Sleep -Seconds 3
    }

    return $null
}

function Resolve-RustDeskId {
    $tmpFile = "$env:TEMP\rd_id_capture.txt"
    $exePath = Find-RustDeskExecutable

    if ($exePath -and (Test-Path -LiteralPath $exePath)) {
        try {
            Start-Process -FilePath $exePath -ArgumentList "--get-id" -RedirectStandardOutput $tmpFile -NoNewWindow -Wait
            if (Test-Path $tmpFile) {
                $rawId = Get-Content $tmpFile -Raw
                Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
                if ($rawId -match '(\d{7,12})') {
                    $cleanId = $matches[1].Replace(" ", "").Trim()
                    return Normalize-RustDeskId -Value $cleanId
                }
            }
        } catch {}
    }

    $regPaths = @(
        'HKLM:\SOFTWARE\RustDesk',
        'HKLM:\SOFTWARE\WOW6432Node\RustDesk'
    )

    foreach ($regPath in $regPaths) {
        if (Test-Path $regPath) {
            $val = Get-ItemProperty -Path $regPath -Name 'id' -ErrorAction SilentlyContinue
            if ($val -and $val.id -match '\d{7,12}') {
                $cleanId = $val.id.ToString().Replace(" ", "").Trim()
                return Normalize-RustDeskId -Value $cleanId
            }
        }
    }

    $configPaths = @(
        'C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk.toml',
        'C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk2.toml',
        'C:\Windows\System32\config\systemprofile\AppData\Roaming\RustDesk\config\RustDesk.toml',
        'C:\Windows\System32\config\systemprofile\AppData\Roaming\RustDesk\config\RustDesk2.toml',
        'C:\ProgramData\RustDesk\config\RustDesk.toml',
        'C:\ProgramData\RustDesk\config\RustDesk2.toml',
        "$env:APPDATA\\RustDesk\\config\\RustDesk.toml",
        "$env:APPDATA\\RustDesk\\config\\RustDesk2.toml"
    )

    foreach ($configPath in $configPaths) {
        if (Test-Path $configPath) {
            $content = Get-Content $configPath -Raw -Encoding UTF8
            if ($content -match 'id\s*=\s*[''""]?(\d{7,12})[''""]?') {
                $cleanId = $Matches[1].Replace(" ", "").Trim()
                return Normalize-RustDeskId -Value $cleanId
            }
        }
    }

    return $null
}

function Write-InstallLog {
    param([string]$Message)
    Out-File -FilePath $discoveryLogPath -InputObject "[$((Get-Date).ToString('s'))] $Message" -Append -Encoding utf8
}

function Write-InstallError {
    param([string]$Message)
    Out-File -FilePath $errorLogPath -InputObject "[$((Get-Date).ToString('s'))] $Message" -Append -Encoding utf8
}

function Get-ApiErrorDetails {
    param([object]$ErrorRecord)

    $statusCode = $null
    $responseBody = $null

    if ($ErrorRecord.Exception.Response) {
        try { $statusCode = [int]$ErrorRecord.Exception.Response.StatusCode } catch {}
        try {
            $stream = $ErrorRecord.Exception.Response.GetResponseStream()
            if ($stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                $responseBody = $reader.ReadToEnd()
                $reader.Close()
            }
        } catch {}
    }

    return @{
        statusCode = $statusCode
        responseBody = $responseBody
        message = $ErrorRecord.Exception.Message
    }
}

function Get-RustDeskProcess {
    return Get-Process -Name 'rustdesk' -ErrorAction SilentlyContinue | Select-Object -First 1
}

function Get-RustDeskService {
    $service = Get-Service -Name 'RustDesk' -ErrorAction SilentlyContinue
    if ($service) { return $service }

    return Get-Service -DisplayName '*RustDesk*' -ErrorAction SilentlyContinue | Select-Object -First 1
}

function Test-PortalConnection {
    try {
        Invoke-WebRequest -Uri $portalBaseUrl -Method Head -UseBasicParsing -TimeoutSec 20 | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Get-ServiceHealthStatus {
    $serviceStatus = 'not_found'
    $svc = Get-RustDeskService
    if ($svc) {
        if ($svc.Status -ne 'Running') {
            try {
                Start-Service -InputObject $svc -ErrorAction Stop
                $serviceStatus = 'restarted_by_agent'
            } catch {
                $serviceStatus = $svc.Status.ToString().ToLower()
            }
        } else {
            $serviceStatus = 'running'
        }
    } elseif (Get-RustDeskProcess) {
        $serviceStatus = 'running'
    }

    return $serviceStatus
}

function Get-SysproUpdates {
    $resultadosUpdates = @()
    foreach ($srv in $servidoresSyspro) {
        $dataAtualizacao = $null
        if (Test-Path $srv.Caminho) {
            $dataAtualizacao = (Get-Item $srv.Caminho).LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
        }

        $resultadosUpdates += @{
            empresa = $srv.Empresa
            caminho = $srv.Caminho
            ultimaAtualizacao = $dataAtualizacao
        }
    }

    return $resultadosUpdates
}

function Invoke-Discovery {
    param(
        [string]$RustDeskId,
        [string]$ServiceStatus
    )

    $payload = @{
        discoveryToken = $discoveryToken
        rustdeskId = $RustDeskId
        machineName = $machineName
        agentVersion = $agentVersion
        provider = 'RustDesk'
        serviceStatus = $ServiceStatus
        sysproUpdates = Get-SysproUpdates
    }

    Invoke-RestMethod -Method Post -Uri "$portalBaseUrl/api/remote/agents/discover" -ContentType 'application/json' -Body ($payload | ConvertTo-Json -Depth 6) -TimeoutSec 30 -ErrorAction Stop
}

if (-not (Test-Path $agentDir)) {
    New-Item -ItemType Directory -Path $agentDir -Force | Out-Null
}

Write-Host '=========================================================' -ForegroundColor DarkGray
Write-Host ' Trilink Remote Agent - Instalador Padrao' -ForegroundColor Cyan
Write-Host '=========================================================' -ForegroundColor DarkGray
Write-Host "Maquina: $machineName" -ForegroundColor Gray
Write-Host "Portal: $portalBaseUrl" -ForegroundColor Gray
Write-Host ''

Write-Host '[0/5] Validando conectividade com o portal...' -ForegroundColor Cyan
if (Test-PortalConnection) {
    Write-Host 'Portal acessivel.' -ForegroundColor Green
    Write-InstallLog -Message 'Portal acessivel na validacao inicial.'
} else {
    Write-Host 'Falha ao validar conectividade inicial com o portal. O instalador vai continuar e registrar erro se o envio falhar.' -ForegroundColor Yellow
    Write-InstallError -Message 'Falha na validacao inicial de conectividade com o portal.'
}

Write-Host '[1/5] Verificando RustDesk...' -ForegroundColor Cyan
$rustdeskExe = Install-Or-Update-RustDesk

if (-not $rustdeskExe) {
    Write-Host 'RustDesk nao encontrado apos instalacao.' -ForegroundColor Red
    Write-InstallError -Message 'RustDesk nao encontrado apos instalacao.'
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

Write-Host '[2/5] Aplicando configuracoes do RustDesk...' -ForegroundColor Cyan
Start-Process -FilePath $rustdeskExe -ArgumentList "--password $RustDeskPassword" -Wait -WindowStyle Hidden
if (-not [string]::IsNullOrWhiteSpace($serverConfig)) {
    try {
        Start-Process -FilePath $rustdeskExe -ArgumentList "--config $serverConfig" -Wait -WindowStyle Hidden
    } catch {
        Write-Host "Falha ao aplicar config exportada do RustDesk: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-InstallError -Message "Falha ao aplicar config exportada do RustDesk: $($_.Exception.Message)"
    }
}
if (-not [string]::IsNullOrWhiteSpace($customRendezvousServer)) {
    Start-Process -FilePath $rustdeskExe -ArgumentList "--option custom-rendezvous-server $customRendezvousServer" -Wait -WindowStyle Hidden
}
if (-not [string]::IsNullOrWhiteSpace($customServerKey)) {
    Start-Process -FilePath $rustdeskExe -ArgumentList "--option key $customServerKey" -Wait -WindowStyle Hidden
}
Start-Process -FilePath $rustdeskExe -ArgumentList "--option custom-alias \`"$aliasMaquina\`"" -Wait -WindowStyle Hidden
Restart-Service -Name 'RustDesk' -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 5

$servidoresJson = $servidoresSyspro | ConvertTo-Json -Compress -Depth 5

Write-Host '[3/5] Validando RustDesk ID e enviando a primeira descoberta...' -ForegroundColor Cyan
$rustdeskId = Resolve-RustDeskId
if ([string]::IsNullOrWhiteSpace($rustdeskId)) {
    Write-Host 'Nao foi possivel descobrir o RustDesk ID automaticamente.' -ForegroundColor Yellow
    $rustdeskId = Prompt-RustDeskId
}

if ([string]::IsNullOrWhiteSpace($rustdeskId)) {
    Write-Host 'RustDesk ID obrigatorio para continuar.' -ForegroundColor Red
    Write-InstallError -Message 'RustDesk ID nao informado.'
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

$serviceStatus = Get-ServiceHealthStatus

try {
    $discoveryResponse = Invoke-Discovery -RustDeskId $rustdeskId -ServiceStatus $serviceStatus
    Write-Host "Primeiro envio concluido com sucesso. RustDesk ID: $rustdeskId" -ForegroundColor Green
    Write-InstallLog -Message "Descoberta inicial enviada com sucesso. RustDesk ID: $rustdeskId"
    if ($discoveryResponse.data.message) {
        Write-Host $discoveryResponse.data.message -ForegroundColor Cyan
        Write-InstallLog -Message $discoveryResponse.data.message
    }
    if ($discoveryResponse.data.bootstrapFlow -eq 'host_installer_required') {
        Write-Host 'Esta maquina ja pertence a um host vinculado. Baixe o instalador dedicado desse host no portal para concluir o bootstrap com agentToken.' -ForegroundColor Yellow
        Write-InstallLog -Message 'Discover detectou host vinculado. Orientado uso do instalador dedicado do host.'
    } elseif ($discoveryResponse.data.bootstrapFlow -eq 'pending_link') {
        Write-Host 'A maquina foi enviada para triagem. Depois do vinculo no portal, use o instalador dedicado do host para emitir agentToken.' -ForegroundColor Cyan
    }
} catch {
    $apiError = Get-ApiErrorDetails -ErrorRecord $_
    Write-Host "Falha ao enviar descoberta inicial: $($apiError.message)" -ForegroundColor Red
    if ($apiError.statusCode) {
        Write-InstallError -Message "Falha na descoberta inicial. Status HTTP: $($apiError.statusCode). Resposta: $($apiError.responseBody)"
    } else {
        Write-InstallError -Message "Falha na descoberta inicial: $($apiError.message)"
    }
    Write-Host "Log salvo em: $errorLogPath" -ForegroundColor Yellow
}

Write-Host '[4/5] Gerando heartbeat continuo...' -ForegroundColor Cyan

$heartbeatScriptContent = @'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$portalBaseUrl = 'PORTAL_BASE_URL'
$discoveryToken = 'DISCOVERY_TOKEN'
$machineName = 'MACHINE_NAME'
$agentVersion = 'AGENT_VERSION'
$listaServidores = ConvertFrom-Json 'SERVIDORES_JSON'

Get-ChildItem -Path 'C:\Trilink\Agent' -Filter '*.log' -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
    Remove-Item -Force -ErrorAction SilentlyContinue

function Normalize-RustDeskId {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    $normalized = (($Value -replace '\\s+', '').Trim())
    if ($normalized -match '^\d{7,12}$') { return $normalized }
    return $null
}

function Resolve-RustDeskId {
    $tmpFile = "$env:TEMP\rd_id_capture.txt"
    $exePath = "C:\Program Files\RustDesk\rustdesk.exe"

    # Try to generate ID by starting RustDesk briefly if not found
    if (Test-Path $exePath) {
        try {
            # Start RustDesk in background for a few seconds to ensure ID is generated
            $rustdeskProcess = Start-Process -FilePath $exePath -ArgumentList "--silent" -NoNewWindow -PassThru
            Start-Sleep -Seconds 3
            if (-not $rustdeskProcess.HasExited) {
                Stop-Process -Id $rustdeskProcess.Id -Force -ErrorAction SilentlyContinue
            }
        } catch {}
    }

    if (Test-Path $exePath) {
        try {
            Start-Process -FilePath $exePath -ArgumentList "--get-id" -RedirectStandardOutput $tmpFile -NoNewWindow -Wait
            if (Test-Path $tmpFile) {
                $rawId = Get-Content $tmpFile -Raw
                Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
                if ($rawId -match '(\d{7,12})') {
                    return Normalize-RustDeskId -Value $matches[1]
                }
            }
        } catch {}
    }

    $regPaths = @(
        'HKLM:\SOFTWARE\RustDesk',
        'HKLM:\SOFTWARE\WOW6432Node\RustDesk'
    )

    foreach ($regPath in $regPaths) {
        if (Test-Path $regPath) {
            $val = Get-ItemProperty -Path $regPath -Name 'id' -ErrorAction SilentlyContinue
            if ($val -and $val.id -match '\d{7,12}') {
                return Normalize-RustDeskId -Value $val.id.ToString()
            }
        }
    }

    $configPaths = @(
        'C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk.toml',
        'C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk2.toml',
        'C:\Windows\System32\config\systemprofile\AppData\Roaming\RustDesk\config\RustDesk.toml',
        'C:\Windows\System32\config\systemprofile\AppData\Roaming\RustDesk\config\RustDesk2.toml',
        'C:\ProgramData\RustDesk\config\RustDesk.toml',
        'C:\ProgramData\RustDesk\config\RustDesk2.toml',
        "$env:APPDATA\\RustDesk\\config\\RustDesk.toml",
        "$env:APPDATA\\RustDesk\\config\\RustDesk2.toml"
    )

    foreach ($configPath in $configPaths) {
        if (Test-Path $configPath) {
            $content = Get-Content $configPath -Raw -Encoding UTF8
            # Try different regex patterns for ID
            if ($content -match "id\s*=\s*['\""]?(\d{7,12})['\""]?") {
                return Normalize-RustDeskId -Value $Matches[1]
            }
        }
    }

    return $null
}

function Write-HeartbeatError {
    param([string]$Message)
    $errorMsg = "[$((Get-Date).ToString('s'))] $Message"
    Out-File -FilePath 'C:\Trilink\Agent\discovery_error.log' -InputObject $errorMsg -Append -Encoding utf8
}

function Get-ApiErrorDetails {
    param([object]$ErrorRecord)

    $statusCode = $null
    $responseBody = $null

    if ($ErrorRecord.Exception.Response) {
        try { $statusCode = [int]$ErrorRecord.Exception.Response.StatusCode } catch {}
        try {
            $stream = $ErrorRecord.Exception.Response.GetResponseStream()
            if ($stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                $responseBody = $reader.ReadToEnd()
                $reader.Close()
            }
        } catch {}
    }

    return @{
        statusCode = $statusCode
        responseBody = $responseBody
        message = $ErrorRecord.Exception.Message
    }
}

function Get-RustDeskProcess {
    return Get-Process -Name 'rustdesk' -ErrorAction SilentlyContinue | Select-Object -First 1
}

function Get-RustDeskService {
    $service = Get-Service -Name 'RustDesk' -ErrorAction SilentlyContinue
    if ($service) { return $service }

    return Get-Service -DisplayName '*RustDesk*' -ErrorAction SilentlyContinue | Select-Object -First 1
}

$rustdeskId = Resolve-RustDeskId
$serviceStatus = 'not_found'
$svc = Get-RustDeskService
if ($svc) {
    if ($svc.Status -ne 'Running') {
        try {
            Start-Service -InputObject $svc -ErrorAction Stop
            $serviceStatus = 'restarted_by_agent'
        } catch {
            $serviceStatus = $svc.Status.ToString().ToLower()
        }
    } else {
        $serviceStatus = 'running'
    }
} elseif (Get-RustDeskProcess) {
    $serviceStatus = 'running'
}

$resultadosUpdates = @()
foreach ($srv in $listaServidores) {
    $dataAtualizacao = $null
    if (Test-Path $srv.Caminho) {
        $dataAtualizacao = (Get-Item $srv.Caminho).LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
    }

    $resultadosUpdates += @{
        empresa = $srv.Empresa
        caminho = $srv.Caminho
        ultimaAtualizacao = $dataAtualizacao
    }
}

$payload = @{
    discoveryToken = $discoveryToken
    rustdeskId = $rustdeskId
    machineName = $machineName
    agentVersion = $agentVersion
    provider = 'RustDesk'
    serviceStatus = $serviceStatus
    sysproUpdates = $resultadosUpdates
}

try {
    $response = Invoke-RestMethod -Method Post -Uri "$portalBaseUrl/api/remote/agents/discover" -ContentType 'application/json' -Body ($payload | ConvertTo-Json -Depth 6) -TimeoutSec 30 -ErrorAction Stop
    if ($response.data.bootstrapFlow -eq 'host_installer_required') {
        Write-HeartbeatError -Message 'Discover detectou host vinculado. Este fluxo nao substitui o bootstrap autenticado por agentToken; use o instalador dedicado do host.'
    }
} catch {
    $apiError = Get-ApiErrorDetails -ErrorRecord $_
    if ($apiError.statusCode) {
        Write-HeartbeatError -Message "Erro na descoberta. Status HTTP: $($apiError.statusCode). Resposta: $($apiError.responseBody)"
    } else {
        Write-HeartbeatError -Message "Erro na descoberta: $($apiError.message)"
    }
}
'@

$heartbeatScriptContent = $heartbeatScriptContent.Replace('PORTAL_BASE_URL', '${escapedPortalBaseUrl}')
$heartbeatScriptContent = $heartbeatScriptContent.Replace('DISCOVERY_TOKEN', '${escapedDiscoveryToken}')
$heartbeatScriptContent = $heartbeatScriptContent.Replace('MACHINE_NAME', "$machineName")
$heartbeatScriptContent = $heartbeatScriptContent.Replace('AGENT_VERSION', "$agentVersion")
$heartbeatScriptContent = $heartbeatScriptContent.Replace('SERVIDORES_JSON', ($servidoresJson -replace "'", "''"))

Set-Content -Path $heartbeatScriptPath -Value $heartbeatScriptContent -Force -Encoding UTF8

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File \`"$heartbeatScriptPath\`""
$triggerStartup = New-ScheduledTaskTrigger -AtStartup
$triggerRepetition = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes ${heartbeatIntervalMinutes})
$principal = New-ScheduledTaskPrincipal -UserId 'NT AUTHORITY\\SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -DontStopOnIdleEnd

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($triggerStartup, $triggerRepetition) -Principal $principal -Settings $settings -Force | Out-Null
Start-Process powershell.exe -ArgumentList "-ExecutionPolicy Bypass -WindowStyle Hidden -File \`"$heartbeatScriptPath\`"" -WindowStyle Hidden

Write-Host '[5/5] Instalacao concluida.' -ForegroundColor Cyan
Write-Host 'Script padrao instalado. A maquina deve aparecer no portal em Pendentes.' -ForegroundColor Green
Write-Host "Logs: $discoveryLogPath" -ForegroundColor Gray
Write-Host "Erros: $errorLogPath" -ForegroundColor Gray
Write-Host 'Se preferir, fixe este arquivo na area de trabalho e use como instalador padrao do tecnico.' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Pressione qualquer tecla para fechar...' -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
`;
}

export async function GET(request: Request) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  if (!canManageHost(session.role)) {
    return NextResponse.json({ success: false, error: "Sem permissao para baixar script padrao." }, { status: 403 });
  }

  const discoveryToken = process.env.REMOTE_DISCOVERY_TOKEN?.trim();
  if (!discoveryToken) {
    return NextResponse.json(
      { success: false, error: "REMOTE_DISCOVERY_TOKEN nao configurado no ambiente." },
      { status: 503 }
    );
  }

  const portalBaseUrl = new URL(request.url).origin;
  const settings = await getRemoteModuleSettingsSnapshot();
  const script = buildDiscoveryScript({
    portalBaseUrl,
    discoveryToken,
    rustDeskServerHost: settings.rustDeskServerHost,
    rustDeskServerConfig: settings.rustDeskServerConfig,
    rustDeskPublicKey: settings.rustDeskPublicKey || "6FpnQH+KbbpX0qw6XxF0xqnIO0QnHImwbvQ5Lv7q6gU=",
    rustDeskVersion: settings.rustDeskVersion,
    heartbeatIntervalMinutes: settings.heartbeatIntervalMinutes,
    defaultPassword: settings.defaultPassword,
  });

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": 'attachment; filename="trilink-remote-discovery.ps1"; filename*=UTF-8\'\'trilink-remote-discovery.ps1',
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
