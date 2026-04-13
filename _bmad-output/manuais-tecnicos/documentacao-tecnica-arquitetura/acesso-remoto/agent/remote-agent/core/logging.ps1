function Ensure-StateDir {
    if (-not (Test-Path $StateDir)) {
        New-Item -Path $StateDir -ItemType Directory -Force | Out-Null
    }
    if (-not (Test-Path $LogsDir)) {
        New-Item -Path $LogsDir -ItemType Directory -Force | Out-Null
    }
}

function Write-Log {
    param([string]$Message)
    Ensure-StateDir
    $line = "$(Get-Date -Format o) | $Message"
    Add-Content -Path $LogFile -Value $line
}


function Remove-OldLogs {
    param([int]$DaysToKeep = 10)
    try {
        if (-not (Test-Path $LogsDir)) { return }
        $limit = (Get-Date).AddDays(-$DaysToKeep)
        Get-ChildItem -Path $LogsDir -Filter "*.log" -File -ErrorAction SilentlyContinue |
            Where-Object { $_.LastWriteTime -lt $limit } |
            Remove-Item -Force -ErrorAction SilentlyContinue
    } catch {}
}

function Rotate-LogIfNeeded {
    param(
        [string]$FilePath,
        [int]$MaxSizeKb = 2048
    )
    if ([string]::IsNullOrWhiteSpace($FilePath)) { return }
    if (-not (Test-Path $FilePath)) { return }
    try {
        $sizeKb = ((Get-Item -Path $FilePath -ErrorAction Stop).Length / 1KB)
        if ($sizeKb -le $MaxSizeKb) { return }
        $dir = Split-Path -Path $FilePath -Parent
        $leaf = Split-Path -Path $FilePath -Leaf
        $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $archiveLeaf = $leaf -replace "\.log$", "-$stamp.log"
        if ($archiveLeaf -eq $leaf) { $archiveLeaf = "$leaf-$stamp.log" }
        $archivePath = Join-Path $dir $archiveLeaf
        Move-Item -Path $FilePath -Destination $archivePath -Force -ErrorAction SilentlyContinue
    } catch {}
}
