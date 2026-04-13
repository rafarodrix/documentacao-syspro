function Get-HardwareIdentity {
    $result = [ordered]@{
        biosSerial         = ""
        biosVersion        = ""
        motherboardModel   = ""
        systemModel        = ""
        systemManufacturer = ""
    }
    try {
        $bios = Get-CimInstance Win32_BIOS -ErrorAction Stop
        $result.biosSerial  = Truncate-Text -Text ([string]$bios.SerialNumber) -MaxLength 64
        $result.biosVersion = Truncate-Text -Text ([string]$bios.SMBIOSBIOSVersion) -MaxLength 64
    } catch {}
    try {
        $cs = Get-CimInstance Win32_ComputerSystem -ErrorAction Stop
        $result.systemModel        = Truncate-Text -Text ([string]$cs.Model) -MaxLength 128
        $result.systemManufacturer = Truncate-Text -Text ([string]$cs.Manufacturer) -MaxLength 128
    } catch {}
    try {
        $mb = Get-CimInstance Win32_BaseBoard -ErrorAction Stop
        $result.motherboardModel = Truncate-Text -Text ([string]$mb.Product) -MaxLength 128
    } catch {}
    return $result
}
