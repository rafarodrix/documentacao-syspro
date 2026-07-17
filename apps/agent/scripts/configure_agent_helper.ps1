$ErrorActionPreference = "Stop"

$envFilePath = Join-Path $env:ProgramData "Trilink\\Agent\\.env"
$seedDirectory = Join-Path ${env:ProgramFiles} "Trilink\\Agente\\config"
$serviceName = "TrillinkAgent"

function Read-EnvFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $values = [ordered]@{}
    if (-not (Test-Path -LiteralPath $Path)) {
        return $values
    }

    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith("#")) {
            continue
        }

        $separatorIndex = $trimmed.IndexOf("=")
        if ($separatorIndex -lt 1) {
            continue
        }

        $key = $trimmed.Substring(0, $separatorIndex).Trim()
        $value = $trimmed.Substring($separatorIndex + 1)
        $values[$key] = $value
    }

    return $values
}

function Write-EnvFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [System.Collections.IDictionary]$Values
    )

    $lines = foreach ($entry in $Values.GetEnumerator()) {
        "{0}={1}" -f $entry.Key, $entry.Value
    }

    Set-Content -LiteralPath $Path -Value $lines -Encoding utf8
}

function Ensure-EnvSeed {
    param(
        [Parameter(Mandatory = $true)]
        [string]$TargetPath
    )

    $targetDir = Split-Path -Parent $TargetPath
    if (-not (Test-Path -LiteralPath $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    if (Test-Path -LiteralPath $TargetPath) {
        return
    }

    $seedCandidates = @(
        (Join-Path $seedDirectory ".env"),
        (Join-Path $seedDirectory ".env.example")
    )

    foreach ($candidate in $seedCandidates) {
        if (Test-Path -LiteralPath $candidate) {
            Copy-Item -LiteralPath $candidate -Destination $TargetPath -Force
            return
        }
    }

    Set-Content -LiteralPath $TargetPath -Value @(
        "# Trilink Agent environment",
        "PORTAL_AGENT_API_ENABLED=true",
        "REMOTE_ENABLED=true"
    ) -Encoding utf8
}

function Restart-AgentService {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $service = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if (-not $service) {
        Write-Host "Servico $Name nao esta instalado nesta maquina." -ForegroundColor Yellow
        return
    }

    if ($service.Status -ne "Stopped") {
        Write-Host "Parando o servico $Name..." -ForegroundColor Yellow
        Stop-Service -Name $Name -Force
    }

    Write-Host "Iniciando o servico $Name..." -ForegroundColor Green
    Start-Service -Name $Name
}

function Invoke-LegacyCleanup {
    $cleanupScript = Join-Path $PSScriptRoot "remove_legacy_bootstrap_residue.ps1"
    if (-not (Test-Path -LiteralPath $cleanupScript)) {
        return
    }

    Write-Host "Limpando residuos de bootstrap legado..." -ForegroundColor Yellow
    & $cleanupScript -Silent
}

Write-Host "=== CONFIGURADOR DO AGENTE TRILINK ===" -ForegroundColor Cyan
Write-Host "O install token do host agora e obtido automaticamente pelo fluxo discover -> bootstrap do portal." -ForegroundColor DarkGray

Invoke-LegacyCleanup

$portalUrl = Read-Host "Digite a URL do Portal (ex: https://backend.trilinksoftware.com.br)"
$discoveryToken = Read-Host "Digite o Token de Descoberta (REMOTE_DISCOVERY_TOKEN)"

if ([string]::IsNullOrWhiteSpace($portalUrl)) {
    throw "A URL do portal e obrigatoria."
}

if ([string]::IsNullOrWhiteSpace($discoveryToken)) {
    throw "O token de descoberta e obrigatorio."
}

Ensure-EnvSeed -TargetPath $envFilePath
$config = Read-EnvFile -Path $envFilePath

$config["PORTAL_BASE_URL"] = $portalUrl.Trim()
$config["REMOTE_DISCOVERY_TOKEN"] = $discoveryToken.Trim()
$config["PORTAL_AGENT_API_ENABLED"] = "true"
$config["REMOTE_ENABLED"] = "true"

if ($config.Contains("REMOTE_INSTALL_TOKEN")) {
    $config.Remove("REMOTE_INSTALL_TOKEN")
}

Write-Host "Atualizando configuracao em $envFilePath..." -ForegroundColor Yellow
Write-EnvFile -Path $envFilePath -Values $config

$stateFile = Join-Path $env:ProgramData "Trilink\\Agent\\remote_state.json"
if (Test-Path -LiteralPath $stateFile) {
    Write-Host "Limpando estado remoto anterior para forcar novo bootstrap..." -ForegroundColor Yellow
    Remove-Item -LiteralPath $stateFile -Force
}

Restart-AgentService -Name $serviceName

Write-Host "Configuracao concluida. Verifique o portal e os logs locais para confirmar o novo sincronismo." -ForegroundColor Green
