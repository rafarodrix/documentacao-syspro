$StateDir = Join-Path $env:ProgramData "Trilink\RemoteAgent"
$LogsDir = "C:\Trilink\Remote\Logs"
$LogFile = Join-Path $LogsDir "agentRemote.log"
$StateFile = Join-Path $StateDir "agent-state.json"

$script:RegistryReadTrace = @{}
$script:InstallTokenReadSource = "not_checked"
$script:RunMutex = $null
$script:HasRunMutex = $false
$script:RunMutexName = ""
