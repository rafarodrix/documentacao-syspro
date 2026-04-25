$ErrorActionPreference = "SilentlyContinue"

foreach ($name in @("agent-ui", "agent-service")) {
  Get-Process -Name $name | ForEach-Object {
    Stop-Process -Id $_.Id -Force
  }
}

