param(
  [switch]$KeepInstallerDownloads
)

$ErrorActionPreference = "Stop"

function Test-IsAdministrator {
  $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Remove-RegistryValueIfPresent {
  param(
    [string]$Path,
    [string]$Name
  )

  try {
    $item = Get-ItemProperty -Path $Path -ErrorAction Stop
    if ($null -ne $item.$Name) {
      Remove-ItemProperty -Path $Path -Name $Name -Force -ErrorAction Stop
      Write-Host "Removido valor de registro: $Path -> $Name"
    }
  } catch {
  }
}

function Invoke-UninstallString {
  param(
    [string]$CommandLine
  )

  if ([string]::IsNullOrWhiteSpace($CommandLine)) {
    return $false
  }

  $trimmed = $CommandLine.Trim()
  Write-Host "Executando uninstall detectado: $trimmed"

  if ($trimmed -match 'msiexec(\.exe)?\s') {
    $argumentList = $trimmed -replace '^\s*"?[^"]*msiexec(?:\.exe)?"?\s*', ''
    if ($argumentList -notmatch '(^|\s)/x(\s|$)' -and $argumentList -notmatch '(^|\s)/uninstall(\s|$)') {
      $argumentList = "/x $argumentList"
    }
    if ($argumentList -notmatch '(^|\s)/qn(\s|$)') {
      $argumentList = "$argumentList /qn"
    }
    if ($argumentList -notmatch '(^|\s)/norestart(\s|$)') {
      $argumentList = "$argumentList /norestart"
    }
    $process = Start-Process -FilePath "msiexec.exe" -ArgumentList $argumentList -WindowStyle Hidden -Wait -PassThru
    Write-Host "msiexec finalizado com exit code $($process.ExitCode)"
    return $true
  }

  $exe = $null
  $argumentList = ""
  if ($trimmed.StartsWith('"')) {
    $closingQuote = $trimmed.IndexOf('"', 1)
    if ($closingQuote -gt 1) {
      $exe = $trimmed.Substring(1, $closingQuote - 1)
      $argumentList = $trimmed.Substring($closingQuote + 1).Trim()
    }
  }

  if (-not $exe) {
    $parts = $trimmed.Split(' ', 2)
    $exe = $parts[0]
    if ($parts.Count -gt 1) {
      $argumentList = $parts[1]
    }
  }

  if (-not (Test-Path $exe)) {
    Write-Warning "Executavel de uninstall nao encontrado: $exe"
    return $false
  }

  if ($argumentList -notmatch '(^|\s)/S(\s|$)' -and $argumentList -notmatch '(^|\s)/quiet(\s|$)' -and $argumentList -notmatch '(^|\s)/qn(\s|$)') {
    $argumentList = "$argumentList /S".Trim()
  }

  $process = Start-Process -FilePath $exe -ArgumentList $argumentList -WindowStyle Hidden -Wait -PassThru
  Write-Host "Uninstall finalizado com exit code $($process.ExitCode)"
  return $true
}

function Remove-RustDeskUninstallEntries {
  $uninstallRoots = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
    "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"
  )

  foreach ($root in $uninstallRoots) {
    if (-not (Test-Path $root)) {
      continue
    }

    Get-ChildItem -Path $root -ErrorAction SilentlyContinue | ForEach-Object {
      $keyPath = $_.PSPath
      try {
        $item = Get-ItemProperty -Path $keyPath -ErrorAction Stop
      } catch {
        return
      }

      $displayName = [string]$item.DisplayName
      $publisher = [string]$item.Publisher
      $uninstallString = [string]$item.UninstallString

      if ($displayName -notmatch "RustDesk" -and $publisher -notmatch "RustDesk") {
        return
      }

      [void](Invoke-UninstallString -CommandLine $uninstallString)

      try {
        Remove-Item -Path $keyPath -Recurse -Force -ErrorAction Stop
        Write-Host "Removida chave de uninstall residual: $keyPath"
      } catch {
        Write-Warning "Falha ao remover chave de uninstall ${keyPath}: $($_.Exception.Message)"
      }
    }
  }
}

if (-not (Test-IsAdministrator)) {
  throw "Execute este script como Administrador."
}

Write-Host "Encerrando processos do RustDesk"
Get-Process -Name "rustdesk" -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Host "Parando processo rustdesk PID=$($_.Id)"
  Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

Write-Host "Parando e removendo servico RustDesk, se existir"
$service = Get-Service -Name "RustDesk" -ErrorAction SilentlyContinue
if ($service) {
  if ($service.Status -ne "Stopped") {
    Stop-Service -Name "RustDesk" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
  }
  sc.exe delete RustDesk | Out-Null
  Start-Sleep -Seconds 1
}

Remove-RustDeskUninstallEntries

Write-Host "Limpando residuos de processo apos uninstall"
Get-Process -Name "rustdesk" -ErrorAction SilentlyContinue | ForEach-Object {
  Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

$pathsToRemove = @(
  "C:\Program Files\RustDesk",
  "C:\Program Files (x86)\RustDesk",
  "$env:APPDATA\RustDesk",
  "$env:LOCALAPPDATA\RustDesk",
  "C:\Windows\system32\config\systemprofile\AppData\Roaming\RustDesk",
  "C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk",
  "C:\ProgramData\RustDesk"
)

if (-not $KeepInstallerDownloads) {
  $pathsToRemove += @(
    "$env:TEMP\rustdesk*",
    "C:\Windows\Temp\rustdesk*"
  )
}

foreach ($path in $pathsToRemove) {
  $hasWildcard = $path.Contains("*") -or $path.Contains("?")
  $items = if ($hasWildcard) {
    Get-Item -Path $path -ErrorAction SilentlyContinue
  } else {
    Get-Item -LiteralPath $path -ErrorAction SilentlyContinue
  }

  $items | ForEach-Object {
    try {
      Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction Stop
      Write-Host "Removido: $($_.FullName)"
    } catch {
      Write-Warning "Falha ao remover $($_.FullName): $($_.Exception.Message)"
    }
  }
}

Write-Host "Limpando chaves de inicializacao automatica"
Remove-RegistryValueIfPresent -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "RustDesk"
Remove-RegistryValueIfPresent -Path "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "RustDesk"

Write-Host "Limpeza do RustDesk concluida."
Write-Host "Reinicie a maquina antes de reinstalar, especialmente se houver MSI pendente."
