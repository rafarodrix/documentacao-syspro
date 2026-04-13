function Get-NetworkSnapshot {
    $snapshot = [ordered]@{
        defaultGateway = ""
        dnsServers     = @()
        adapters       = @()
    }

    $hasModernNetCmdlets = $null -ne (Get-Command Get-NetRoute -ErrorAction SilentlyContinue)
    if (-not $hasModernNetCmdlets) {
        try {
            if ($null -ne (Get-Command Get-CimInstance -ErrorAction SilentlyContinue)) {
                $nics = Get-CimInstance Win32_NetworkAdapterConfiguration -Filter "IPEnabled=True" -ErrorAction Stop
            } else {
                $nics = Get-WmiObject Win32_NetworkAdapterConfiguration -Filter "IPEnabled=True" -ErrorAction Stop
            }
            foreach ($nic in $nics) {
                if ($nic.IPAddress -and $nic.IPAddress.Count -gt 0) {
                    $snapshot.adapters += [ordered]@{
                        alias  = Truncate-Text -Text ([string]$nic.Description) -MaxLength 128
                        ip     = [string]$nic.IPAddress[0]
                        prefix = 0
                    }
                }
                if ($nic.DefaultIPGateway -and [string]::IsNullOrWhiteSpace($snapshot.defaultGateway)) {
                    $snapshot.defaultGateway = [string]$nic.DefaultIPGateway[0]
                }
                if ($nic.DNSServerSearchOrder) {
                    $snapshot.dnsServers += @($nic.DNSServerSearchOrder | Select-Object -First 3 | ForEach-Object { [string]$_ })
                }
            }
            if ($snapshot.dnsServers.Count -gt 0) {
                $snapshot.dnsServers = @($snapshot.dnsServers | Select-Object -Unique | Select-Object -First 6)
            }
        } catch {}
        return $snapshot
    }

    try {
        $route = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -AddressFamily IPv4 -ErrorAction Stop |
            Sort-Object RouteMetric, InterfaceMetric | Select-Object -First 1
        if ($null -ne $route -and -not [string]::IsNullOrWhiteSpace([string]$route.NextHop)) {
            $snapshot.defaultGateway = [string]$route.NextHop
        }
    } catch {}

    try {
        $dns = Get-DnsClientServerAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object { $_.ServerAddresses -and $_.ServerAddresses.Count -gt 0 } |
            ForEach-Object { $_.ServerAddresses } | Select-Object -Unique
        if ($dns) { $snapshot.dnsServers = @($dns | ForEach-Object { [string]$_ } | Select-Object -First 6) }
    } catch {}

    try {
        $adapters = @()
        $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object { $_.IPAddress -and $_.IPAddress -ne "127.0.0.1" -and $_.PrefixOrigin -ne "WellKnown" }
        foreach ($ip in $ips) {
            $adapters += [ordered]@{
                alias  = Truncate-Text -Text ([string]$ip.InterfaceAlias) -MaxLength 128
                ip     = [string]$ip.IPAddress
                prefix = [int]$ip.PrefixLength
            }
        }
        if ($adapters.Count -gt 0) {
            $snapshot.adapters = @($adapters | Select-Object -First 12)
        }
    } catch {}

    return $snapshot
}
