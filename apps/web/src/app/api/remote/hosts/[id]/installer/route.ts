import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { getRemoteModuleSettingsSnapshot } from "@/features/remote/application/module-settings";

export const dynamic = "force-dynamic";

function canManageHost(role: string): boolean {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
}

function buildScopedWhere(companyIds: string[], isGlobalView: boolean) {
  return isGlobalView ? {} : { companyId: { in: companyIds.length ? companyIds : ["__none__"] } };
}

function escapePowerShell(value: string | null | undefined) {
  return (value ?? "").replace(/'/g, "''");
}

function escapePowerShellComment(value: string | null | undefined) {
  return (value ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/`/g, "'")
    .trim();
}

function buildInstallToken() {
  return `rhost_${randomBytes(12).toString("hex")}`;
}

function slugifyFilePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function buildInstallerScript(input: {
  portalBaseUrl: string;
  installToken: string;
  companyName: string;
  hostName: string;
  description: string | null;
  rustdeskId: string | null;
  environment: string | null;
  rustDeskServerHost: string;
  rustDeskServerConfig: string;
  rustDeskPublicKey: string;
  rustDeskVersion: string;
  heartbeatIntervalMinutes: number;
  defaultPassword: string;
}) {
  const description = input.description?.trim() || "Sem descricao operacional cadastrada.";
  const rustdeskId = input.rustdeskId?.trim() || "";
  const environment = input.environment?.trim() || "";
  const escapedPortalBaseUrl = escapePowerShell(input.portalBaseUrl);
  const escapedInstallToken = escapePowerShell(input.installToken);
  const escapedCompanyName = escapePowerShell(input.companyName);
  const escapedHostName = escapePowerShell(input.hostName);
  const escapedDescription = escapePowerShell(description);
  const escapedEnvironment = escapePowerShell(environment);
  const escapedRustDeskId = escapePowerShell(rustdeskId);
  const escapedServerHost = escapePowerShell(input.rustDeskServerHost);
  const escapedServerConfig = escapePowerShell(input.rustDeskServerConfig);
  const escapedPublicKey = escapePowerShell(input.rustDeskPublicKey);
  const escapedRustDeskVersion = escapePowerShell(input.rustDeskVersion);
  const escapedDefaultPassword = escapePowerShell(input.defaultPassword);
  const commentCompanyName = escapePowerShellComment(input.companyName);
  const commentHostName = escapePowerShellComment(input.hostName);
  const commentDescription = escapePowerShellComment(description);
  const heartbeatIntervalMinutes = Math.max(1, Math.min(120, input.heartbeatIntervalMinutes));

  return `param(
    [string]$RustDeskPassword = '${escapedDefaultPassword}'
)

# Trilink Remote Agent OSS - Agente Completo
# Empresa: ${commentCompanyName}
# Host: ${commentHostName}
# Descricao da maquina: ${commentDescription}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# ==========================================
# 0. VERIFICACAO DE PRIVILEGIOS DE ADMINISTRADOR
# ==========================================
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

# ==========================================
# 1. CONFIGURACOES DO SERVIDOR RUSTDESK
# ==========================================
$expectedRustDeskVersion = '${escapedRustDeskVersion}'
$rustDeskDownloadUrl = "https://github.com/rustdesk/rustdesk/releases/download/$expectedRustDeskVersion/rustdesk-$expectedRustDeskVersion-x86_64.msi"
$customRendezvousServer = '${escapedServerHost}'
$serverConfig = '${escapedServerConfig}'
$customServerKey = '${escapedPublicKey}'

# ==========================================
# 2. CONFIGURACAO DO HOST E PORTAL
# ==========================================
$portalBaseUrl = '${escapedPortalBaseUrl}'
$installToken = '${escapedInstallToken}'
$companyName = '${escapedCompanyName}'
$hostName = '${escapedHostName}'
$hostDescription = '${escapedDescription}'
$environment = '${escapedEnvironment}'
$agentVersion = 'rustdesk-oss-local'
$machineName = $env:COMPUTERNAME
$rustDeskId = '${escapedRustDeskId}'
$aliasMaquina = "$machineName - ${escapedCompanyName}"
$agentDir = 'C:\\Trilink\\Agent'
$heartbeatScriptPath = "$agentDir\\heartbeat.ps1"
$agentTokenPath = "$agentDir\\agent-token.txt"
$taskName = 'Trilink_RemoteAgent_Heartbeat'
$installLogPath = "$agentDir\\install.log"
$installErrorLogPath = "$agentDir\\install_error.log"
$heartbeatErrorLogPath = "$agentDir\\heartbeat_error.log"

# ==========================================
# 3. CONFIGURACAO DE MULTI-SERVIDORES (EDITE SE NECESSARIO)
# ==========================================
$servidoresSyspro = @(
    @{ Empresa = '${escapedCompanyName}'; Caminho = 'C:\\syspro\\sysptoserver.exe' }
    # @{ Empresa = 'Empresa Y'; Caminho = 'D:\\syspro_clienteY\\sysptoserver.exe' }
)

function Normalize-RustDeskId {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    $normalized = (($Value -replace '\\s+', '').Trim())
    if ($normalized -match '^\d{7,12}$') { return $normalized }
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
        Write-Host 'RustDesk nao encontrado. Fazendo download e instalacao silenciosa...' -ForegroundColor Cyan
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
    param([string]$FallbackValue)

    $tmpFile = "$env:TEMP\\rd_id_capture.txt"
    $exePath = Find-RustDeskExecutable

    if ($exePath) {
        try {
            Start-Process -FilePath $exePath -ArgumentList "--get-id" -RedirectStandardOutput $tmpFile -NoNewWindow -Wait
            if (Test-Path $tmpFile) {
                $rawId = Get-Content $tmpFile -Raw
                Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue
                if ($rawId -match '(\d{7,10})') {
                    return Normalize-RustDeskId -Value $matches[1]
                }
            }
        } catch {}
    }

    $regPaths = @(
        'HKLM:\\SOFTWARE\\RustDesk',
        'HKLM:\\SOFTWARE\\WOW6432Node\\RustDesk'
    )

    foreach ($regPath in $regPaths) {
        if (Test-Path $regPath) {
            $val = Get-ItemProperty -Path $regPath -Name 'id' -ErrorAction SilentlyContinue
            if ($val.id -match '\d{7,10}') {
                return Normalize-RustDeskId -Value $val.id.ToString()
            }
        }
    }

    $configPaths = @(
        'C:\\Windows\\ServiceProfiles\\LocalService\\AppData\\Roaming\\RustDesk\\config\\RustDesk.toml',
        'C:\\Windows\\ServiceProfiles\\LocalService\\AppData\\Roaming\\RustDesk\\config\\RustDesk2.toml',
        'C:\\Windows\\System32\\config\\systemprofile\\AppData\\Roaming\\RustDesk\\config\\RustDesk.toml',
        'C:\\Windows\\System32\\config\\systemprofile\\AppData\\Roaming\\RustDesk\\config\\RustDesk2.toml',
        'C:\\ProgramData\\RustDesk\\config\\RustDesk.toml',
        'C:\\ProgramData\\RustDesk\\config\\RustDesk2.toml'
    )

    foreach ($configPath in $configPaths) {
        if (Test-Path $configPath) {
            $content = Get-Content $configPath -Raw -Encoding UTF8
            if ($content -match "id\\s*=\\s*'(\d{7,12})'") {
                return Normalize-RustDeskId -Value $matches[1]
            }
        }
    }

    return Normalize-RustDeskId -Value $FallbackValue
}

function Invoke-PortalJsonPost {
    param(
        [string]$Url,
        [hashtable]$Body
    )

    Invoke-RestMethod -Method Post -Uri $Url -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 6) -TimeoutSec 30 -ErrorAction Stop
}

function Write-InstallLog {
    param([string]$Message)
    Out-File -FilePath $installLogPath -InputObject "[$((Get-Date).ToString('s'))] $Message" -Append -Encoding utf8
}

function Write-InstallError {
    param([string]$Message)
    Out-File -FilePath $installErrorLogPath -InputObject "[$((Get-Date).ToString('s'))] $Message" -Append -Encoding utf8
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

function Invoke-InitialHeartbeat {
    param(
        [string]$NormalizedRustDeskId,
        [string]$ServiceStatus,
        [string]$AgentToken
    )

    $payloadHeartbeat = @{
        rustdeskId = $NormalizedRustDeskId
        machineName = $machineName
        agentVersion = $agentVersion
        serviceStatus = $ServiceStatus
        sysproUpdates = Get-SysproUpdates
    }

    if ([string]::IsNullOrWhiteSpace($AgentToken)) {
        throw 'agentToken nao disponivel para heartbeat inicial.'
    }

    $payloadHeartbeat.agentToken = $AgentToken

    Invoke-RestMethod -Method Post -Uri "$portalBaseUrl/api/remote/agents/heartbeat" -ContentType 'application/json' -Body ($payloadHeartbeat | ConvertTo-Json -Depth 6) -TimeoutSec 30 -ErrorAction Stop
}

if (-not (Test-Path $agentDir)) {
    New-Item -ItemType Directory -Path $agentDir -Force | Out-Null
}

Write-Host '=========================================================' -ForegroundColor DarkGray
Write-Host ' Trilink Remote Agent - Instalador do Host' -ForegroundColor Cyan
Write-Host '=========================================================' -ForegroundColor DarkGray
Write-Host "Empresa: $companyName"
Write-Host "Host: $hostName"
Write-Host "Descricao: $hostDescription"
Write-Host "Senha padrao RustDesk: $RustDeskPassword"
Write-Host "Token: $installToken"
Write-Host ''

Write-Host '[0/5] Validando conectividade com o portal...' -ForegroundColor Cyan
if (Test-PortalConnection) {
    Write-Host 'Portal acessivel.' -ForegroundColor Green
    Write-InstallLog -Message 'Portal acessivel na validacao inicial.'
} else {
    Write-Host 'Falha ao validar conectividade inicial com o portal. O instalador vai continuar e registrar erro se o envio falhar.' -ForegroundColor Yellow
    Write-InstallError -Message 'Falha na validacao inicial de conectividade com o portal.'
}

# ==========================================
# 4. VERIFICACAO E INSTALACAO DO RUSTDESK
# ==========================================
Write-Host '[1/5] Verificando RustDesk...' -ForegroundColor Cyan
$rustdeskExe = Install-Or-Update-RustDesk

if (-not $rustdeskExe) {
    Write-Host 'RustDesk nao foi localizado apos a instalacao.' -ForegroundColor Red
    Write-InstallError -Message 'RustDesk nao localizado apos a instalacao.'
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

# ==========================================
# 5. CONFIGURACAO DO RUSTDESK
# ==========================================
Write-Host '[2/5] Aplicando configuracoes do RustDesk...' -ForegroundColor Cyan

try {
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
    } else {
        Write-Host 'Chave publica do servidor RustDesk nao configurada no script. Ajuste $customServerKey se necessario.' -ForegroundColor Yellow
    }

    Start-Process -FilePath $rustdeskExe -ArgumentList "--option custom-alias \`"$aliasMaquina\`"" -Wait -WindowStyle Hidden
    Start-Process -FilePath $rustdeskExe -ArgumentList "--option direct-access-port \`"\`"" -Wait -WindowStyle Hidden

    Restart-Service -Name 'RustDesk' -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 5
} catch {
    Write-Host "Falha ao configurar RustDesk: $($_.Exception.Message)" -ForegroundColor Red
    Write-InstallError -Message "Falha ao configurar RustDesk: $($_.Exception.Message)"
}

# ==========================================
# 6. DESCOBERTA DO RUSTDESK ID E AUTO-REGISTRO
# ==========================================
Write-Host '[3/5] Validando RustDesk ID e registrando host...' -ForegroundColor Cyan
$normalizedRustDeskId = $null

# Try multiple times to auto-discover the ID
for ($attempt = 1; $attempt -le 5; $attempt++) {
    $normalizedRustDeskId = Resolve-RustDeskId -FallbackValue $rustDeskId
    if ($normalizedRustDeskId) {
        Write-InstallLog -Message "RustDesk ID descoberto na tentativa $attempt"
        break
    }
    if ($attempt -lt 5) {
        Write-Host "Tentativa $attempt: Aguardando geracao do RustDesk ID..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
}

if ([string]::IsNullOrWhiteSpace($normalizedRustDeskId)) {
    Write-Host 'Nao foi possivel descobrir o RustDesk ID automaticamente.' -ForegroundColor Yellow
    Write-Host 'Informe o RustDesk ID (apenas numeros, 7-12 digitos):' -ForegroundColor Cyan
    $userInput = Read-Host '> '
    $normalizedRustDeskId = Normalize-RustDeskId -Value $userInput
}

if ([string]::IsNullOrWhiteSpace($normalizedRustDeskId)) {
    Write-Host 'RustDesk ID obrigatorio para registrar o agente.' -ForegroundColor Red
    Write-InstallError -Message 'RustDesk ID nao informado.'
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

$payloadRegister = @{
    installToken = $installToken
    rustdeskId = $normalizedRustDeskId
    machineName = $machineName
    agentVersion = $agentVersion
    environment = $environment
}
$agentToken = ''

Write-Host 'Registrando agente no portal...' -ForegroundColor Cyan

try {
    $registerResponse = Invoke-PortalJsonPost -Url "$portalBaseUrl/api/remote/agents/register" -Body $payloadRegister
    if ($registerResponse -and $registerResponse.data -and $registerResponse.data.agentToken) {
        $agentToken = [string]$registerResponse.data.agentToken
        Set-Content -Path $agentTokenPath -Value $agentToken -Force -Encoding UTF8
        Write-InstallLog -Message 'agentToken emitido e persistido localmente.'
    } else {
        throw 'Resposta de register sem agentToken.'
    }
    Write-Host 'Registro concluido com sucesso.' -ForegroundColor Green
    Write-InstallLog -Message "Registro concluido com sucesso. RustDesk ID: $normalizedRustDeskId"
} catch {
    $apiError = Get-ApiErrorDetails -ErrorRecord $_
    Write-Host "Falha ao registrar o agente: $($apiError.message)" -ForegroundColor Red
    if ($apiError.statusCode) {
        Write-InstallError -Message "Falha no registro inicial. Status HTTP: $($apiError.statusCode). Resposta: $($apiError.responseBody)"
    } else {
        Write-InstallError -Message "Falha no registro inicial: $($apiError.message)"
    }
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

# ==========================================
# 7. HEARTBEAT INICIAL E CONTINUO
# ==========================================
Write-Host '[4/5] Enviando heartbeat inicial...' -ForegroundColor Cyan
$serviceStatus = Get-ServiceHealthStatus
try {
    Invoke-InitialHeartbeat -NormalizedRustDeskId $normalizedRustDeskId -ServiceStatus $serviceStatus -AgentToken $agentToken
    Write-Host 'Heartbeat inicial enviado com sucesso.' -ForegroundColor Green
    Write-InstallLog -Message 'Heartbeat inicial enviado com sucesso.'
} catch {
    $apiError = Get-ApiErrorDetails -ErrorRecord $_
    Write-Host "Falha ao enviar heartbeat inicial: $($apiError.message)" -ForegroundColor Red
    if ($apiError.statusCode -eq 401 -and ($apiError.responseBody -like '*AGENT_TOKEN_INVALID*')) {
        Write-InstallError -Message 'agentToken invalido ou expirado no heartbeat inicial. Execute o bootstrap novamente para emitir nova credencial.'
    } elseif ($apiError.statusCode) {
        Write-InstallError -Message "Falha no heartbeat inicial. Status HTTP: $($apiError.statusCode). Resposta: $($apiError.responseBody)"
    } else {
        Write-InstallError -Message "Falha no heartbeat inicial: $($apiError.message)"
    }
}

Write-Host '[5/5] Configurando heartbeat continuo...' -ForegroundColor Cyan
$servidoresJson = $servidoresSyspro | ConvertTo-Json -Compress -Depth 5

try {
$heartbeatScriptContent = @'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$portalBaseUrl = 'PORTAL_BASE_URL'
$agentToken = 'AGENT_TOKEN'
$agentTokenPath = 'AGENT_TOKEN_PATH'
$machineName = 'MACHINE_NAME'
$agentVersion = 'AGENT_VERSION'
$rustDeskIdFallback = 'RUSTDESK_ID_FALLBACK'
$heartbeatErrorLogPath = 'HEARTBEAT_ERROR_LOG_PATH'
$listaServidores = ConvertFrom-Json 'SERVIDORES_JSON'

Get-ChildItem -Path 'C:\Trilink\Agent' -Filter '*.log' -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
    Remove-Item -Force -ErrorAction SilentlyContinue

function Normalize-RustDeskId {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    $normalized = (($Value -replace '\s+', '').Trim())
    if ($normalized -match '^\d{7,12}$') { return $normalized }
    return $null
}

function Resolve-RustDeskId {
    param([string]$FallbackValue)

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
            # Try different regex patterns for ID
            if ($content -match 'id\s*=\s*[''""]?(\d{7,12})[''""]?') {
                return Normalize-RustDeskId -Value $Matches[1]
            }
        }
    }

    return Normalize-RustDeskId -Value $FallbackValue
}

function Get-RustDeskProcess {
    return Get-Process -Name 'rustdesk' -ErrorAction SilentlyContinue | Select-Object -First 1
}

function Get-RustDeskService {
    $service = Get-Service -Name 'RustDesk' -ErrorAction SilentlyContinue
    if ($service) { return $service }

    return Get-Service -DisplayName '*RustDesk*' -ErrorAction SilentlyContinue | Select-Object -First 1
}

function Write-HeartbeatError {
    param([string]$Message)
    $errorMsg = "[$((Get-Date).ToString('s'))] $Message"
    Out-File -FilePath $heartbeatErrorLogPath -InputObject $errorMsg -Append -Encoding utf8
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

function Resolve-AgentToken {
    if (-not [string]::IsNullOrWhiteSpace($agentToken)) {
        return $agentToken
    }

    if (Test-Path $agentTokenPath) {
        try {
            $persisted = (Get-Content $agentTokenPath -Raw -Encoding UTF8).Trim()
            if (-not [string]::IsNullOrWhiteSpace($persisted)) {
                return $persisted
            }
        } catch {}
    }

    return $null
}

$normalizedRustDeskId = Resolve-RustDeskId -FallbackValue $rustDeskIdFallback
$resolvedAgentToken = Resolve-AgentToken
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

$payloadHeartbeat = @{
    rustdeskId = $normalizedRustDeskId
    machineName = $machineName
    agentVersion = $agentVersion
    serviceStatus = $serviceStatus
    sysproUpdates = $resultadosUpdates
}

if ([string]::IsNullOrWhiteSpace($resolvedAgentToken)) {
    Write-HeartbeatError -Message 'agentToken indisponivel. Execute o bootstrap novamente para restabelecer o heartbeat.'
    exit
}

$payloadHeartbeat.agentToken = $resolvedAgentToken

try {
    Invoke-RestMethod -Method Post -Uri "$portalBaseUrl/api/remote/agents/heartbeat" -ContentType 'application/json' -Body ($payloadHeartbeat | ConvertTo-Json -Depth 6) -TimeoutSec 30 -ErrorAction Stop
} catch {
    $apiError = Get-ApiErrorDetails -ErrorRecord $_
    if ($apiError.statusCode -eq 401 -and ($apiError.responseBody -like '*AGENT_TOKEN_INVALID*')) {
        try {
            if (Test-Path $agentTokenPath) {
                Remove-Item -Path $agentTokenPath -Force -ErrorAction SilentlyContinue
            }
        } catch {}
        Write-HeartbeatError -Message 'agentToken invalido ou expirado. Credencial local removida; execute o bootstrap novamente no host.'
    } elseif ($apiError.statusCode) {
        Write-HeartbeatError -Message "Erro no heartbeat. Status HTTP: $($apiError.statusCode). Resposta: $($apiError.responseBody)"
    } else {
        Write-HeartbeatError -Message "Erro no heartbeat: $($apiError.message)"
    }
}
'@

    $heartbeatScriptContent = $heartbeatScriptContent.Replace('PORTAL_BASE_URL', '${escapedPortalBaseUrl}')
    $heartbeatScriptContent = $heartbeatScriptContent.Replace('AGENT_TOKEN', $agentToken)
    $heartbeatScriptContent = $heartbeatScriptContent.Replace('AGENT_TOKEN_PATH', "$agentTokenPath")
    $heartbeatScriptContent = $heartbeatScriptContent.Replace('MACHINE_NAME', "$machineName")
    $heartbeatScriptContent = $heartbeatScriptContent.Replace('AGENT_VERSION', "$agentVersion")
    $heartbeatScriptContent = $heartbeatScriptContent.Replace('RUSTDESK_ID_FALLBACK', "$normalizedRustDeskId")
    $heartbeatScriptContent = $heartbeatScriptContent.Replace('HEARTBEAT_ERROR_LOG_PATH', "$heartbeatErrorLogPath")
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
    Write-Host 'Heartbeat continuo configurado com sucesso.' -ForegroundColor Green
    Write-InstallLog -Message 'Tarefa de heartbeat continuo configurada.'
} catch {
    Write-Host "Falha ao configurar heartbeat continuo: $($_.Exception.Message)" -ForegroundColor Red
    Write-InstallError -Message "Falha ao configurar heartbeat continuo: $($_.Exception.Message)"
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

Write-Host '========================================================='
Write-Host 'Instalacao e configuracao do agente Trilink concluidas.' -ForegroundColor Green
Write-Host '========================================================='
Write-Host "Log de instalacao: $installLogPath" -ForegroundColor Gray
Write-Host "Log de erros: $installErrorLogPath" -ForegroundColor Gray
Write-Host "Log de heartbeat: $heartbeatErrorLogPath" -ForegroundColor Gray
Write-Host ''
Write-Host 'Pressione qualquer tecla para fechar...' -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  if (!canManageHost(session.role)) {
    return NextResponse.json({ success: false, error: "Sem permissao para baixar instalador." }, { status: 403 });
  }

  const tenantScope = await getRemoteTenantScope();
  const { id } = await params;
  const scopedWhere = buildScopedWhere(tenantScope.companyIds, tenantScope.isGlobalView);
  const host = await prisma.remoteHost.findFirst({
    where: {
      id,
      ...scopedWhere,
    },
    include: {
      company: {
        select: {
          nomeFantasia: true,
          razaoSocial: true,
        },
      },
    },
  });

  if (!host) {
    return NextResponse.json({ success: false, error: "Host remoto nao encontrado." }, { status: 404 });
  }

  let installToken = host.installToken;
  if (!installToken) {
    const updatedHost = await prisma.remoteHost.update({
      where: { id: host.id },
      data: {
        installToken: buildInstallToken(),
      },
      select: {
        installToken: true,
      },
    });
    installToken = updatedHost.installToken;
  }

  if (!installToken) {
    return NextResponse.json({ success: false, error: "Nao foi possivel gerar installToken para o host." }, { status: 500 });
  }

  const portalBaseUrl = new URL(request.url).origin;
  const settings = await getRemoteModuleSettingsSnapshot();
  const companyName = host.company.nomeFantasia ?? host.company.razaoSocial;
  const companySlug = slugifyFilePart(companyName || "empresa");
  const hostSlug = slugifyFilePart(host.name || "host-remoto");
  const script = buildInstallerScript({
    portalBaseUrl,
    installToken,
    companyName,
    hostName: host.name,
    description: host.description,
    rustdeskId: host.agentExternalId,
    environment: host.environment,
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
      "Content-Disposition": `attachment; filename="trilink-remote-agent-${companySlug}-${hostSlug}.ps1"; filename*=UTF-8''trilink-remote-agent-${companySlug}-${hostSlug}.ps1`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
