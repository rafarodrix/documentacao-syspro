$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

param(
  [Parameter(Mandatory = $true)]
  [string]$PortalBaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$AddressBookToken,

  [Parameter(Mandatory = $false)]
  [string]$RustDeskApiBaseUrl = "",

  [Parameter(Mandatory = $false)]
  [string]$RustDeskApiToken = "",

  [Parameter(Mandatory = $false)]
  [string]$RustDeskEndpointPath = "",

  [Parameter(Mandatory = $false)]
  [switch]$DryRun,

  [Parameter(Mandatory = $false)]
  [string]$OutputFile = ".\\address-book-export.json"
)

function Write-Info([string]$Message) {
  Write-Host "[info] $Message"
}

function Write-Warn([string]$Message) {
  Write-Host "[warn] $Message" -ForegroundColor Yellow
}

function Write-Ok([string]$Message) {
  Write-Host "[ok] $Message" -ForegroundColor Green
}

function Normalize-BaseUrl([string]$Url) {
  return $Url.Trim().TrimEnd("/")
}

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Uri,
    [Parameter(Mandatory = $false)][hashtable]$Headers,
    [Parameter(Mandatory = $false)]$Body = $null
  )

  $requestParams = @{
    Method      = $Method
    Uri         = $Uri
    Headers     = $Headers
    ContentType = "application/json"
    TimeoutSec  = 30
  }

  if ($null -ne $Body) {
    $requestParams.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
  }

  return Invoke-RestMethod @requestParams
}

if ([string]::IsNullOrWhiteSpace($PortalBaseUrl)) {
  throw "PortalBaseUrl obrigatorio."
}
if ([string]::IsNullOrWhiteSpace($AddressBookToken)) {
  throw "AddressBookToken obrigatorio."
}

$portal = Normalize-BaseUrl -Url $PortalBaseUrl
$portalHeaders = @{
  "Authorization" = "Bearer $AddressBookToken"
}

$portalEndpoint = "$portal/api/remote/rustdesk/address-book"
Write-Info "Lendo address book do portal: $portalEndpoint"
$portalResponse = Invoke-JsonRequest -Method "GET" -Uri $portalEndpoint -Headers $portalHeaders

if (-not $portalResponse.success) {
  throw "Resposta de erro do portal."
}

$items = @($portalResponse.data.items)
$total = [int]($portalResponse.data.total)
Write-Ok "Portal retornou $total item(ns)."

$normalizedItems = @(
  $items | ForEach-Object {
    [PSCustomObject]@{
      id              = [string]$_.id
      alias           = [string]$_.alias
      hostname        = [string]$_.hostname
      tags            = @($_.tags)
      hash            = [string]$_.hash
      portalHostId    = [string]$_.portalHostId
      companyId       = [string]$_.companyId
      lastHeartbeatAt = [string]$_.lastHeartbeatAt
    }
  }
)

$exportPayload = [PSCustomObject]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  source      = $portalEndpoint
  total       = $normalizedItems.Count
  items       = $normalizedItems
}

$exportPayload | ConvertTo-Json -Depth 10 | Set-Content -Path $OutputFile -Encoding UTF8
Write-Ok "Export salvo em: $OutputFile"

if ($DryRun) {
  Write-Info "DryRun ativo. Nenhum envio ao RustDesk foi realizado."
  exit 0
}

if ([string]::IsNullOrWhiteSpace($RustDeskApiBaseUrl)) {
  Write-Warn "RustDeskApiBaseUrl nao informado. Encerrando apos export."
  exit 0
}

if ([string]::IsNullOrWhiteSpace($RustDeskApiToken)) {
  Write-Warn "RustDeskApiToken nao informado. Encerrando apos export."
  exit 0
}

$rustDeskBase = Normalize-BaseUrl -Url $RustDeskApiBaseUrl
$rustDeskHeaders = @{
  "Authorization" = "Bearer $RustDeskApiToken"
}

$candidatePaths = @()
if (-not [string]::IsNullOrWhiteSpace($RustDeskEndpointPath)) {
  $candidatePaths += $RustDeskEndpointPath.Trim()
} else {
  $candidatePaths += "/api/address-book/sync"
  $candidatePaths += "/api/address-book/entries/sync"
  $candidatePaths += "/api/ab/sync"
}

$body = @{
  source = "trilink-portal"
  total  = $normalizedItems.Count
  items  = $normalizedItems
}

$syncSucceeded = $false
$lastError = $null

foreach ($path in $candidatePaths) {
  $fullUri = "$rustDeskBase$path"
  Write-Info "Tentando publicar no RustDesk: $fullUri"
  try {
    $syncResponse = Invoke-JsonRequest -Method "POST" -Uri $fullUri -Headers $rustDeskHeaders -Body $body
    Write-Ok "Sincronizacao publicada com sucesso em $fullUri"
    if ($null -ne $syncResponse) {
      Write-Host ($syncResponse | ConvertTo-Json -Depth 6)
    }
    $syncSucceeded = $true
    break
  } catch {
    $lastError = $_.Exception.Message
    Write-Warn "Falha em $fullUri: $lastError"
  }
}

if (-not $syncSucceeded) {
  throw "Nao foi possivel publicar no RustDesk. Revise RustDeskApiBaseUrl/RustDeskEndpointPath. Ultimo erro: $lastError"
}
