import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";

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

  return `# Trilink Remote Agent OSS - Agente Completo
# Empresa: ${input.companyName}
# Host: ${input.hostName}
# Descricao da maquina: ${description}

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
        Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList "-ExecutionPolicy Bypass -File \`"$scriptPath\`""
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
$expectedRustDeskVersion = '1.3.1'
$rustDeskDownloadUrl = "https://github.com/rustdesk/rustdesk/releases/download/$expectedRustDeskVersion/rustdesk-$expectedRustDeskVersion-x86_64.exe"
$customRendezvousServer = 'rustdesk.trilinksoftware.com.br'
$customServerKey = 'SUA_CHAVE_PUBLICA_AQUI'
$rustDeskPassword = 'Trilink098'

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
    return (($Value -replace '\\s+', '').Trim())
}

function Find-RustDeskExecutable {
    $paths = @(
        'C:\\Program Files\\RustDesk\\rustdesk.exe',
        'C:\\Program Files (x86)\\RustDesk\\rustdesk.exe'
    )

    foreach ($path in $paths) {
        if (Test-Path $path) { return $path }
    }

    return $null
}

function Get-RustDeskVersion {
    param([string]$ExecutablePath)
    if (-not (Test-Path $ExecutablePath)) { return $null }
    return (Get-Item $ExecutablePath).VersionInfo.ProductVersion
}

function Install-Or-Update-RustDesk {
    $rustdeskExe = Find-RustDeskExecutable
    $currentVersion = if ($rustdeskExe) { Get-RustDeskVersion -ExecutablePath $rustdeskExe } else { $null }
    $needsInstall = (-not $rustdeskExe) -or ([string]::IsNullOrWhiteSpace($currentVersion)) -or ($currentVersion -ne $expectedRustDeskVersion)

    if ($needsInstall) {
        if ($rustdeskExe -and $currentVersion) {
            Write-Host "RustDesk encontrado na versao $currentVersion. Atualizando para $expectedRustDeskVersion..." -ForegroundColor Yellow
            Write-InstallLog -Message "Atualizando RustDesk de $currentVersion para $expectedRustDeskVersion."
        } else {
            Write-Host 'RustDesk nao encontrado. Fazendo download e instalacao silenciosa...' -ForegroundColor Cyan
            Write-InstallLog -Message "Instalando RustDesk na versao $expectedRustDeskVersion."
        }

        $tempInstaller = "$env:TEMP\\rustdesk_installer.exe"
        Invoke-WebRequest -Uri $rustDeskDownloadUrl -OutFile $tempInstaller -UseBasicParsing
        Start-Process -FilePath $tempInstaller -ArgumentList '--silent-install' -Wait -WindowStyle Hidden
        Start-Sleep -Seconds 12
    } else {
        Write-Host "RustDesk ja esta na versao esperada ($expectedRustDeskVersion)." -ForegroundColor Green
        Write-InstallLog -Message "RustDesk ja esta na versao esperada ($expectedRustDeskVersion)."
    }

    return Find-RustDeskExecutable
}

function Resolve-RustDeskId {
    param([string]$FallbackValue)

    $configPaths = @(
        'C:\\Windows\\ServiceProfiles\\LocalService\\AppData\\Roaming\\RustDesk\\config\\RustDesk.toml',
        'C:\\Windows\\ServiceProfiles\\LocalService\\AppData\\Roaming\\RustDesk\\config\\RustDesk2.toml',
        "$env:APPDATA\\RustDesk\\config\\RustDesk.toml",
        "$env:APPDATA\\RustDesk\\config\\RustDesk2.toml"
    )

    foreach ($configPath in $configPaths) {
        if (Test-Path $configPath) {
            $content = Get-Content $configPath -Raw
            if ($content -match "id\\s*=\\s*'([^']+)'") {
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

    Invoke-RestMethod -Method Post -Uri $Url -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 6) -ErrorAction Stop
}

function Write-InstallLog {
    param([string]$Message)
    Add-Content -Path $installLogPath -Value "[$((Get-Date).ToString('s'))] $Message"
}

function Write-InstallError {
    param([string]$Message)
    Add-Content -Path $installErrorLogPath -Value "[$((Get-Date).ToString('s'))] $Message"
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
    $svc = Get-Service -Name 'RustDesk' -ErrorAction SilentlyContinue
    if ($svc) {
        if ($svc.Status -ne 'Running') {
            try {
                Start-Service -Name 'RustDesk' -ErrorAction Stop
                $serviceStatus = 'restarted_by_agent'
            } catch {
                $serviceStatus = $svc.Status.ToString().ToLower()
            }
        } else {
            $serviceStatus = 'running'
        }
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
        [string]$ServiceStatus
    )

    $payloadHeartbeat = @{
        installToken = $installToken
        rustdeskId = $NormalizedRustDeskId
        machineName = $machineName
        agentVersion = $agentVersion
        serviceStatus = $ServiceStatus
        sysproUpdates = Get-SysproUpdates
    }

    Invoke-RestMethod -Method Post -Uri "$portalBaseUrl/api/remote/agents/heartbeat" -ContentType 'application/json' -Body ($payloadHeartbeat | ConvertTo-Json -Depth 6) -ErrorAction Stop
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
Write-Host "Senha padrao RustDesk: $rustDeskPassword"
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
    Start-Process -FilePath $rustdeskExe -ArgumentList "--password $rustDeskPassword" -Wait -WindowStyle Hidden

    if (-not [string]::IsNullOrWhiteSpace($customRendezvousServer)) {
        Start-Process -FilePath $rustdeskExe -ArgumentList "--option custom-rendezvous-server $customRendezvousServer" -Wait -WindowStyle Hidden
    }

    if ($customServerKey -and $customServerKey -ne 'SUA_CHAVE_PUBLICA_AQUI') {
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
$normalizedRustDeskId = Resolve-RustDeskId -FallbackValue $rustDeskId

if ([string]::IsNullOrWhiteSpace($normalizedRustDeskId)) {
    Write-Host 'Nao foi possivel descobrir o RustDesk ID automaticamente.' -ForegroundColor Yellow
    $normalizedRustDeskId = Normalize-RustDeskId -Value (Read-Host 'Informe o RustDesk ID manualmente')
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

Write-Host 'Registrando agente no portal...' -ForegroundColor Cyan

try {
    Invoke-PortalJsonPost -Url "$portalBaseUrl/api/remote/agents/register" -Body $payloadRegister
    Write-Host 'Registro concluido com sucesso.' -ForegroundColor Green
    Write-InstallLog -Message "Registro concluido com sucesso. RustDesk ID: $normalizedRustDeskId"
} catch {
    Write-Host "Falha ao registrar o agente: $($_.Exception.Message)" -ForegroundColor Red
    Write-InstallError -Message "Falha no registro inicial: $($_.Exception.Message)"
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

# ==========================================
# 7. HEARTBEAT INICIAL E CONTINUO
# ==========================================
Write-Host '[4/5] Enviando heartbeat inicial...' -ForegroundColor Cyan
$serviceStatus = Get-ServiceHealthStatus
try {
    Invoke-InitialHeartbeat -NormalizedRustDeskId $normalizedRustDeskId -ServiceStatus $serviceStatus
    Write-Host 'Heartbeat inicial enviado com sucesso.' -ForegroundColor Green
    Write-InstallLog -Message 'Heartbeat inicial enviado com sucesso.'
} catch {
    Write-Host "Falha ao enviar heartbeat inicial: $($_.Exception.Message)" -ForegroundColor Red
    Write-InstallError -Message "Falha no heartbeat inicial: $($_.Exception.Message)"
}

Write-Host '[5/5] Configurando heartbeat continuo...' -ForegroundColor Cyan
$servidoresJson = $servidoresSyspro | ConvertTo-Json -Compress -Depth 5

try {
    $heartbeatScriptContent = @"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
\$portalBaseUrl = '${escapedPortalBaseUrl}'
\$installToken = '${escapedInstallToken}'
\$machineName = '$machineName'
\$agentVersion = '$agentVersion'
\$expectedRustDeskVersion = '$expectedRustDeskVersion'
\$rustDeskIdFallback = '$normalizedRustDeskId'
\$listaServidores = ConvertFrom-Json @'
$servidoresJson
'@

Get-ChildItem -Path 'C:\\Trilink\\Agent' -Filter '*.log' -ErrorAction SilentlyContinue |
    Where-Object { \$_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
    Remove-Item -Force -ErrorAction SilentlyContinue

function Normalize-RustDeskId {
    param([string]\$Value)
    if ([string]::IsNullOrWhiteSpace(\$Value)) { return \$null }
    return ((\$Value -replace '\s+', '').Trim())
}

function Resolve-RustDeskId {
    param([string]\$FallbackValue)

    \$configPaths = @(
        'C:\\Windows\\ServiceProfiles\\LocalService\\AppData\\Roaming\\RustDesk\\config\\RustDesk.toml',
        'C:\\Windows\\ServiceProfiles\\LocalService\\AppData\\Roaming\\RustDesk\\config\\RustDesk2.toml',
        "\$env:APPDATA\\RustDesk\\config\\RustDesk.toml",
        "\$env:APPDATA\\RustDesk\\config\\RustDesk2.toml"
    )

    foreach (\$configPath in \$configPaths) {
        if (Test-Path \$configPath) {
            \$content = Get-Content \$configPath -Raw
            if (\$content -match "id\s*=\s*'([^']+)'") {
                return Normalize-RustDeskId -Value \$matches[1]
            }
        }
    }

    return Normalize-RustDeskId -Value \$FallbackValue
}

function Write-HeartbeatError {
    param([string]\$Message)
    \$errorMsg = "[\$((Get-Date).ToString('s'))] \$Message"
    Out-File -FilePath "${heartbeatErrorLogPath}" -InputObject \$errorMsg -Append -Encoding utf8
}

\$normalizedRustDeskId = Resolve-RustDeskId -FallbackValue \$rustDeskIdFallback
\$serviceStatus = 'not_found'
\$svc = Get-Service -Name 'RustDesk' -ErrorAction SilentlyContinue
if (\$svc) {
    if (\$svc.Status -ne 'Running') {
        try {
            Start-Service -Name 'RustDesk' -ErrorAction Stop
            \$serviceStatus = 'restarted_by_agent'
        } catch {
            \$serviceStatus = \$svc.Status.ToString().ToLower()
        }
    } else {
        \$serviceStatus = 'running'
    }
}
\$resultadosUpdates = @()

foreach (\$srv in \$listaServidores) {
    \$dataAtualizacao = \$null
    if (Test-Path \$srv.Caminho) {
        \$dataAtualizacao = (Get-Item \$srv.Caminho).LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
    }

    \$resultadosUpdates += @{
        empresa = \$srv.Empresa
        caminho = \$srv.Caminho
        ultimaAtualizacao = \$dataAtualizacao
    }
}

\$payloadHeartbeat = @{
    installToken = \$installToken
    rustdeskId = \$normalizedRustDeskId
    machineName = \$machineName
    agentVersion = \$agentVersion
    serviceStatus = \$serviceStatus
    sysproUpdates = \$resultadosUpdates
}

try {
    Invoke-RestMethod -Method Post -Uri "\$portalBaseUrl/api/remote/agents/heartbeat" -ContentType 'application/json' -Body (\$payloadHeartbeat | ConvertTo-Json -Depth 6) -ErrorAction Stop
} catch {
    Write-HeartbeatError -Message "Erro no heartbeat: \$($_.Exception.Message)"
}
"@

    Set-Content -Path $heartbeatScriptPath -Value $heartbeatScriptContent -Force -Encoding UTF8

    if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }

    $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File \`"$heartbeatScriptPath\`""
    $triggerStartup = New-ScheduledTaskTrigger -AtStartup
    $triggerRepetition = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
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
  });

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="trilink-remote-agent-${companySlug}-${hostSlug}.ps1"`,
      "Cache-Control": "no-store",
    },
  });
}
