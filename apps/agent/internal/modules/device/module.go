package device

import (
	"context"
	"sync"

	"trilink/agent/internal/domain"
)

// Module e o modulo de coleta de contexto e metricas do dispositivo.
// Ciclos de coleta:
//   - Metricas (memoria, CPU, reboot) e servicos: todo Apply (~45s)
//   - Disco por unidade: a cada 4 ciclos (~3 min)
//   - Versao do SysproServer.exe: a cada 80 ciclos (~1h) ou no primeiro ciclo
type Module struct {
	collector  *Collector
	logger     Logger
	mu         sync.RWMutex
	cycleCount uint64

	lastMetrics  *AgentMetricsSnapshot
	lastDisks    *DiskVolumeSnapshot
	lastServices *SysproProcessSnapshot
	lastVersions *SysproVersionSnapshot
}

// New cria um DeviceModule pronto para uso.
func New(logger Logger) *Module {
	return &Module{
		collector: NewCollector(logger),
		logger:    logger,
	}
}

func (m *Module) Name() string { return "device" }

func (m *Module) Inspect(_ context.Context) (domain.CurrentModuleState, error) {
	return domain.CurrentModuleState{
		Enabled: true,
		Status:  domain.ModuleStatusReady,
	}, nil
}

func (m *Module) Plan(desired domain.DesiredState, _ domain.CurrentModuleState) []domain.ReconcileAction {
	if !desired.Device.Enabled {
		return nil
	}
	return []domain.ReconcileAction{{
		Module: "device",
		Type:   "collect",
		Reason: "device snapshot cycle",
	}}
}

func (m *Module) Apply(ctx context.Context, desired domain.DesiredState, _ domain.CurrentModuleState) domain.ApplyResult {
	if !desired.Device.Enabled {
		return domain.ApplyResult{Module: "device", Message: "disabled"}
	}

	m.cycleCount++
	installs := toCollectorInstalls(desired.Device.SysproInstalls)

	// Metricas e servicos: todo ciclo (~45s)
	if desired.Device.CollectMetrics {
		if metrics, err := m.collector.CollectMetrics(ctx); err != nil {
			m.logger.Warn("device: collect metrics failed", "error", err)
		} else {
			m.mu.Lock()
			m.lastMetrics = metrics
			m.mu.Unlock()
		}

		if services, err := m.collector.CollectServices(installs); err != nil {
			m.logger.Warn("device: collect services failed", "error", err)
		} else {
			m.mu.Lock()
			m.lastServices = services
			m.mu.Unlock()
		}
	}

	// Disco: a cada 4 ciclos (~3 min)
	if desired.Device.CollectInventory && m.cycleCount%4 == 0 {
		if disks, err := m.collector.CollectDisks(ctx); err != nil {
			m.logger.Warn("device: collect disks failed", "error", err)
		} else {
			m.mu.Lock()
			m.lastDisks = disks
			m.mu.Unlock()
		}
	}

	// Versao SysproServer: a cada 80 ciclos (~1h) ou na primeira execucao
	if len(installs) > 0 && (m.cycleCount == 1 || m.cycleCount%80 == 0) {
		snap := m.collector.CollectSysproVersions(ctx, installs)
		m.mu.Lock()
		m.lastVersions = snap
		m.mu.Unlock()
	}

	return domain.ApplyResult{Module: "device", Changed: true, Message: "device snapshot collected"}
}

// GetLastSnapshot retorna os ultimos snapshots coletados com tipos concretos.
// Thread-safe. Retorna nil em cada campo enquanto a primeira coleta nao ocorreu.
func (m *Module) GetLastSnapshot() (
	metrics *AgentMetricsSnapshot,
	disks *DiskVolumeSnapshot,
	services *SysproProcessSnapshot,
	versions *SysproVersionSnapshot,
) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.lastMetrics, m.lastDisks, m.lastServices, m.lastVersions
}

// GetSyncSnapshots implementa remote.DeviceSnapshotProvider.
// Retorna os snapshots como any para injecao direta nos campos do RemoteSyncRequest.
// Retorna nil em cada campo enquanto a primeira coleta nao ocorreu.
// rebootPending e *bool: nil quando ainda nao coletado, ponteiro para o valor quando coletado.
func (m *Module) GetSyncSnapshots() (metrics, disks, services, versions any, rebootPending *bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if m.lastMetrics != nil {
		metrics = m.lastMetrics
		rb := m.lastMetrics.RebootPending
		rebootPending = &rb
	}
	if m.lastDisks != nil {
		disks = m.lastDisks
	}
	if m.lastServices != nil {
		services = m.lastServices
	}
	if m.lastVersions != nil {
		versions = m.lastVersions
	}
	return
}

// toCollectorInstalls converte domain.SysproInstallTarget para o tipo interno do collector.
func toCollectorInstalls(targets []domain.SysproInstallTarget) []SysproInstallTarget {
	out := make([]SysproInstallTarget, len(targets))
	for i, t := range targets {
		out[i] = SysproInstallTarget{
			CompanyID:   t.CompanyID,
			CompanyName: t.CompanyName,
			ServerPath:  t.ServerPath,
			DataPath:    t.DataPath,
		}
	}
	return out
}
