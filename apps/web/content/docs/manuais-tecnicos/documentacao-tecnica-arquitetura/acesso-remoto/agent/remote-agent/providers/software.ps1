function Get-InstalledSoftwareSnapshot {
    param([int]$MaxItems = 200)

    $paths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )

    $list = @()
    foreach ($path in $paths) {
        try {
            $items = Get-ItemProperty -Path $path -ErrorAction SilentlyContinue
            foreach ($it in $items) {
                $name = [string]$it.DisplayName
                if ([string]::IsNullOrWhiteSpace($name)) { continue }
                $list += [ordered]@{
                    name            = Truncate-Text -Text $name -MaxLength 256
                    version         = Truncate-Text -Text ([string]$it.DisplayVersion) -MaxLength 64
                    publisher       = Truncate-Text -Text ([string]$it.Publisher) -MaxLength 256
                    installDate     = Truncate-Text -Text ([string]$it.InstallDate) -MaxLength 32
                    installLocation = Truncate-Text -Text ([string]$it.InstallLocation) -MaxLength 512
                }
            }
        } catch {}
    }

    $seen = @{}
    $deduped = @()
    foreach ($item in $list) {
        $key = "$($item.name)|$($item.version)|$($item.publisher)"
        if (-not $seen.ContainsKey($key)) {
            $seen[$key] = $true
            $deduped += $item
        }
    }

    return @($deduped | Sort-Object { [string]$_.name } | Select-Object -First $MaxItems)
}
