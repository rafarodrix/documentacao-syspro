function Get-RegistryStringValue {
    param(
        [string]$SubKeyPath,
        [string]$ValueName
    )
    $traceKey = "${SubKeyPath}::${ValueName}"
    $views = @(
        [Microsoft.Win32.RegistryView]::Registry64,
        [Microsoft.Win32.RegistryView]::Registry32
    )
    foreach ($view in $views) {
        try {
            $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::LocalMachine, $view)
            try {
                $sub = $base.OpenSubKey($SubKeyPath)
                if ($null -eq $sub) { continue }
                try {
                    $val = $sub.GetValue($ValueName)
                    if ($null -ne $val) {
                        $str = [string]$val
                        if (-not [string]::IsNullOrWhiteSpace($str)) {
                            $script:RegistryReadTrace[$traceKey] = [string]$view
                            return $str
                        }
                    }
                } finally { $sub.Close() }
            } finally { $base.Close() }
        } catch { continue }
    }
    $script:RegistryReadTrace[$traceKey] = "not_found"
    return $null
}

function Get-RegistryReadSource {
    param([string]$SubKeyPath, [string]$ValueName)
    $traceKey = "${SubKeyPath}::${ValueName}"
    if ($script:RegistryReadTrace.ContainsKey($traceKey)) {
        return [string]$script:RegistryReadTrace[$traceKey]
    }
    return "unknown"
}

function Get-PortalBaseUrl {
    $val = Get-RegistryStringValue -SubKeyPath "SOFTWARE\Trilink\RemoteAgent" -ValueName "PortalBaseUrl"
    if (-not [string]::IsNullOrWhiteSpace($val)) { return ([string]$val).TrimEnd('/') }
    return $null
}

function Get-DiscoveryToken {
    $val = Get-RegistryStringValue -SubKeyPath "SOFTWARE\Trilink\RemoteAgent" -ValueName "DiscoveryToken"
    if (-not [string]::IsNullOrWhiteSpace($val)) { return [string]$val }
    return $null
}

function Get-InstallToken {
    $script:InstallTokenReadSource = "not_found"
    $val = Get-RegistryStringValue -SubKeyPath "SOFTWARE\Trilink\RemoteAgent" -ValueName "InstallToken"
    if (-not [string]::IsNullOrWhiteSpace($val)) {
        $script:InstallTokenReadSource = "registry_$((Get-RegistryReadSource -SubKeyPath 'SOFTWARE\Trilink\RemoteAgent' -ValueName 'InstallToken').ToLowerInvariant())"
        return [string]$val
    }
    $fallbackFiles = @(
        (Join-Path $PSScriptRoot "install-token.txt"),
        "C:\Trilink\Remote\RustDesk\install-token.txt"
    ) | Select-Object -Unique
    foreach ($tokenFile in $fallbackFiles) {
        try {
            if (-not (Test-Path $tokenFile)) { continue }
            $raw = Get-Content -Path $tokenFile -Raw -ErrorAction Stop
            $fileToken = ([string]$raw).Trim()
            if (-not [string]::IsNullOrWhiteSpace($fileToken)) {
                $script:InstallTokenReadSource = "file:$tokenFile"
                return $fileToken
            }
        } catch { continue }
    }
    return $null
}

function Get-InstallTokenReadSource {
    return [string]$script:InstallTokenReadSource
}
