package device

import (
	"context"
	"sync"
	"time"

	"trilink/agent/internal/domain"
)

// Module e o modulo de coleta de contexto e metricas do dispositivo.
// Ciclos de coleta:
//   - Metricas (memoria, CPU, reboot), servicos e topologia Syspro: todo Apply (~45s)
//   - Disco por unidade e inventario geral: a cada 4 ciclos (~3 min)
type Module struct {
	collector  *Collector
	logger     Logger
	snapshots  *snapshotTracker
	mu         sync.RWMutex
	collectMu  sync.Mutex
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
	syncBatch         map[string]struct{}
}

// New cria um DeviceModule pronto para uso.
func New(logger Logger, store StateStore) *Module {
	return &Module{
		collector: NewCollector(logger),
		logger:    logger,
		snapshots: newSnapshotTracker(store),
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
	m.collectMu.Lock()
	defer m.collectMu.Unlock()

	m.cycleCount++
	now := time.Now().UTC()
	var sysproSnapshot *SysproVersionSnapshot
	m.mu.RLock()
	sysproSnapshot = m.lastVersions
	m.mu.RUnlock()
	if desired.Device.CollectInventory && (sysproSnapshot == nil || m.snapshots.due(ctx, "syspro_versions", now)) {
		sysproHints := toCollectorHints(desired.Device.SysproInstallationHints)
		sysproSnapshot = m.collector.CollectSysproInstallations(ctx, sysproHints)
		m.mu.Lock()
		m.lastVersions = sysproSnapshot
		m.mu.Unlock()
		m.observeSnapshot(ctx, "syspro_versions", sysproSnapshot, now)
	}

	if desired.Device.CollectMetrics && m.snapshots.due(ctx, "metrics", now) {
		if metrics, err := m.collector.CollectMetrics(ctx); err != nil {
			m.logger.Warn("device: collect metrics failed", "error", err)
			m.recordCollectionFailure(ctx, "metrics", err, now)
		} else {
			m.mu.Lock()
			m.lastMetrics = metrics
			m.mu.Unlock()
			m.observeSnapshot(ctx, "metrics", metrics, now)
		}
	}

	if desired.Device.CollectMetrics && m.snapshots.due(ctx, "critical_services", now) {
		if services, err := m.collector.CollectServices(sysproSnapshot); err != nil {
			m.logger.Warn("device: collect services failed", "error", err)
			m.recordCollectionFailure(ctx, "critical_services", err, now)
		} else {
			m.mu.Lock()
			m.lastServices = services
			m.mu.Unlock()
			m.observeSnapshot(ctx, "critical_services", services, now)
		}
	}

	if desired.Device.CollectInventory && m.snapshots.due(ctx, "system", now) {
		if system, err := m.collector.CollectSystemSnapshot(ctx); err != nil {
			m.logger.Warn("device: collect system snapshot failed", "error", err)
			m.recordCollectionFailure(ctx, "system", err, now)
		} else {
			m.mu.Lock()
			m.lastSystem = system
			m.mu.Unlock()
			m.observeSnapshot(ctx, "system", system, now)
		}
	}

	if desired.Device.CollectInventory && m.snapshots.due(ctx, "network", now) {
		if network, err := m.collector.CollectNetworkSnapshot(ctx); err != nil {
			m.logger.Warn("device: collect network snapshot failed", "error", err)
			m.recordCollectionFailure(ctx, "network", err, now)
		} else {
			m.mu.Lock()
			m.lastNetwork = network
			m.mu.Unlock()
			m.observeSnapshot(ctx, "network", network, now)
		}
	}

	if desired.Device.CollectInventory && m.snapshots.due(ctx, "software", now) {
		if software, err := m.collector.CollectSoftwareSnapshot(ctx); err != nil {
			m.logger.Warn("device: collect software snapshot failed", "error", err)
			m.recordCollectionFailure(ctx, "software", err, now)
		} else {
			m.mu.Lock()
			m.lastSoftware = software
			m.mu.Unlock()
			m.observeSnapshot(ctx, "software", software, now)
		}
	}

	if desired.Device.CollectInventory && m.snapshots.due(ctx, "hardware", now) {
		if hardware, err := m.collector.CollectHardwareIdentity(ctx); err != nil {
			m.logger.Warn("device: collect hardware identity failed", "error", err)
			m.recordCollectionFailure(ctx, "hardware", err, now)
		} else {
			m.mu.Lock()
			m.lastHardware = hardware
			m.mu.Unlock()
			m.observeSnapshot(ctx, "hardware", hardware, now)
		}
	}

	if desired.Device.CollectInventory && m.snapshots.due(ctx, "windows_update", now) {
		if updates, err := m.collector.CollectWindowsUpdateStatus(ctx); err != nil {
			m.logger.Warn("device: collect windows update status failed", "error", err)
			m.recordCollectionFailure(ctx, "windows_update", err, now)
		} else {
			m.mu.Lock()
			m.lastWindowsUpdate = updates
			m.mu.Unlock()
			m.observeSnapshot(ctx, "windows_update", updates, now)
		}
	}

	if desired.Device.CollectInventory && m.snapshots.due(ctx, "disks", now) {
		if disks, err := m.collector.CollectDisks(ctx); err != nil {
			m.logger.Warn("device: collect disks failed", "error", err)
			m.recordCollectionFailure(ctx, "disks", err, now)
		} else {
			m.mu.Lock()
			m.lastDisks = disks
			m.mu.Unlock()
			m.observeSnapshot(ctx, "disks", disks, now)
		}
	}

	if desired.Device.CollectInventory && m.snapshots.due(ctx, "all_services", now) {
		if allSvc, err := m.collector.CollectAllServices(); err != nil {
			m.logger.Warn("device: collect all services failed", "error", err)
			m.recordCollectionFailure(ctx, "all_services", err, now)
		} else {
			m.mu.Lock()
			m.lastAllServices = allSvc
			m.mu.Unlock()
			m.observeSnapshot(ctx, "all_services", allSvc, now)
		}
	}

	return domain.ApplyResult{Module: "device", Changed: true, Message: "device snapshot collected"}
}

func (m *Module) observeSnapshot(ctx context.Context, collector string, value any, now time.Time) {
	if _, err := m.snapshots.observe(ctx, collector, value, now); err != nil {
		m.logger.Warn("device: persist collector snapshot failed", "collector", collector, "error", err)
	}
}

func (m *Module) recordCollectionFailure(ctx context.Context, collector string, err error, now time.Time) {
	if saveErr := m.snapshots.recordFailure(ctx, collector, err, now); saveErr != nil {
		m.logger.Warn("device: persist collector failure failed", "collector", collector, "error", saveErr)
	}
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
	batch := m.snapshots.nextPublishBatch(context.Background())
	m.mu.Lock()
	defer m.mu.Unlock()
	m.syncBatch = batch
	if m.lastMetrics != nil && m.inSyncBatch("metrics") {
		metrics = m.lastMetrics // objeto: collectedAt, memoryTotalMb, cpuLoadPct, ...
		rb := m.lastMetrics.RebootPending
		rebootPending = &rb
	}
	if m.lastSystem != nil && m.inSyncBatch("system") {
		system = m.lastSystem
	}
	if m.lastNetwork != nil && m.inSyncBatch("network") {
		network = m.lastNetwork
	}
	if len(m.lastSoftware) > 0 && m.inSyncBatch("software") {
		software = m.lastSoftware
	}
	if m.lastHardware != nil && m.inSyncBatch("hardware") {
		hardware = m.lastHardware
	}
	if m.lastDisks != nil && m.inSyncBatch("disks") {
		disks = m.lastDisks.Volumes // array de DiskVolume: [{letter, label, fsType, ...}]
	}
	if m.lastServices != nil && m.inSyncBatch("critical_services") {
		services = m.lastServices.Services // array de ServiceStatus: [{name, status, pid, ...}]
	}
	if m.lastVersions != nil && m.inSyncBatch("syspro_versions") {
		versions = m.lastVersions // objeto: collectedAt, installations: [...]
	}
	if m.lastWindowsUpdate != nil && m.inSyncBatch("windows_update") {
		windowsUpdate = m.lastWindowsUpdate
	}
	if m.lastAllServices != nil && m.inSyncBatch("all_services") {
		allServices = m.lastAllServices.Services // array completo de ServiceStatus
	}
	return
}

func (m *Module) MarkSyncSnapshotsPublished(ctx context.Context) {
	m.mu.Lock()
	batch := m.syncBatch
	m.syncBatch = nil
	m.mu.Unlock()
	if len(batch) == 0 {
		return
	}
	if err := m.snapshots.markPublished(ctx, batch); err != nil {
		m.logger.Warn("device: confirm published snapshots failed", "error", err)
	}
}

func (m *Module) inSyncBatch(collector string) bool {
	_, exists := m.syncBatch[collector]
	return exists
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
