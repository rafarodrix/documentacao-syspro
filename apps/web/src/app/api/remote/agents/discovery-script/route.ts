import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

function canManageHost(role: string): boolean {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
}

function escapePowerShell(value: string | null | undefined) {
  return (value ?? "").replace(/'/g, "''");
}

function buildDiscoveryScript(input: { portalBaseUrl: string; discoveryToken: string }) {
  const escapedPortalBaseUrl = escapePowerShell(input.portalBaseUrl);
  const escapedDiscoveryToken = escapePowerShell(input.discoveryToken);

  return `# Trilink Remote Agent OSS - Script Padrao de Descoberta
# Fluxo: instala a maquina no portal sem pre-cadastro e envia heartbeat continuo

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
$portalBaseUrl = '${escapedPortalBaseUrl}'
$discoveryToken = '${escapedDiscoveryToken}'
$rustDeskDownloadUrl = 'https://github.com/rustdesk/rustdesk/releases/download/1.3.1/rustdesk-1.3.1-x86_64.exe'
$customRendezvousServer = 'rustdesk.trilinksoftware.com.br'
$customServerKey = 'SUA_CHAVE_PUBLICA_AQUI'
$rustDeskPassword = 'Trilink098'
$machineName = $env:COMPUTERNAME
$agentVersion = 'rustdesk-oss-discovery'
$aliasMaquina = "$machineName - Trilink Discovery"

$servidoresSyspro = @(
    @{ Empresa = $machineName; Caminho = 'C:\\syspro\\sysptoserver.exe' }
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

function Resolve-RustDeskId {
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

    return $null
}

$rustdeskExe = Find-RustDeskExecutable
if (-not $rustdeskExe) {
    $tempInstaller = "$env:TEMP\\rustdesk_installer.exe"
    Invoke-WebRequest -Uri $rustDeskDownloadUrl -OutFile $tempInstaller -UseBasicParsing
    Start-Process -FilePath $tempInstaller -ArgumentList '--silent-install' -Wait -WindowStyle Hidden
    Start-Sleep -Seconds 10
    $rustdeskExe = Find-RustDeskExecutable
}

if (-not $rustdeskExe) {
    Write-Host 'RustDesk nao encontrado apos instalacao.' -ForegroundColor Red
    exit
}

Start-Process -FilePath $rustdeskExe -ArgumentList "--password $rustDeskPassword" -Wait -WindowStyle Hidden
if (-not [string]::IsNullOrWhiteSpace($customRendezvousServer)) {
    Start-Process -FilePath $rustdeskExe -ArgumentList "--option custom-rendezvous-server $customRendezvousServer" -Wait -WindowStyle Hidden
}
if ($customServerKey -and $customServerKey -ne 'SUA_CHAVE_PUBLICA_AQUI') {
    Start-Process -FilePath $rustdeskExe -ArgumentList "--option key $customServerKey" -Wait -WindowStyle Hidden
}
Start-Process -FilePath $rustdeskExe -ArgumentList "--option custom-alias \`"$aliasMaquina\`"" -Wait -WindowStyle Hidden
Restart-Service -Name 'RustDesk' -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 5

$agentDir = 'C:\\Trilink\\Agent'
$heartbeatScriptPath = "$agentDir\\heartbeat-discovery.ps1"
$taskName = 'Trilink_RemoteAgent_Discovery'
$servidoresJson = $servidoresSyspro | ConvertTo-Json -Compress -Depth 5

if (-not (Test-Path $agentDir)) {
    New-Item -ItemType Directory -Path $agentDir -Force | Out-Null
}

$heartbeatScriptContent = @"
\$portalBaseUrl = '${escapedPortalBaseUrl}'
\$discoveryToken = '${escapedDiscoveryToken}'
\$machineName = '$machineName'
\$agentVersion = '$agentVersion'
\$listaServidores = ConvertFrom-Json @'
$servidoresJson
'@

function Normalize-RustDeskId {
    param([string]\$Value)
    if ([string]::IsNullOrWhiteSpace(\$Value)) { return \$null }
    return ((\$Value -replace '\s+', '').Trim())
}

function Resolve-RustDeskId {
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

    return \$null
}

\$rustdeskId = Resolve-RustDeskId
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

\$payload = @{
    discoveryToken = \$discoveryToken
    rustdeskId = \$rustdeskId
    machineName = \$machineName
    agentVersion = \$agentVersion
    provider = 'RustDesk'
    serviceStatus = \$serviceStatus
    sysproUpdates = \$resultadosUpdates
}

try {
    Invoke-RestMethod -Method Post -Uri "\$portalBaseUrl/api/remote/agents/discover" -ContentType 'application/json' -Body (\$payload | ConvertTo-Json -Depth 6) -ErrorAction Stop
} catch {
    \$errorMsg = "[\$((Get-Date).ToString('s'))] Erro na descoberta: \$($_.Exception.Message)"
    Out-File -FilePath "C:\\Trilink\\Agent\\discovery_error.log" -InputObject \$errorMsg -Append -Encoding utf8
}
"@

Set-Content -Path $heartbeatScriptPath -Value $heartbeatScriptContent -Force -Encoding UTF8

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File \`"$heartbeatScriptPath\`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
$principal = New-ScheduledTaskPrincipal -UserId 'NT AUTHORITY\\SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -DontStopOnIdleEnd

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Start-Process powershell.exe -ArgumentList "-ExecutionPolicy Bypass -WindowStyle Hidden -File \`"$heartbeatScriptPath\`"" -WindowStyle Hidden

Write-Host 'Script padrao instalado. A maquina aparecera no portal em Pendentes.' -ForegroundColor Green
Write-Host 'Se preferir, fixe este arquivo na area de trabalho e use como instalador padrao do tecnico.' -ForegroundColor Cyan
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
  const script = buildDiscoveryScript({ portalBaseUrl, discoveryToken });

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="trilink-remote-discovery.ps1"',
      "Cache-Control": "no-store",
    },
  });
}
