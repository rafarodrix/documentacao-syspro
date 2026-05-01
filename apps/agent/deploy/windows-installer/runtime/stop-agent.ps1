$ErrorActionPreference = "SilentlyContinue"

foreach ($name in @("agent-ui", "agent-service")) {
  Get-Process -Name $name | ForEach-Object {
    Stop-Process -Id $_.Id -Force
  }
}

$deadline = (Get-Date).AddSeconds(20)
do {
  $remaining = @()
  foreach ($name in @("agent-ui", "agent-service")) {
    $remaining += @(Get-Process -Name $name -ErrorAction SilentlyContinue)
  }

  if ($remaining.Count -eq 0) {
    break
  }

  Start-Sleep -Milliseconds 500
} while ((Get-Date) -lt $deadline)
