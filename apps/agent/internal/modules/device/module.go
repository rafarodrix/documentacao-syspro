package device

import (
	"context"
	"strings"
	"sync"
	"time"

	"trilink/agent/internal/domain"
)

// Module e o modulo de coleta de contexto e metricas do dispositivo.
// Cadencia e enable por coletor vêm do desired-state (collection_profile / collectors).
type Module struct {
	collector  *Collector
	logger     Logger
	store      StateStore
	snapshots  *snapshotTracker
	events     *criticalEventQueue
	mu         sync.RWMutex
	collectMu  sync.Mutex
	watchOnce     sync.Once
	watchMu       sync.RWMutex
	watchServices bool
	watchEvents   bool
	trigger       func()

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
	module := &Module{
		collector: NewCollector(logger),
		logger:    logger,
		store:     store,
		snapshots: newSnapshotTracker(store),
		events:    newCriticalEventQueue(store),
	}
	module.restoreLastMetrics(context.Background())
	return module
}

func (m *Module) Name() string { return "device" }

func (m *Module) SetReconcileTrigger(trigger func()) {
	m.watchMu.Lock()
	defer m.watchMu.Unlock()
	m.trigger = trigger
}

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

	policy := resolveCollectionPolicy(desired.Device)
	m.snapshots.setScheduleResolver(policy.schedule)

	m.watchMu.Lock()
	m.watchServices = policy.enabled(collectorCriticalServices)
	m.watchEvents = policy.enabled(collectorCriticalEvents)
	m.watchMu.Unlock()
	m.watchOnce.Do(func() {
		go m.watchCriticalServices(ctx)
		go m.watchCriticalProcesses(ctx)
		go m.watchWindowsEventLog(ctx)
	})

	now := time.Now().UTC()
	var sysproSnapshot *SysproVersionSnapshot
	m.mu.RLock()
	sysproSnapshot = m.lastVersions
	m.mu.RUnlock()
	if policy.enabled(collectorSysproVersions) && (sysproSnapshot == nil || m.snapshots.due(ctx, collectorSysproVersions, now)) {
		sysproHints := toCollectorHints(desired.Device.SysproInstallationHints)
		sysproSnapshot = m.collector.CollectSysproInstallations(ctx, sysproHints)
		m.mu.Lock()
		m.lastVersions = sysproSnapshot
		m.mu.Unlock()
		m.observeSnapshot(ctx, collectorSysproVersions, sysproSnapshot, now)
	}

	if policy.enabled(collectorMetrics) && m.snapshots.due(ctx, collectorMetrics, now) {
		if metrics, err := m.collector.CollectMetrics(ctx); err != nil {
			m.logger.Warn("device: collect metrics failed", "error", err)
			m.recordCollectionFailure(ctx, collectorMetrics, err, now)
		} else {
			m.mu.Lock()
			m.lastMetrics = metrics
			m.mu.Unlock()
			m.persistLastMetrics(ctx, metrics)
			m.observeSnapshot(ctx, collectorMetrics, metrics, now)
		}
	}

	if policy.enabled(collectorCriticalServices) && m.snapshots.due(ctx, collectorCriticalServices, now) {
		if services, err := m.collector.CollectServices(sysproSnapshot); err != nil {
			m.logger.Warn("device: collect services failed", "error", err)
			m.recordCollectionFailure(ctx, collectorCriticalServices, err, now)
		} else {
			m.mu.Lock()
			m.lastServices = services
			m.mu.Unlock()
			m.observeSnapshot(ctx, collectorCriticalServices, services, now)
		}
	}

	if policy.enabled(collectorSystem) && m.snapshots.due(ctx, collectorSystem, now) {
		if system, err := m.collector.CollectSystemSnapshot(ctx); err != nil {
			m.logger.Warn("device: collect system snapshot failed", "error", err)
			m.recordCollectionFailure(ctx, collectorSystem, err, now)
		} else {
			m.mu.Lock()
			m.lastSystem = system
			m.mu.Unlock()
			m.observeSnapshot(ctx, collectorSystem, system, now)
		}
	}

	if policy.enabled(collectorNetwork) && m.snapshots.due(ctx, collectorNetwork, now) {
		if network, err := m.collector.CollectNetworkSnapshot(ctx); err != nil {
			m.logger.Warn("device: collect network snapshot failed", "error", err)
			m.recordCollectionFailure(ctx, collectorNetwork, err, now)
		} else {
			m.mu.Lock()
			m.lastNetwork = network
			m.mu.Unlock()
			m.observeSnapshot(ctx, collectorNetwork, network, now)
		}
	}

	if policy.enabled(collectorSoftware) && m.snapshots.due(ctx, collectorSoftware, now) {
		if software, err := m.collector.CollectSoftwareSnapshot(ctx); err != nil {
			m.logger.Warn("device: collect software snapshot failed", "error", err)
			m.recordCollectionFailure(ctx, collectorSoftware, err, now)
		} else {
			m.mu.Lock()
			m.lastSoftware = software
			m.mu.Unlock()
			m.observeSnapshot(ctx, collectorSoftware, software, now)
		}
	}

	if policy.enabled(collectorHardware) && m.snapshots.due(ctx, collectorHardware, now) {
		if hardware, err := m.collector.CollectHardwareIdentity(ctx); err != nil {
			m.logger.Warn("device: collect hardware identity failed", "error", err)
			m.recordCollectionFailure(ctx, collectorHardware, err, now)
		} else {
			m.mu.Lock()
			m.lastHardware = hardware
			m.mu.Unlock()
			m.observeSnapshot(ctx, collectorHardware, hardware, now)
		}
	}

	if policy.enabled(collectorWindowsUpdate) && m.snapshots.due(ctx, collectorWindowsUpdate, now) {
		if updates, err := m.collector.CollectWindowsUpdateStatus(ctx); err != nil {
			m.logger.Warn("device: collect windows update status failed", "error", err)
			m.recordCollectionFailure(ctx, collectorWindowsUpdate, err, now)
		} else {
			m.mu.Lock()
			m.lastWindowsUpdate = updates
			m.mu.Unlock()
			m.observeSnapshot(ctx, collectorWindowsUpdate, updates, now)
		}
	}

	if policy.enabled(collectorDisks) && m.snapshots.due(ctx, collectorDisks, now) {
		if disks, err := m.collector.CollectDisks(ctx); err != nil {
			m.logger.Warn("device: collect disks failed", "error", err)
			m.recordCollectionFailure(ctx, collectorDisks, err, now)
		} else {
			m.mu.Lock()
			m.lastDisks = disks
			m.mu.Unlock()
			m.observeSnapshot(ctx, collectorDisks, disks, now)
		}
	}

	if policy.enabled(collectorAllServices) && m.snapshots.due(ctx, collectorAllServices, now) {
		if allSvc, err := m.collector.CollectAllServices(); err != nil {
			m.logger.Warn("device: collect all services failed", "error", err)
			m.recordCollectionFailure(ctx, collectorAllServices, err, now)
		} else {
			m.mu.Lock()
			m.lastAllServices = allSvc
			m.mu.Unlock()
			m.observeSnapshot(ctx, collectorAllServices, allSvc, now)
		}
	}

	return domain.ApplyResult{
		Module:  "device",
		Changed: true,
		Message: "device snapshot collected profile=" + policy.profile,
	}
}

const lastMetricsSnapshotFile = "collectors/last-metrics.json"

func (m *Module) restoreLastMetrics(ctx context.Context) {
	if m.store == nil {
		return
	}

	var metrics AgentMetricsSnapshot
	if err := m.store.LoadJSON(ctx, lastMetricsSnapshotFile, &metrics); err != nil {
		return
	}
	if strings.TrimSpace(metrics.CollectedAt) == "" || metrics.MemoryTotalMB == 0 {
		return
	}
	m.lastMetrics = &metrics
}

func (m *Module) persistLastMetrics(ctx context.Context, metrics *AgentMetricsSnapshot) {
	if m.store == nil || metrics == nil {
		return
	}
	if err := m.store.SaveJSON(ctx, lastMetricsSnapshotFile, metrics); err != nil {
		m.logger.Warn("device: persist last metrics failed", "error", err)
	}
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

func (m *Module) GetCriticalEvents(ctx context.Context) []map[string]any {
	return m.events.pending(ctx)
}

func (m *Module) MarkCriticalEventsPublished(ctx context.Context) {
	if err := m.events.markPublished(ctx); err != nil {
		m.logger.Warn("device: confirm published critical events failed", "error", err)
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
