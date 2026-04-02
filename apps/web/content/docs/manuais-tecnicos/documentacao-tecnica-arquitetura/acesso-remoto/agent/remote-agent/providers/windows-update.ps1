function Get-WindowsUpdateStatus {
    $result = [ordered]@{
        pendingCount   = 0
        lastCheckUtc   = ""
        rebootRequired = $false
    }
    try {
        $result.rebootRequired =
            (Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\WindowsUpdate\Auto Update\RebootRequired") -or
            (Test-Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\PendingFileRenameOperations")
    } catch {}
    try {
        $wu = New-Object -ComObject Microsoft.Update.Session -ErrorAction Stop
        $searcher = $wu.CreateUpdateSearcher()
        $search = $searcher.Search("IsInstalled=0 AND IsHidden=0")
        $result.pendingCount = $search.Updates.Count
        $result.lastCheckUtc = (Get-Date).ToUniversalTime().ToString("o")
    } catch {}
    return $result
}
