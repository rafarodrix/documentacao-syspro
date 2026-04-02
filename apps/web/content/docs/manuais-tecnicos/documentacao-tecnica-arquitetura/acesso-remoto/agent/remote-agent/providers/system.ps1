function Get-SystemSnapshot {
    param([string]$ServiceStatus)

    $snapshot = [ordered]@{
        osCaption          = ""
        osVersion          = ""
        osBuild            = ""
        osArchitecture     = ""
        totalRamMb         = 0
        freeRamMb          = 0
        cpuName            = ""
        cpuCores           = 0
        diskTotalGb        = 0
        diskFreeGb         = 0
        uptimeSeconds      = 0
        lastBootUtc        = ""   # NOVO: hora exata do ultimo boot
        timezone           = ""
        domainOrWorkgroup  = ""
        currentUser        = [string]$env:USERNAME
        serviceStatus      = [string]$ServiceStatus
    }

    try {
        $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
        $snapshot.osCaption      = Truncate-Text -Text ([string]$os.Caption)       -MaxLength 256
        $snapshot.osVersion      = Truncate-Text -Text ([string]$os.Version)       -MaxLength 64
        $snapshot.osBuild        = Truncate-Text -Text ([string]$os.BuildNumber)   -MaxLength 32
        $snapshot.osArchitecture = Truncate-Text -Text ([string]$os.OSArchitecture)-MaxLength 64
        if ($null -ne $os.TotalVisibleMemorySize) {
            $snapshot.totalRamMb = [int][Math]::Round(([double]$os.TotalVisibleMemorySize / 1024.0), 0)
        }
        if ($null -ne $os.FreePhysicalMemory) {
            $snapshot.freeRamMb = [int][Math]::Round(([double]$os.FreePhysicalMemory / 1024.0), 0)
        }
        if ($null -ne $os.LastBootUpTime) {
            $boot = [DateTime]$os.LastBootUpTime
            $snapshot.lastBootUtc    = $boot.ToUniversalTime().ToString("o")
            $snapshot.uptimeSeconds  = [int][Math]::Max(0, (New-TimeSpan -Start $boot -End (Get-Date)).TotalSeconds)
        }
    } catch {}

    try {
        $cpu = Get-CimInstance Win32_Processor -ErrorAction Stop | Select-Object -First 1
        if ($null -ne $cpu) {
            $snapshot.cpuName  = Truncate-Text -Text ([string]$cpu.Name) -MaxLength 256
            if ($null -ne $cpu.NumberOfCores) { $snapshot.cpuCores = [int]$cpu.NumberOfCores }
        }
    } catch {}

    # FIX: mantido C: como referencia rapida no snapshot — detalhe por disco fica em Get-DiskSnapshot
    try {
        $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" -ErrorAction Stop | Select-Object -First 1
        if ($null -eq $disk) {
            $disk = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" -ErrorAction SilentlyContinue | Select-Object -First 1
        }
        if ($null -ne $disk) {
            if ($null -ne $disk.Size)      { $snapshot.diskTotalGb = [int][Math]::Round(([double]$disk.Size / 1GB), 0) }
            if ($null -ne $disk.FreeSpace) { $snapshot.diskFreeGb  = [int][Math]::Round(([double]$disk.FreeSpace / 1GB), 0) }
        }
    } catch {}

    try {
        $tz = Get-TimeZone -ErrorAction Stop
        $snapshot.timezone = Truncate-Text -Text ([string]$tz.Id) -MaxLength 128
    } catch {}

    try {
        $cs = Get-CimInstance Win32_ComputerSystem -ErrorAction Stop
        if (-not [string]::IsNullOrWhiteSpace([string]$cs.Domain)) {
            $snapshot.domainOrWorkgroup = Truncate-Text -Text ([string]$cs.Domain) -MaxLength 128
        } elseif (-not [string]::IsNullOrWhiteSpace([string]$cs.Workgroup)) {
            $snapshot.domainOrWorkgroup = Truncate-Text -Text ([string]$cs.Workgroup) -MaxLength 128
        }
    } catch {}

    return $snapshot
}
