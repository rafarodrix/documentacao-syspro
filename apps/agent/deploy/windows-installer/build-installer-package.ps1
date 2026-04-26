$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$agentRoot = Resolve-Path (Join-Path $root "..\..")
$sourceDeployRoot = Join-Path $agentRoot "dist\test-deploy\windows-amd64"
$stageRoot = Join-Path $agentRoot "dist\windows-installer\staging"
$outputRoot = Join-Path $agentRoot "dist\windows-installer\output"
$runtimeRoot = Join-Path $root "runtime"
$sourceEnv = Join-Path $agentRoot ".env"
$sourceEnvExample = Join-Path $agentRoot ".env.example"

function Remove-DirectoryRobust {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path $Path)) {
    return
  }

  $item = Get-Item -LiteralPath $Path -Force
  if (-not $item.PSIsContainer) {
    try {
      $item.Attributes = [System.IO.FileAttributes]::Normal
    } catch {
    }
    [System.IO.File]::Delete($item.FullName)
    return
  }

  Get-ChildItem -LiteralPath $Path -Recurse -Force -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | ForEach-Object {
    try {
      $_.Attributes = [System.IO.FileAttributes]::Normal
    } catch {
    }
  }

  try {
    (Get-Item -LiteralPath $Path -Force).Attributes = [System.IO.FileAttributes]::Directory
  } catch {
  }

  for ($attempt = 1; $attempt -le 3; $attempt++) {
    try {
      Get-ChildItem -LiteralPath $Path -Recurse -Force -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | ForEach-Object {
        if ($_.PSIsContainer) {
          [System.IO.Directory]::Delete($_.FullName, $false)
        } else {
          [System.IO.File]::Delete($_.FullName)
        }
      }
      [System.IO.Directory]::Delete($Path, $false)
      return
    } catch {
      if ($attempt -eq 3) {
        throw
      }
      Start-Sleep -Milliseconds 500
    }
  }
}

function Ensure-Directory {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  for ($attempt = 1; $attempt -le 5; $attempt++) {
    try {
      [System.IO.Directory]::CreateDirectory($Path) | Out-Null
      return
    } catch {
      if ($attempt -eq 5) {
        throw
      }
      Start-Sleep -Milliseconds 500
    }
  }
}

if (-not (Test-Path $sourceDeployRoot)) {
  throw "Pacote base nao encontrado: $sourceDeployRoot"
}

if (Test-Path $stageRoot) {
  Get-ChildItem -LiteralPath $stageRoot -Force -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-DirectoryRobust -Path $_.FullName
  }
} else {
  Ensure-Directory -Path $stageRoot
}

Ensure-Directory -Path $outputRoot
Ensure-Directory -Path (Join-Path $stageRoot "assets\img")
Ensure-Directory -Path (Join-Path $stageRoot "scripts")
Ensure-Directory -Path (Join-Path $stageRoot "config")
Ensure-Directory -Path (Join-Path $stageRoot "rustdesk")

Copy-Item -LiteralPath (Join-Path $sourceDeployRoot "agent-service.exe") -Destination (Join-Path $stageRoot "agent-service.exe")
Copy-Item -LiteralPath (Join-Path $sourceDeployRoot "agent-ui.exe") -Destination (Join-Path $stageRoot "agent-ui.exe")
Copy-Item -LiteralPath (Join-Path $agentRoot "assets\icon.ico") -Destination (Join-Path $stageRoot "icon.ico")
Copy-Item -LiteralPath (Join-Path $agentRoot "assets\img\logo-clara.png") -Destination (Join-Path $stageRoot "assets\img\logo-clara.png")
Copy-Item -LiteralPath (Join-Path $agentRoot "assets\img\logo-escura.png") -Destination (Join-Path $stageRoot "assets\img\logo-escura.png")
Copy-Item -LiteralPath (Join-Path $sourceDeployRoot "ensure-webview2-runtime.ps1") -Destination (Join-Path $stageRoot "scripts\ensure-webview2-runtime.ps1")

Copy-Item -LiteralPath (Join-Path $runtimeRoot "start-agent.ps1") -Destination (Join-Path $stageRoot "scripts\start-agent.ps1")
Copy-Item -LiteralPath (Join-Path $runtimeRoot "start-agent.cmd") -Destination (Join-Path $stageRoot "scripts\start-agent.cmd")
Copy-Item -LiteralPath (Join-Path $runtimeRoot "stop-agent.ps1") -Destination (Join-Path $stageRoot "scripts\stop-agent.ps1")
Copy-Item -LiteralPath (Join-Path $runtimeRoot "stop-agent.cmd") -Destination (Join-Path $stageRoot "scripts\stop-agent.cmd")
Copy-Item -LiteralPath (Join-Path $runtimeRoot "open-config.cmd") -Destination (Join-Path $stageRoot "scripts\open-config.cmd")
Copy-Item -LiteralPath (Join-Path $runtimeRoot "open-logs.cmd") -Destination (Join-Path $stageRoot "scripts\open-logs.cmd")

Copy-Item -LiteralPath $sourceEnvExample -Destination (Join-Path $stageRoot "config\.env.example")
if (Test-Path $sourceEnv) {
  Copy-Item -LiteralPath $sourceEnv -Destination (Join-Path $stageRoot "config\.env")
}

$bundledRustDesk = Get-ChildItem -Path $sourceDeployRoot -File | Where-Object { $_.Name -match '^rustdesk.*\.(msi|exe)$' }
foreach ($installer in $bundledRustDesk) {
  Copy-Item -LiteralPath $installer.FullName -Destination (Join-Path $stageRoot "rustdesk\$($installer.Name)")
}

@"
Agente Trilink
==============

Arquivos instalados:
- agent-service.exe
- agent-ui.exe
- icon.ico
- assets\img\logo-clara.png
- assets\img\logo-escura.png

Configuracao:
- O instalador grava a configuracao em C:\ProgramData\Trilink\Agent\.env na primeira execucao.
- Se o pacote foi montado com apps\agent\.env local, esse arquivo ja sera usado como seed.
- Caso contrario, o seed inicial sera apps\agent\.env.example.

Operacao:
- Iniciar: scripts\start-agent.cmd
- Parar: scripts\stop-agent.cmd
- Editar config: scripts\open-config.cmd
- Logs: scripts\open-logs.cmd
"@ | Set-Content -Path (Join-Path $stageRoot "README-installer.txt") -Encoding ASCII

Write-Host "Pacote de instalador montado em: $stageRoot"
Write-Host "Saida do instalador: $outputRoot"
Write-Host ""
Write-Host "Para compilar com Inno Setup:"
Write-Host "  ISCC.exe `"$root\AgenteTrilink.iss`""
