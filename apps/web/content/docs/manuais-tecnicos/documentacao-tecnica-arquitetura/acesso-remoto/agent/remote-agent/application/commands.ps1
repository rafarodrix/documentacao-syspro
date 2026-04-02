function Execute-RemoteCommand {
    param([object]$Command, [hashtable]$State)
    $cmdType = [string](Get-ObjectPropertyValue -Object $Command -Name "type")
    if ([string]::IsNullOrWhiteSpace($cmdType)) {
        $cmdType = [string](Get-ObjectPropertyValue -Object $Command -Name "commandType")
    }
    $result = [ordered]@{
        status  = "ACKNOWLEDGED"
        message = "Comando processado."
        details = [ordered]@{
            commandType             = $cmdType
            executedAtUtc           = (Get-Date).ToUniversalTime().ToString("o")
            executed                = $false
            invalidateTokenAfterAck = $false
        }
    }
    switch ($cmdType.ToUpperInvariant()) {
        "REAPPLY_ALIAS" { $result.message = "REAPPLY_ALIAS recebido; sem acao local no agente."; break }
        "REAPPLY_CONFIG" { $result.message = "REAPPLY_CONFIG recebido; sem acao local no agente."; break }
        "UPGRADE_CLIENT" { $result.message = "UPGRADE_CLIENT recebido; execucao remota nao implementada neste agente."; break }
        "ROTATE_TOKEN_REQUIRED" {
            $result.message = "ROTATE_TOKEN_REQUIRED recebido; token local invalidado para rebootstrap."
            $result.details.executed = $true
            $result.details.invalidateTokenAfterAck = $true
            break
        }
        default { $result.message = "Comando desconhecido tratado sem execucao local."; break }
    }
    return $result
}
