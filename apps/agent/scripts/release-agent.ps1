[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^\d+\.\d+\.\d+$')]
  [string]$Version,

  [switch]$SkipTests,

  [switch]$SkipUpdaterRuntimeCheck
)

$ErrorActionPreference = 'Stop'

function Invoke-RequiredCommand {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter()][string[]]$Arguments = @()
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed ($LASTEXITCODE): $FilePath $($Arguments -join ' ')"
  }
}

function Get-WailsCommand {
  $command = Get-Command wails.exe -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $candidate = Join-Path $env:USERPROFILE 'go\bin\wails.exe'
  if (Test-Path -LiteralPath $candidate) {
    return $candidate
  }

  throw 'Wails CLI nao encontrado. Instale-o ou disponibilize wails.exe no PATH.'
}

function Update-RequiredText {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Pattern,
    [Parameter(Mandatory = $true)][string]$Replacement
  )

  $content = Get-Content -Raw -Encoding utf8 -LiteralPath $Path
  $updated = [regex]::Replace($content, $Pattern, $Replacement)
  if ($updated -eq $content) {
    throw "Expected release version marker was not found in $Path."
  }

  [IO.File]::WriteAllText($Path, $updated, [Text.UTF8Encoding]::new($false))
}

function Write-Utf8File {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  [IO.File]::WriteAllText($Path, $Content, [Text.UTF8Encoding]::new($false))
}

function Wait-ForFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [int]$TimeoutSeconds = 120
  )

  for ($attempt = 0; $attempt -lt $TimeoutSeconds; $attempt++) {
    if (Test-Path -LiteralPath $Path) {
      return
    }
    Start-Sleep -Seconds 1
  }

  throw "Timed out waiting for $Path."
}

$scriptRoot = Split-Path -Parent $PSCommandPath
$agentRoot = Split-Path -Parent $scriptRoot
$repoRoot = Split-Path -Parent (Split-Path -Parent $agentRoot)
$generatedRoot = Join-Path $agentRoot 'dist\windows-installer\generated'
$outputRoot = Join-Path $agentRoot 'dist\windows-installer\output'
$publicRoot = Join-Path $repoRoot 'apps\web\public\agent'
$releaseRoot = Join-Path $publicRoot $Version
$manifestPath = Join-Path $publicRoot 'manifest.json'
$settingsPath = Join-Path $repoRoot 'packages\contracts\src\remote\remote-module-settings.types.ts'
$settingsFormPath = Join-Path $repoRoot 'apps\web\src\features\settings\interface\remote-module-settings-form.tsx'

if (Test-Path -LiteralPath $releaseRoot) {
  throw "Release $Version already exists in $releaseRoot. Publish an immutable next version instead."
}

New-Item -ItemType Directory -Force $generatedRoot | Out-Null

Push-Location $agentRoot
try {
  if (-not $SkipTests) {
    Invoke-RequiredCommand 'go' @('test', './...')
  }

  Invoke-RequiredCommand 'go' @('build', '-ldflags', "-X trilink/agent/internal/buildinfo.Version=$Version", '-o', (Join-Path $generatedRoot 'agent-service.exe'), '.\cmd\agent-service')
  Invoke-RequiredCommand 'go' @('build', '-ldflags', "-X trilink/agent/internal/buildinfo.Version=$Version", '-o', (Join-Path $generatedRoot 'agent-updater.exe'), '.\cmd\agent-updater')
  Invoke-RequiredCommand (Get-WailsCommand) @('build', '-clean', '-platform', 'windows/amd64', '-nopackage', '-o', 'agent-ui.exe')
  Copy-Item -LiteralPath (Join-Path $agentRoot 'build\bin\agent-ui.exe') -Destination (Join-Path $generatedRoot 'agent-ui.exe') -Force

  Invoke-RequiredCommand 'go' @('build', '-o', (Join-Path $generatedRoot 'agent-installer.exe'), '.\cmd\agent-installer')
  Invoke-RequiredCommand (Join-Path $generatedRoot 'agent-installer.exe') @('build', $Version)
} finally {
  Pop-Location
}

