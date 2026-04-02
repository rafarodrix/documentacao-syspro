function Initialize-TlsSecurity {
    try {
        $tls13 = [Net.SecurityProtocolType]::Tls13
        [Net.ServicePointManager]::SecurityProtocol = $tls13 -bor [Net.SecurityProtocolType]::Tls12
    } catch {
        try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
    }
}
