//go:build !windows

package device

// rebootPending sempre retorna false em plataformas nao-Windows.
func (c *Collector) rebootPending() bool { return false }

// CollectServices retorna snapshot vazio em plataformas nao-Windows.
// O agente e um binario Windows-only; este stub existe apenas para compilacao cruzada.
func (c *Collector) CollectServices(sysproInstalls []SysproInstallTarget) (*SysproProcessSnapshot, error) {
	return &SysproProcessSnapshot{CollectedAt: nowRFC3339()}, nil
}