$installerPath = Join-Path $outputRoot "agente-trilink-setup-$Version.exe"
Wait-ForFile -Path $installerPath
$components = @{
  service = 'agent-service.exe'
  ui = 'agent-ui.exe'
  updater = 'agent-updater.exe'
}

New-Item -ItemType Directory -Force $releaseRoot | Out-Null
foreach ($component in $components.GetEnumerator()) {
  Copy-Item -LiteralPath (Join-Path $generatedRoot $component.Value) -Destination (Join-Path $releaseRoot $component.Value) -Force
}
Copy-Item -LiteralPath $installerPath -Destination (Join-Path $releaseRoot "agente-trilink-setup-$Version.exe") -Force

$serviceVersion = (& (Join-Path $releaseRoot 'agent-service.exe') version).Trim()
if ($serviceVersion -ne "agent-service $Version") {
  throw "agent-service version mismatch: $serviceVersion"
}
if (-not $SkipUpdaterRuntimeCheck) {
  $updaterVersion = (& (Join-Path $releaseRoot 'agent-updater.exe') version).Trim()
  if ($updaterVersion -ne "agent-updater $Version") {
    throw "agent-updater version mismatch: $updaterVersion"
  }
}

$manifest = Get-Content -Raw -Encoding utf8 -LiteralPath $manifestPath | ConvertFrom-Json
foreach ($component in $components.GetEnumerator()) {
  $artifactPath = Join-Path $releaseRoot $component.Value
  $manifest.components.($component.Key).version = $Version
  $manifest.components.($component.Key).url = "https://ajuda.trilinksoftware.com.br/agent/$Version/$($component.Value)"
  $manifest.components.($component.Key).sha256 = (Get-FileHash -LiteralPath $artifactPath -Algorithm SHA256).Hash.ToLowerInvariant()
}
$manifestContent = @"
{
  "schemaVersion": "$($manifest.schemaVersion)",
  "channel": "$($manifest.channel)",
  "components": {
    "service": {
      "version": "$($manifest.components.service.version)",
      "url": "$($manifest.components.service.url)",
      "sha256": "$($manifest.components.service.sha256)"
    },
    "ui": {
      "version": "$($manifest.components.ui.version)",
      "url": "$($manifest.components.ui.url)",
      "sha256": "$($manifest.components.ui.sha256)"
    },
    "updater": {
      "version": "$($manifest.components.updater.version)",
      "url": "$($manifest.components.updater.url)",
      "sha256": "$($manifest.components.updater.sha256)"
    }
  }
}
"@.TrimEnd()
Write-Utf8File -Path $manifestPath -Content $manifestContent

Update-RequiredText -Path $settingsPath -Pattern '(?<=\.default\(")\d+\.\d+\.\d+(?="\),\r?\n\s*agentAutoUpgrade)' -Replacement $Version
Update-RequiredText -Path $settingsPath -Pattern '(?<=agentTargetVersion: ")\d+\.\d+\.\d+(?=",)' -Replacement $Version
Update-RequiredText -Path $settingsFormPath -Pattern '(?<=placeholder=")\d+\.\d+\.\d+(?=" \{\.\.\.form\.register\("agentTargetVersion"\)\})' -Replacement $Version

$manifest = Get-Content -Raw -Encoding utf8 -LiteralPath $manifestPath | ConvertFrom-Json
foreach ($property in $manifest.components.psobject.Properties) {
  $component = $property.Value
  $relativePath = ([uri]$component.url).AbsolutePath.TrimStart('/').Replace('/', '\')
  $artifactPath = Join-Path (Join-Path $repoRoot 'apps\web\public') $relativePath
  $actualHash = (Get-FileHash -LiteralPath $artifactPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($component.version -ne $Version -or $component.sha256 -ne $actualHash) {
    throw "Manifest validation failed for $($property.Name)."
  }
}

Write-Host "Release $Version generated and published locally in $releaseRoot"
