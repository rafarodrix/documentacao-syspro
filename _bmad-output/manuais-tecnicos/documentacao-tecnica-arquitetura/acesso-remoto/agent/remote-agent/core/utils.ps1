function Mask-Secret {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return "empty" }
    $len = $Value.Length
    if ($len -le 4) { return ("*" * $len) }
    return ("*" * ($len - 4)) + $Value.Substring($len - 4)
}

function Truncate-Text {
    param(
        [AllowNull()][string]$Text,
        [int]$MaxLength = 256
    )
    if ($null -eq $Text) { return "" }
    if ($MaxLength -le 0) { return "" }
    if ($Text.Length -le $MaxLength) { return $Text }
    return $Text.Substring(0, $MaxLength)
}

function Get-TopLevelKeys {
    param([object]$Object)
    if ($null -eq $Object) { return "" }
    if ($Object -is [hashtable]) {
        return (($Object.Keys | Sort-Object) -join ",")
    }
    $names = @($Object.PSObject.Properties | ForEach-Object { $_.Name })
    return (($names | Sort-Object) -join ",")
}

function To-Bool {
    param($Value)
    if ($Value -is [bool]) { return $Value }
    if ($null -eq $Value) { return $false }
    $text = ([string]$Value).Trim()
    if ([string]::IsNullOrWhiteSpace($text)) { return $false }
    return ($text -match "^(?i:true|1|yes|sim)$")
}

function Get-Sha256Hex {
    param([string]$InputText)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes     = [System.Text.Encoding]::UTF8.GetBytes($InputText)
        $hashBytes = $sha.ComputeHash($bytes)
        return ([System.BitConverter]::ToString($hashBytes)).Replace("-", "").ToLowerInvariant()
    } finally {
        $sha.Dispose()
    }
}
