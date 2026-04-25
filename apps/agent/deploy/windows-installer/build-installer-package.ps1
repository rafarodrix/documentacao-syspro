$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$agentRoot = Resolve-Path (Join-Path $root "..\..")
$sourceDeployRoot = Join-Path $agentRoot "dist\test-deploy\windows-amd64"
$stageRoot = Join-Path $agentRoot "dist\windows-installer\staging"
$outputRoot = Join-Path $agentRoot "dist\windows-installer\output"
$runtimeRoot = Join-Path $root "runtime"
$sourceEnv = Join-Path $agentRoot ".env"
$sourceEnvExample = Join-Path $agentRoot ".env.example"

if (-not (Test-Path $sourceDeployRoot)) {
  throw "Pacote base nao encontrado: $sourceDeployRoot"
}

if (Test-Path $stageRoot) {
  Remove-Item -LiteralPath $stageRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $stageRoot | Out-Null
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $stageRoot "assets\img") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $stageRoot "scripts") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $stageRoot "config") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $stageRoot "rustdesk") | Out-Null

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

