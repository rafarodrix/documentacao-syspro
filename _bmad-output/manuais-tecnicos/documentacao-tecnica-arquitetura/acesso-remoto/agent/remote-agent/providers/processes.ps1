function Get-SysproProcessStatus {
    $processNames = @("SysproServer", "fbserver")
    $results = @()
    foreach ($name in $processNames) {
        $procs = @(Get-Process -Name $name -ErrorAction SilentlyContinue)
        $results += [ordered]@{
            processName = $name
            running     = ($procs.Count -gt 0)
            count       = $procs.Count
            pidList     = ($procs | ForEach-Object { $_.Id }) -join ","
        }
    }
    return $results
}
