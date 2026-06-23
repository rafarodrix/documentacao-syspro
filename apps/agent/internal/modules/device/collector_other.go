//go:build !windows

package device

import "context"

// Os metodos abaixo sao stubs para compilacao cruzada em plataformas nao-Windows.
// O agente e um binario Windows-only; estes stubs garantem que `go build` passe
// em ambientes de CI que compilem sem GOOS=windows.

func (c *Collector) CollectMetrics(_ context.Context) (*AgentMetricsSnapshot, error) {
	return &AgentMetricsSnapshot{CollectedAt: nowRFC3339()}, nil
}

func (c *Collector) CollectSystemSnapshot(_ context.Context) (*SystemSnapshot, error) {
	return &SystemSnapshot{CollectedAt: nowRFC3339()}, nil
}

func (c *Collector) CollectNetworkSnapshot(_ context.Context) (*NetworkSnapshot, error) {
	return &NetworkSnapshot{CollectedAt: nowRFC3339()}, nil
}

func (c *Collector) CollectSoftwareSnapshot(_ context.Context) ([]SoftwareEntry, error) {
	return nil, nil
}

func (c *Collector) CollectHardwareIdentity(_ context.Context) (*HardwareIdentitySnapshot, error) {
	return &HardwareIdentitySnapshot{CollectedAt: nowRFC3339()}, nil
}

func (c *Collector) CollectWindowsUpdateStatus(_ context.Context) (*WindowsUpdateStatusSnapshot, error) {
	return &WindowsUpdateStatusSnapshot{CollectedAt: nowRFC3339()}, nil
}

func (c *Collector) CollectDisks(_ context.Context) (*DiskVolumeSnapshot, error) {
	return &DiskVolumeSnapshot{CollectedAt: nowRFC3339()}, nil
}

func (c *Collector) CollectServices(_ []SysproInstallTarget) (*SysproProcessSnapshot, error) {
	return &SysproProcessSnapshot{CollectedAt: nowRFC3339()}, nil
}

func (c *Collector) rebootPending() bool { return false }

func (c *Collector) readExeVersion(_ string) string { return "" }
