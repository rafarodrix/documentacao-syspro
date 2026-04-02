function Get-DiskSnapshot {
    $disks = @()
    try {
        $drives = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" -ErrorAction Stop
        foreach ($d in $drives) {
            $disks += [ordered]@{
                drive       = [string]$d.DeviceID
                totalGb     = [int][Math]::Round(([double]$d.Size / 1GB), 0)
                freeGb      = [int][Math]::Round(([double]$d.FreeSpace / 1GB), 0)
                freePercent = if ($d.Size -gt 0) { [int][Math]::Round((([double]$d.FreeSpace / [double]$d.Size) * 100), 0) } else { 0 }
                label       = Truncate-Text -Text ([string]$d.VolumeName) -MaxLength 64
            }
        }
    } catch {}
    return $disks
}
