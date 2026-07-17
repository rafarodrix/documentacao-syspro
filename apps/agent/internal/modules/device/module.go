package device

import (
	"context"
	"sync"

	"trilink/agent/internal/domain"
)

// Module e o modulo de coleta de contexto e metricas do dispositivo.
// Ciclos de coleta:
//   - Metricas (memoria, CPU, reboot), servicos e topologia Syspro: todo Apply (~45s)
//   - Disco por unidade e inventario geral: a cada 4 ciclos (~3 min)
type Module struct {
	collector  *Collector
	logger     Logger
	mu         sync.RWMutex
	cycleCount uint64

	lastMetrics       *AgentMetricsSnapshot
	lastSystem        *SystemSnapshot
	lastNetwork       *NetworkSnapshot
	lastSoftware      []SoftwareEntry
	lastHardware      *HardwareIdentitySnapshot
	lastWindowsUpdate *WindowsUpdateStatusSnapshot
	lastDisks         *DiskVolumeSnapshot
	lastServices      *SysproProcessSnapshot
	lastAllServices   *AllServicesSnapshot
	lastVersions      *SysproVersionSnapshot
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
	sysproHints := toCollectorHints(desired.Device.SysproInstallationHints)
	sysproSnapshot := m.collector.CollectSysproInstallations(ctx, sysproHints)
	m.mu.Lock()
	m.lastVersions = sysproSnapshot
	m.mu.Unlock()

	// Metricas e servicos: todo ciclo (~45s)
	if desired.Device.CollectMetrics {
		if metrics, err := m.collector.CollectMetrics(ctx); err != nil {
			m.logger.Warn("device: collect metrics failed", "error", err)
		} else {
			m.mu.Lock()
			m.lastMetrics = metrics
			m.mu.Unlock()
		}

		if services, err := m.collector.CollectServices(sysproSnapshot); err != nil {
			m.logger.Warn("device: collect services failed", "error", err)
		} else {
			m.mu.Lock()
			m.lastServices = services
			m.mu.Unlock()
		}
	}

	// Disco: a cada 4 ciclos (~3 min)
	if desired.Device.CollectInventory && (m.cycleCount == 1 || m.cycleCount%4 == 0) {
		if system, err := m.collector.CollectSystemSnapshot(ctx); err != nil {
			m.logger.Warn("device: collect system snapshot failed", "error", err)
		} else {
			m.mu.Lock()
			m.lastSystem = system
			m.mu.Unlock()
		}

		if network, err := m.collector.CollectNetworkSnapshot(ctx); err != nil {
			m.logger.Warn("device: collect network snapshot failed", "error", err)
		} else {
			m.mu.Lock()
			m.lastNetwork = network
			m.mu.Unlock()
		}

		if software, err := m.collector.CollectSoftwareSnapshot(ctx); err != nil {
			m.logger.Warn("device: collect software snapshot failed", "error", err)
		} else {
			m.mu.Lock()
			m.lastSoftware = software
			m.mu.Unlock()
		}

		if hardware, err := m.collector.CollectHardwareIdentity(ctx); err != nil {
			m.logger.Warn("device: collect hardware identity failed", "error", err)
		} else {
			m.mu.Lock()
			m.lastHardware = hardware
			m.mu.Unlock()
		}

		if updates, err := m.collector.CollectWindowsUpdateStatus(ctx); err != nil {
			m.logger.Warn("device: collect windows update status failed", "error", err)
		} else {
			m.mu.Lock()
			m.lastWindowsUpdate = updates
			m.mu.Unlock()
		}

		if disks, err := m.collector.CollectDisks(ctx); err != nil {
			m.logger.Warn("device: collect disks failed", "error", err)
		} else {
			m.mu.Lock()
			m.lastDisks = disks
			m.mu.Unlock()
		}

		if allSvc, err := m.collector.CollectAllServices(); err != nil {
			m.logger.Warn("device: collect all services failed", "error", err)
		} else {
			m.mu.Lock()
			m.lastAllServices = allSvc
			m.mu.Unlock()
		}
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
// Retorna os snapshots no formato exato esperado pelo portal:
//   - metrics: Record (objeto) — normalizeOptionalRecordWithWarning
//   - disks:   Array de objetos — normalizeOptionalRecordArrayWithWarning (NAO o struct wrapper)
//   - services: Array de objetos — normalizeOptionalRecordArrayWithWarning (NAO o struct wrapper)
//   - versions: Record (objeto) — normalizeOptionalRecordWithWarning
//   - rebootPending: *bool (boolean JSON) — normalizeOptionalBooleanWithWarning
//
// Retorna nil em cada campo enquanto a primeira coleta nao ocorreu.
func (m *Module) GetSyncSnapshots() (metrics, system, network, software, hardware, disks, services, versions, windowsUpdate, allServices any, rebootPending *bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if m.lastMetrics != nil {
		metrics = m.lastMetrics // objeto: collectedAt, memoryTotalMb, cpuLoadPct, ...
		rb := m.lastMetrics.RebootPending
		rebootPending = &rb
	}
	if m.lastSystem != nil {
		system = m.lastSystem
	}
	if m.lastNetwork != nil {
		network = m.lastNetwork
	}
	if len(m.lastSoftware) > 0 {
		software = m.lastSoftware
	}
	if m.lastHardware != nil {
		hardware = m.lastHardware
	}
	if m.lastDisks != nil {
		disks = m.lastDisks.Volumes // array de DiskVolume: [{letter, label, fsType, ...}]
	}
	if m.lastServices != nil {
		services = m.lastServices.Services // array de ServiceStatus: [{name, status, pid, ...}]
	}
	if m.lastVersions != nil {
		versions = m.lastVersions // objeto: collectedAt, installations: [...]
	}
	if m.lastWindowsUpdate != nil {
		windowsUpdate = m.lastWindowsUpdate
	}
	if m.lastAllServices != nil {
		allServices = m.lastAllServices.Services // array completo de ServiceStatus
	}
	return
}

// toCollectorHints converte domain.SysproInstallationHint para o tipo interno do collector.
func toCollectorHints(targets []domain.SysproInstallationHint) []SysproInstallationHint {
	out := make([]SysproInstallationHint, len(targets))
	for i, t := range targets {
		out[i] = SysproInstallationHint{
			CompanyID:   t.CompanyID,
			CompanyName: t.CompanyName,
			Path:        t.Path,
		}
	}
	return out
}
